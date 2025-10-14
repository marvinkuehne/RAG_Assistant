import os

from fastapi import FastAPI, File, UploadFile, Form
import uvicorn
import mimetypes

from starlette.middleware.cors import CORSMiddleware

from backend.Loader import load_documents, split_documents, get_embedding, create_ids, add_to_chroma, get_user_chroma_dir, get_vectorstore
from backend.db.chat_db import create_session, get_sessions, save_session, load_session, conn
from backend.services.chroma_service import update_category
from backend.query_data import query_rag
from pydantic import BaseModel
from typing import List, Optional

# Upload folder for upload_files request
UploadFolder = "uploads"
if not os.path.exists(UploadFolder):
    os.makedirs(UploadFolder)

app = FastAPI()

# Progress tracking for each user
progress_store = {}

# allowed origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://lambent-tapioca-db599c.netlify.app",
    "https://rag-assistant-frontend.netlify.app",
]

# Block unauthorized requrests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Tells where to extract the query string from the json object received from the frontend
class Question(BaseModel):
    query: str
    categories: Optional[List[str]] = None


class FileItem(BaseModel):
    filename: str
    category: str | None


class FileList(BaseModel):
    user_id: str
    files: List[FileItem]


class CategoryUpdate(BaseModel):
    user_id: str
    filename: str
    category: str | None  # None= allow to delete category


class AskPayload(BaseModel):
    user_id: str
    query: str
    categories: Optional[List[str]] = None


# ask LLM
@app.post("/ask")
async def askForm(
        payload: AskPayload):  # Fastapi gets question Json object from frontend and changes it into Question-Object (see above)
    print("👉 Query:", payload.query)
    print("👉 Categories:", payload.categories)
    answer, sources = query_rag(payload.query, payload.user_id, payload.categories)
    return [answer, sources]


@app.post("/upload_files")
async def uploadFiles(file: UploadFile = File(...),
                      user_id: str = Form(...)):  # receive formdata object and read parameter "file" and "category"
    content = await file.read()  # read content as bytes

    # Create user sub folder (when non-existant)
    user_folder = os.path.join(UploadFolder, user_id)
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)

    # Save file in this subfolder
    uploaded_file_path = os.path.join(user_folder, file.filename)
    with open(uploaded_file_path, "wb") as f:
        f.write(content)

    return {
        "user_id": user_id,
        "filename": file.filename,
        "size": len(content),
        "path": uploaded_file_path
    }


@app.get("/get_user_files/{user_id}")
async def get_user_files(user_id: str):
    vs = get_vectorstore(user_id)
    print("get_user_files → dir:", get_user_chroma_dir(user_id), "count:", vs._collection.count())

    out = []

    user_folder = os.path.join(UploadFolder, user_id)
    if not os.path.exists(user_folder):
        return {"files": []}  # no uploads for this user yet

    for file in os.listdir(user_folder):
        full_path = os.path.join(user_folder, file)
        size = os.path.getsize(full_path)
        ctype = mimetypes.guess_type(full_path)[0] or "unknown"
        cat = _get_category_for_file(vs, file)
        out.append({
            "user_id": user_id,
            "filename": file,
            "size": size,
            "content_type": ctype,
            "category": cat,  # can be None
        })
    return {"files": out}


@app.delete("/delete_user_file/{user_id}/{filename}")
async def delete_File(user_id: str, filename: str):
    # remove file from userfolder
    user_folder = os.path.join(UploadFolder, user_id)
    path_file_delete = os.path.join(user_folder, filename)
    try:
        os.remove(path_file_delete)
    except FileNotFoundError:
        pass

    # delete files vectors
    vs = get_vectorstore(user_id)
    try:
        vs._collection.delete(where={"source": {"$contains": filename}})
        vs._client.persist()
    except Exception as e:
        print("vector delete warning:", e)

    return {"ok": True, "deleted_file": filename, "user_id": user_id}


@app.post("/update_category")
async def update_file_category(update: CategoryUpdate):
    vectorstore = get_vectorstore(update.user_id)
    return update_category(vectorstore, update.filename, update.category)


@app.post("/process_files")
async def processFiles(files: FileList):
    user_folder = os.path.join(UploadFolder, files.user_id)
    file_paths = [os.path.join(user_folder, f.filename) for f in files.files]  # store files from uploadfolder

    # 0% – Start
    progress_store[files.user_id] = 0

    # call loader
    docs = load_documents(file_paths)
    progress_store[files.user_id] = 10

    chunks = split_documents(docs)
    progress_store[files.user_id] = 25

    embeddings = get_embedding()
    progress_store[files.user_id] = 40


    # normalize source to just the filename; DO NOT set category
    total = len(chunks)
    for i, chunk in enumerate(chunks):
        # keep only the base filename in metadata
        src = chunk.metadata.get("source") or ""
        chunk.metadata["source"] = os.path.basename(src)
        chunk.metadata["user_id"] = files.user_id

        # alle paar Schritte Fortschritt erhöhen
        if total > 0 and i % max(1, total // 20) == 0:
            progress_store[files.user_id] = 40 + int((i / total) * 50)

    ids = create_ids(chunks)
    add_to_chroma(embeddings, chunks, files.user_id)  # chunk contains metadata (source, user_id)
    progress_store[files.user_id] = 100  # Fertig


    return {"processed_files": [f.filename for f in files.files]}




@app.get("/progress/{user_id}")
async def get_progress(user_id: str):
    """Frontend polls this endpoint to know current progress"""
    progress = progress_store.get(user_id, 0)
    return {"progress": progress}

# @app.get("/get_category/{user_id}")
# async def get_category(user_id: str):
#     vectorstore = get_vectorstore(user_id)
#     result = vectorstore.get(include=["metadatas"])
#     metas = result.get("metadatas") or []
#     if metas and isinstance(metas[0], list):
#         metas = [m for sub in metas for m in sub]
#
#     cats = []
#     for m in metas:
#         if not m:
#             continue
#         cat = (m.get("category") or "").strip()
#         if cat and cat not in cats:
#             cats.append(cat)
#     return {"categories": cats}


# categories for newChat category list
@app.get("/get_category/{user_id}")
async def get_category(user_id: str):
    vectorstore = get_vectorstore(user_id)
    result = vectorstore.get(include=["metadatas"])
    metas = result.get("metadatas", [])  # gives also id etc.!!

    if metas and isinstance(metas[0], list):
        metas = [m for sub in metas for m in sub]

    # Gather all categories from metadata
    cats = []
    for meta in metas:
        if not meta:
            continue
        cat = (meta.get("category") or "").strip()
        if cat and cat not in cats:
            cats.append(cat)

    return {"categories": cats}




# def _get_category_for_file(vs, filename: str) -> str | None:
#     # exakt matchen mit $eq
#     res = vs.get(where={"source": {"$eq": filename}}, include=["metadatas"])
#     metas = res.get("metadatas") or []
#     if metas and isinstance(metas[0], list):
#         metas = [m for sub in metas for m in sub]
#
#     for m in metas:
#         if not m:
#             continue
#         cat = m.get("category")
#         if cat not in (None, "", "Uncategorized"):
#             return cat
#
#     # Fallback: kompletter Scan (falls ältere Einträge abweichen)
#     all_meta = vs.get(include=["metadatas"])
#     all_metas = all_meta.get("metadatas") or []
#     if all_metas and isinstance(all_metas[0], list):
#         all_metas = [m for sub in all_metas for m in sub]
#     for m in all_metas:
#         if (m or {}).get("source") == filename:
#             cat = (m or {}).get("category")
#             if cat not in (None, "", "Uncategorized"):
#                 return cat
#     return None

def _get_category_for_file(vs, filename: str) -> str | None:
    res = vs.get(where={"source": {"$eq": filename}}, include=["metadatas"])
    metas = res.get("metadatas") or []
    if metas and isinstance(metas[0], list):
        metas = [m for sub in metas for m in sub]
    for m in metas:
        if not m:
            continue
        cat = m.get("category")
        if cat not in (None, "", "Uncategorized"):
            return cat
    return None

    # If we found something by exact match
    for meta in metas:
        if not meta:
            continue
        cat = meta.get("category")
        if cat not in (None, "", "Uncategorized"):
            return cat
    return None


# 🧩 Neue Chat-Session erstellen
@app.post("/create_session")
async def create_session_route(data: dict):
    user_id = data.get("user_id")
    title = data.get("title", "New Chat")
    session_id = create_session(user_id, title)
    return {"session_id": session_id, "title": title}


# 📋 Alle Sessions eines Users abrufen
@app.get("/get_sessions/{user_id}")
async def get_sessions_route(user_id: str):
    return get_sessions(user_id)


# 💾 Spezifische Session speichern
@app.post("/save_session")
async def save_session_route(data: dict):
    session_id = data.get("session_id")
    messages = data.get("messages", [])
    save_session(session_id, messages)
    return {"status": "saved"}


# 📤 Spezifische Session laden
@app.get("/get_session/{session_id}")
async def get_session_route(session_id: str):
    return load_session(session_id)


@app.delete("/delete_session/{session_id}")
def delete_session(session_id: str):
    """
    Delete a specific chat session by session_id.
    """
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    return {"message": f"Session {session_id} deleted successfully"}


# @app.delete("/cleanup_all_categories/{user_id}")
# async def cleanup_all_categories(user_id: str):
#     try:
#         vs = get_vectorstore(user_id)
#         res = vs.get(include=["metadatas"])
#         ids = res.get("ids", [])
#         metas = res.get("metadatas", [])
#
#         if not ids or not metas:
#             return {"ok": True, "updated": 0, "message": "No entries found"}
#
#         # clear category field for all documents
#         for m in metas:
#             if isinstance(m, dict):
#                 m["category"] = None
#
#         # ✅ update without manual persist (Chroma auto-saves)
#         collection = vs._collection
#         collection.update(ids=ids, metadatas=metas)
#
#         return {
#             "ok": True,
#             "updated": len(ids),
#             "message": f"All categories cleared ({len(ids)} entries)"
#         }
#
#     except Exception as e:
#         print("Error while cleaning categories:", e)
#         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("router:app", host="127.0.0.1", port=8000, reload=True)

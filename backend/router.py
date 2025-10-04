import os

from fastapi import FastAPI, File, UploadFile
import uvicorn
import mimetypes
from starlette.middleware.cors import CORSMiddleware

from backend.Loader import load_documents, split_documents, get_embedding, create_ids, add_to_chroma
from backend.services.chroma_service import update_category
from query_data import query_rag
from pydantic import BaseModel
from backend.Loader import get_vectorstore
from typing import List, Optional

# Upload folder for upload_files request
UploadFolder = "uploads"
if not os.path.exists(UploadFolder):
    os.makedirs(UploadFolder)

app = FastAPI()

# allowed origins
origins = [
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:8000",
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
    files: List[FileItem]


class CategoryUpdate(BaseModel):
    filename: str
    category: str | None  # None= allow to delete category


@app.get("/")
async def root():
    return {"message": "Hello World"}


# ask LLM
@app.post("/ask")
async def askForm(
        question: Question):  # Fastapi gets question Json object from frontend and changes it into Question-Object (see above)
    categories: question.categories
    query = question.query  # retrieve the attribute "query" of Question-Object
    print("👉 Query:", question.query)
    print("👉 Categories:", question.categories)
    answer = query_rag(query, categories)
    return answer


@app.post("/upload_files")
async def uploadFiles(file: UploadFile = File(...)):  # receive formdata object and read parameter "file" and "category"
    content = await file.read()  # read content as bytes
    uploaded_file_path = os.path.join(UploadFolder, file.filename)  # create path
    with open(uploaded_file_path,
              "wb") as f:  # open path in modus "wb" (write bytes) --> wb demands bytes (e.g. files, etc.
        f.write(content)  # save

    return {"filename": file.filename, "size": len(content), "content_type": file.content_type}


@app.post("/update_category")
async def update_file_category(update: CategoryUpdate):
    vectorstore = get_vectorstore()
    return update_category(vectorstore, update.filename, update.category)


# categories for newChat category list
@app.get("/get_category")
async def get_category():
    vectorstore = get_vectorstore()
    result = vectorstore.get(include=["metadatas"])  # gives also id etc.!!

    # Gather all categories from metadata
    categories = []

    for meta in result["metadatas"]:  # filter metadatas from results
        category = meta.get("category")
        if (category != "uncategorized" and category != categories[category]):
            categories.append(category)
    return {"categories": categories}

#Categories for FileList Table category per file
# @app.get("/file_categories")
# async def file_categories():
#     vs = get_vectorstore()
#     res = vs.get(include=["metadatas"])
#     by_file: dict[str, str] = {}
#
#     for meta in res["metadatas"]:
#         fname = os.path.basename((meta.get("source") or "").strip())
#         if not fname:
#             continue
#         cat = meta.get("category") or "Uncategorized"
#         #
#         by_file[fname] = cat
#
#     return {"by_file": by_file}

@app.post("/process_files")
async def processFiles(files: FileList):
    file_paths = [os.path.join(UploadFolder, f.filename) for f in files.files]  # store files from uploadfolder

    # call loader
    docs = load_documents(file_paths)
    chunks = split_documents(docs)
    embeddings = get_embedding()

    # Add Uncategorized category to each file
    for chunk in chunks:
        chunk.metadata["category"] = "Uncategorized"

    ids = create_ids(chunks)
    add_to_chroma(embeddings, chunks, ids)

    return {"processed_files": [f.filename for f in files.files]}


# show client all saved files in UploadFolder on server
@app.get("/files")
async def showFiles():
    metadataFiles = []
    for file in os.listdir(UploadFolder):
        full_path = os.path.join(UploadFolder, file)
        size = os.path.getsize(full_path)
        ctype = mimetypes.guess_type(full_path)[0] or "unknown"
        metadataFiles.append({
            "filename": file,
            "size": size,
            "content_type": ctype
        })
    return {"files": metadataFiles}


@app.delete("/files/{filename}")
async def deleteFile(filename: str):
    path_file_delete = os.path.join(UploadFolder, filename)
    try:
        os.remove(path_file_delete)
        print(f"File '{path_file_delete}' deleted successfully.")
    except FileNotFoundError:
        (
            print(f"File '{path_file_delete}' not found."))


if __name__ == "__main__":
    uvicorn.run("router:app", host="127.0.0.1", port=8000, reload=True)

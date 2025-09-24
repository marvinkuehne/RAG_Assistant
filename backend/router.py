import os
from fastapi import FastAPI, File, UploadFile
import uvicorn
import mimetypes
from starlette.middleware.cors import CORSMiddleware

from query_data import query_rag
from pydantic import BaseModel

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


@app.get("/")
async def root():
    return {"message": "Hello World"}


# ask LLM
@app.post("/ask")
async def askForm(
        question: Question):  # Fastapi gets question Json object from frontend and changes it into Question-Object (see above)
    query = question.query  # retrieve the attribute "query" of Question-Object
    answer = query_rag(query)
    return answer


@app.post("/upload_files")
async def uploadFiles(file: UploadFile = File(...)):  # receive file object named "file"
    content = await file.read()  # read content as bytes
    uploaded_file_path = os.path.join(UploadFolder, file.filename)  # create path
    with open(uploaded_file_path,
              "wb") as f:  # open path in modus "wb" (write bytes) --> wb demands bytes (e.g. files, etc.
        f.write(content)  # save
    return {"filename": file.filename, "size": len(content), "content_type": file.content_type}


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
    path_file_delete = os.path.join(UploadFolder,filename)
    try:
        os.remove(path_file_delete)
        print(f"File '{path_file_delete}' deleted successfully.")
    except FileNotFoundError: (
        print(f"File '{path_file_delete}' not found."))












if __name__ == "__main__":
    uvicorn.run("router:app", host="127.0.0.1", port=8000, reload=True)

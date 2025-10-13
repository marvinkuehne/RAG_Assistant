import os
from dotenv import load_dotenv

from langchain_community.document_loaders import (
    PyMuPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
)
from langchain_chroma import Chroma

from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai.embeddings import OpenAIEmbeddings

import os

print("CWD      :", os.getcwd())
print("FILE DIR :", os.path.dirname(__file__))

#Define db path
BASE_DIR = os.path.dirname(__file__)                 # …/backend
PERSIST_DIR = os.path.join(BASE_DIR, "db", "chroma")

def get_user_chroma_dir(user_id: str):
    return os.path.join(BASE_DIR, "db", "users", user_id, "chroma")
COLLECTION  = "rag-chroma"

# load variables from .env
load_dotenv()
# get the key
openai_api_key = os.getenv("OPENAI_API_KEY")


def load_documents(file_paths: list[str]):
    docs = []
    for file_path in file_paths:
        filename = os.path.basename(file_path)
        print(filename)
        if filename.endswith("pdf"):
            loader = PyMuPDFLoader(file_path)
        elif filename.lower().endswith(".txt"):
            loader = TextLoader(file_path)
        elif filename.lower().endswith((".doc", ".docx")):
            loader = UnstructuredWordDocumentLoader(file_path)
        elif filename.lower().endswith((".ppt", ".pptx")):
            loader = UnstructuredPowerPointLoader(file_path)
        elif filename.lower().endswith((".xls", ".xlsx")):
            loader = UnstructuredExcelLoader(file_path)
        else:
            print(f"Skipping unsupported file: {file_path}")
            continue

        pages = loader.load()
        docs.extend(pages)
    return docs


# Chunking: Semantic
def split_documents(docs):
    openai = OpenAIEmbeddings(
        openai_api_key=openai_api_key)

    splitter = SemanticChunker(
        openai, breakpoint_threshold_type="percentile"
    )
    chunks = splitter.split_documents(docs)

    return chunks


def get_embedding():
    embeddings = OpenAIEmbeddings(
        model="text-embedding-ada-002",
        # With the `text-embedding-3` class
        # of models, you can specify the size
        # of the embeddings you want returned.
        # dimensions=1024
        openai_api_key=openai_api_key
        # shift later to external env file!!!!

    )
    return embeddings


def create_ids(chunks):
    ids = []
    prev_filename = None
    id_counter = 0

    for chunk in chunks:
        filename = os.path.basename(chunk.metadata.get("source","unknown"))  # get last component of path (stored in chunk source)/ "unknown" fallback string as f expects string
        page = chunk.metadata.get("page", 0)
        chunk.metadata["source"] = filename

        if filename != prev_filename:
            prev_filename = filename
            id_counter = 0

        chunk_id = f"{prev_filename}:{page}:{id_counter}"
        ids.append((chunk_id))
        id_counter += 1
        chunk.metadata["id"] = chunk_id  # add id field to chunk metadata and store chunk_id in there to provide option to have access on chunk id later
    return ids


def add_to_chroma(embeddings, chunks, user_id: str):
    #create user specific chroma DB
    persist_dir = get_user_chroma_dir(user_id)
    os.makedirs(persist_dir, exist_ok=True)
    # open DB
    vectorstore = Chroma(  # from_documents = Add/Upsert!
        embedding_function=embeddings,
        persist_directory=persist_dir,
        collection_name=COLLECTION,
    )

    # check duplicates
    existing_ids_list = vectorstore.get(include=[])  # extract ids via include[]
    existing_ids_hashset = set(
        existing_ids_list["ids"])  # convert existing_ids_list into hashset for quicker search wihtin DB

    new_chunks = []
    new_chunk_ids = []

    for chunk in chunks:
        chunk_id = chunk.metadata["id"]  # retrieve id field in metadata

        if chunk_id not in existing_ids_hashset:
            new_chunks.append(chunk)  # store unique chunk in new_chunks list
            new_chunk_ids.append(chunk_id)

    if new_chunks:
        print(f"👉 Adding new documents: {len(new_chunks)}")

        # Create slot "chunks" and "ids" in vectorstore and add only chunks with new ids
        vectorstore.add_documents(documents=new_chunks, ids=new_chunk_ids)
    else:
        print("No new chunks to add.")

    print("chroma count:", vectorstore._collection.count())
    # print("IDS: ", vectorstore._collection.get())

    return vectorstore

#For changing categories in chroma
def get_vectorstore(user_id: str | None = None):
    embeddings = get_embedding()

    # Benutzer-spezifische Chroma DB öffnen
    if user_id:
        persist_dir = get_user_chroma_dir(user_id)
    else:
        persist_dir = PERSIST_DIR  # global fallback

    vectorstore = Chroma(
        embedding_function=embeddings,
        persist_directory=persist_dir,
        collection_name=COLLECTION,
    )
    return vectorstore


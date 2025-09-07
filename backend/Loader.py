import os
from dotenv import load_dotenv


from PIL.features import version_codec
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
from overrides.typing_utils import unknown

# load variables from .env
load_dotenv()
# get the key
openai_api_key = os.getenv("OPENAI_API_KEY")



def load_documents():
    docs = []
    folder_path = "/backend/data"

    for current, foldernames, filenames in os.walk(folder_path):
        for filename in filenames:
            print(filename)
            file_path = os.path.join(current,
                                     filename)  # joins --> current = "e.g. /Users/marvinkuhne/SW_Projects/Learn_RAG/data" + "lebenslauf.pdf"
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
        filename = os.path.basename(chunk.metadata.get("source", "unknown"))  # get last component of path (stored in chunk source)/ "unknown" fallback string as f expects string
        page = chunk.metadata.get("page", 0)

        if filename != prev_filename:
            prev_filename = filename
            id_counter = 0

        chunk_id = f"{prev_filename}:{page}:{id_counter}"
        ids.append((chunk_id))
        id_counter += 1
        chunk.metadata["id"] = chunk_id # add id field to chunk metadata and store chunk_id in there to provide option to have access on chunk id later

    return ids


def add_to_chroma(embeddings, chunks, ids):

    # open DB
    vectorstore = Chroma(  # from_documents = Add/Upsert!
        embedding_function=embeddings,
        persist_directory="db/chroma",
        collection_name="rag-chroma",
    )

    # check duplicates
    existing_ids_list = vectorstore.get(include=[])  # extract ids via include[]
    existing_ids_hashset = set(existing_ids_list["ids"])  # convert existing_ids_list into hashset for quicker search wihtin DB

    new_chunks = []
    new_chunk_ids = []

    for chunk in chunks:
        chunk_id = chunk.metadata["id"]# retrieve id field in metadata

        if chunk_id not in existing_ids_hashset:
            new_chunks.append(chunk) #store unique chunk in new_chunks list
            new_chunk_ids.append(chunk_id)

    if new_chunks:
        print(f"👉 Adding new documents: {len(new_chunks)}")

        #Create slot "chunks" and "ids" in vectorstore and add only chunks with new ids
        vectorstore.add_documents(documents=new_chunks, ids=new_chunk_ids)
    else:
        print("No new chunks to add.")



    print("chroma count:", vectorstore._collection.count())
    # print("IDS: ", vectorstore._collection.get())

    return vectorstore


# Main
if __name__ == "__main__":
    docs = load_documents()
    chunks = split_documents(docs)
    embeddings = get_embedding()
    ids = create_ids(chunks)
    vectorstore = add_to_chroma(embeddings, chunks, ids)

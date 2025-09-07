import os
from langchain_community.vectorstores import Chroma
from overrides.typing_utils import unknown
from langchain_ollama import ChatOllama
from Loader import  get_embedding

def query_rag(query):

    # open database
    db = Chroma(
        persist_directory="db/chroma", # use db already stored here
        collection_name="rag-chroma", # give it same name
        embedding_function=get_embedding(), # give chroma embedding object so that it can in similiarity search apply it on the query
    )

    # Retrieve top k chunks
    results = db.similarity_search_with_score(query, k=3)  # returns list: list[tuple[Document, float]] → (doc, score).

    # Collect Context + Sources
    content_list = []
    sources = []
    for doc, score in results: # loop trough tuples (doc, score) of list
        chunk_content = doc.page_content
        content_list.append(chunk_content)
        src = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        sources.append(f"{src}:p{page}")

    context = "\n\n---\n\n".join(content_list)  # translate content_list in string to pass it to LLM

    # LLM
    llm = ChatOllama(
        model="llama3.2:latest",
        # other params ...
    )
    prompt= f"Answer the question based on the following context:\n{context}\n\nQuestion: {query}\n\nAnswer:"
    answer = llm.invoke(prompt).content # invoke provides message object from which we want to retrieve only the content

    return answer, sources

# Main
query = "What did marvin work for in 2024?"

answer, src = query_rag(query)
print(answer)
print(src)
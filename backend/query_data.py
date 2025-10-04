import os
from langchain_community.vectorstores import Chroma
from langchain_ollama import ChatOllama
from Loader import get_embedding, PERSIST_DIR, COLLECTION

def query_rag(query: str, categories: list[str] | None = None):
    # 1) DB öffnen – gleicher Pfad wie Indexing
    db = Chroma(
        persist_directory=PERSIST_DIR,
        collection_name=COLLECTION,
        embedding_function=get_embedding(),
    )

    # 2) Filter bauen + LOGGEN
    filter_dict = {"category": {"$in": categories}} if categories else None
    print("RAG DEBUG → FILTER_USED:", filter_dict)

    # 3) Suche + Treffer loggen
    results = db.similarity_search_with_score(query, k=7, filter=filter_dict)
    print("RAG DEBUG → NUM_RESULTS:", len(results))

    content_list: list[str] = []
    sources: list[str] = []

    for i, (doc, score) in enumerate(results, start=1):
        chunk_content = doc.page_content
        content_list.append(chunk_content)

        src = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        cat = doc.metadata.get("category")  # <-- hier holen

        sources.append(f"{src}:p{page}")
        print(f"RAG DEBUG [{i}] src={src} p={page} cat={cat} score={score:.4f}")

    context = "\n\n---\n\n".join(content_list)

    # 4) LLM
    llm = ChatOllama(model="llama3.2:latest")
    prompt = (
        f"Answer the question based on the following context:\n{context}\n\n"
        f"Question: {query}\n\nAnswer:"
    )
    answer = llm.invoke(prompt).content

    return answer, sources
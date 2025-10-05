import os
from langchain_community.vectorstores import Chroma
from Loader import get_embedding, PERSIST_DIR, COLLECTION
from openai import OpenAI
from dotenv import load_dotenv

# .env laden
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")


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
    results = db.similarity_search_with_score(query, k=4, filter=filter_dict)
    print("RAG DEBUG → NUM_RESULTS:", len(results))

    content_list: list[str] = []
    sources: list[str] = []

    for i, (doc, score) in enumerate(results, start=1):
        content_list.append(doc.page_content)
        src = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        cat = doc.metadata.get("category")
        sources.append(f"{src}:p{page}")
        print(f"RAG DEBUG [{i}] src={src} p={page} cat={cat} score={score:.4f}")

    context = "\n\n---\n\n".join(content_list)
    sources_md = "\n".join(f"- {s}" for s in sources) or "- (no sources from context)"

    # 4) LLM

    # Kein f-String! Hier gehört KEIN {context}/{query} hinein.
    STRUCTURE_GUIDE = """
     You are a helpful assistant. Answer **only** using the CONTEXT below.

     ### FORMAT (IMPORTANT)
     - Output must be **Markdown**.
     - Prefer sections and lists:
       ## TL;DR
       ## Steps
       ## Details
     - Use bullet points and short paragraphs.
     - **Do NOT include a 'Sources' section** in the body. The app renders sources separately.
     - No code fences unless you show real code.
     """

    client = OpenAI(api_key=openai_api_key)

    # Kontext/Frage nur EINMAL anhängen. Keine Citations hier,
    # weil die UI die Quellen separat rendert.
    prompt = f"""{STRUCTURE_GUIDE}

     ### CONTEXT
     {context}

     ### QUESTION
     {query}
     """

    response = client.responses.create(model="gpt-5-nano", input=prompt)
    answer = response.output_text
    return answer, sources

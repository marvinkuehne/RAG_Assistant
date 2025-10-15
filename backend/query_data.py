import os
from Loader import get_vectorstore
from openai import OpenAI
from dotenv import load_dotenv

# .env laden
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")


import logging
logger = logging.getLogger("rag")

def query_rag(query: str, user_id: str, categories: list[str] | None):
    db = get_vectorstore(user_id)
    cats = [c.strip() for c in (categories or []) if c and c.strip()]
    filt = {"category": {"$in": cats}} if cats else None
    logger.info("Filter for query: %s", filt)

    # 🟢 Optionaler Debug-Precheck:
    if filt:
        try:
            pre = db._collection.get(where=filt, include=["metadatas"])  # kein "ids" mehr!
            ids = pre.get("ids") or []
            metas = pre.get("metadatas") or []
            logger.info(f"Precheck matched {len(ids)} ids. Sample meta: {metas[:1]}")
        except Exception as e:
            logger.exception("Precheck (collection.get) failed")

    # 🟢 Danach deine normale Abfrage
    try:
        results = db.similarity_search_with_score(query, k=4, filter=filt)
        note = ""
    except Exception as e:
        logger.exception("similarity_search_with_score failed -> running fallback w/o filter")
        results = db.similarity_search_with_score(query, k=4)
        note = f"filter failed: {e}"

    content_list, sources = [], []
    for i, (doc, score) in enumerate(results, start=1):
        src = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        cat = doc.metadata.get("category")
        content_list.append(doc.page_content)
        sources.append(f"{src}:p{page}")
        print(f"RAG DEBUG [{i}] src={src} p={page} cat={cat} score={score:.4f}")

    context = "\n\n---\n\n".join(content_list)
    client = OpenAI(api_key=openai_api_key)
    prompt = f"""
    You are a helpful assistant. Answer only using the context.

    CONTEXT:
    {context}

    QUESTION:
    {query}
    """
    response = client.responses.create(model="gpt-5-nano", input=prompt)
    answer = response.output_text
    return answer, sources

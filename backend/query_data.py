import os
from backend.loader import get_vectorstore
from openai import OpenAI
from dotenv import load_dotenv

# .env laden
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")


def query_rag(query: str, user_id: str, categories: list[str] | None):

    #1 Filter
    db = get_vectorstore(user_id)
    cats = [c.strip() for c in (categories or []) if c and c.strip()]
    filt = {"category": {"$in": cats}} if cats else None


    # 2 Query
    try:
        results = db.similarity_search_with_score(query, k=4, filter=filt)
        note = ""
    except Exception as e:
        results = db.similarity_search_with_score(query, k=4)
        note = f"filter failed: {e}"
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

    # # helper markdown response
    # def format_markdown_response(text: str) -> str:
    #     """Replace section headers with real Markdown formatting."""
    #     formatted = text
    #
    #     # Ersetze bekannte Abschnittstitel durch Markdown-Überschriften
    #     formatted = formatted.replace("TL;DR", "## TL;DR")
    #     formatted = formatted.replace("Steps", "\n\n---\n\n## Steps")
    #     formatted = formatted.replace("Details", "\n\n---\n\n## Details")
    #     formatted = formatted.replace("Sources", "\n\n---\n\n## Sources")
    #
    #     # Falls das Modell zu viele Leerzeichen produziert
    #     formatted = "\n".join(line.strip() for line in formatted.splitlines())
    #     return formatted

    # 4) LLM
    STRUCTURE_GUIDE = """
    You are a helpful assistant. Answer **only** using the CONTEXT below.

    ### FORMAT
    - Output **must be valid Markdown**.
    - Use sections:
      ## Summary
    - Write clean Markdown syntax: headings, bullet lists, paragraphs.
    - Do not output JSON or pseudo-structure.
    """

    client = OpenAI(api_key=openai_api_key)
    prompt = f"""{STRUCTURE_GUIDE}

     ### CONTEXT
     {context}

     ### QUESTION
     {query}
     """

    response = client.responses.create(model="gpt-5-nano", input=prompt)
    answer = response.output_text

    return answer, sources

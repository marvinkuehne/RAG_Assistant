import os
from Loader import get_vectorstore
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

def query_rag(query: str, user_id: str, categories: list[str] | None):
    print(">>> RUNNING query_rag (enhanced) <<<")

    db = get_vectorstore(user_id)
    cats = [c.strip() for c in (categories or []) if c and c.strip()]
    filt = {"category": {"$in": cats}} if cats else None

    try:
        results = db.similarity_search_with_score(query, k=6, filter=filt)
    except Exception as e:
        results = db.similarity_search_with_score(query, k=6)
        print("⚠️ Filter failed:", e)

    context_parts = []
    sources = []
    for i, (doc, score) in enumerate(results, start=1):
        src = os.path.basename(doc.metadata.get("source", "unknown"))
        page = doc.metadata.get("page", 0)
        content = doc.page_content.strip()
        context_parts.append(f"[{i}] From {src} (page {page}):\n{content}")
        sources.append(f"{src}:p{page}")
        print(f"RAG DEBUG [{i}] {src}:p{page} score={score:.4f}")

    context = "\n\n---\n\n".join(context_parts)
    if len(context) > 12000:
        context = context[:12000]

    STRUCTURE_GUIDE = """
You are a knowledgeable and concise assistant that uses only the provided CONTEXT to answer questions.

### OBJECTIVE
Give the user a direct, natural answer — similar to ChatGPT — using only the information available in the context. 
Be confident when the answer is clear, and say when the context lacks enough information.

### STYLE
- Write in full sentences, conversational and human-like.
- Prefer short paragraphs and bullet points when helpful.
- Never add section headers like "Summary" or "Context".
- Do not restate the question.
- Never mention the word "context" or "documents".

### BEHAVIOR
If the context clearly contains the answer:
→ Answer naturally, as if explaining it.
If the context is incomplete:
→ Acknowledge uncertainty briefly, then answer as far as possible.
"""

    client = OpenAI(api_key=openai_api_key)
    prompt = f"""{STRUCTURE_GUIDE}

### CONTEXT
{context}

### QUESTION
{query}
"""

    response = client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
        max_output_tokens=600,
    )

    return response.output_text, sources
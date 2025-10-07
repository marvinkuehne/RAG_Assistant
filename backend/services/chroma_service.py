import os

def update_category(vectorstore, filename: str, new_category: str | None):
    results = vectorstore.get(where={"source": {"$eq": filename}})
    ids = results.get("ids", []) or []
    if not ids:
        return {"status": "error", "message": f"No chunks found for {filename}"}

    # None = clear the category
    meta_val = {"category": new_category, "source": os.path.basename(filename)}

    vectorstore._collection.update(
        ids=ids,
        metadatas=[meta_val] * len(ids),
    )
    try:
        vectorstore._client.persist()
    except Exception as e:
        print("persist warning:", e)

    return {"status": "success", "updated": len(ids), "filename": filename, "new_category": new_category}

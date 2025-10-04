def update_category(vectorstore, filename: str, new_category: str | None):
    # 1) Betroffene Chunks holen
    results = vectorstore.get(where={"source": filename})
    ids = results.get("ids", []) or []
    if not ids:
        return {"status": "error", "message": f"No chunks found for {filename}"}

    # 2) Null/Leeren-Wert robust behandeln -> auf "Uncategorized" setzen
    cat = new_category or "Uncategorized"

    # 3) Metadaten-Update über die unterliegende Chroma-Collection
    vectorstore._collection.update(
        ids=ids,
        metadatas=[{"category": cat}] * len(ids),  # gleiche Länge wie ids
    )

    # 4) Auf Platte persistieren: über den Client, nicht den Wrapper
    try:
        vectorstore._client.persist()
    except Exception as e:
        # kein harter Fehler – nur zur Diagnose
        print("persist warning:", e)

    return {
        "status": "success",
        "updated": len(ids),
        "filename": filename,
        "new_category": cat,
    }
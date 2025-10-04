def update_category(vectorstore, filename: str, new_category: str | None):
    # alle Chunks, die von diesem File kommen
    results = vectorstore.get(where={"source": filename})

    if not results["ids"]:
        return {"status": "error", "message": f"No chunks found for {filename}"}

    # Update category in metadata
    for i, chunk_id in enumerate(results["ids"]):
        vectorstore.update(
            ids=[chunk_id],
            metadatas=[{"category": new_category} for _ in results["ids"]],
        )

    #Persist changes to disk
    vectorstore.persist()

    return {
        "status": "success",
        "updated": len(results["ids"]),
        "filename": filename,
        "new_category": new_category
    }


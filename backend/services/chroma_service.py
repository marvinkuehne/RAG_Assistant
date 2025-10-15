# # services/chroma_service.py
# import os
#
# def update_category(vectorstore, filename: str, new_category: str | None):
#     fname = os.path.basename(filename)
#
#     # 1) IDs holen – include=[] (nie "ids" in include angeben)
#     res = vectorstore.get(where={"source": {"$eq": fname}}, include=[])
#     ids = res.get("ids") or []
#     if ids and isinstance(ids[0], list):  # flatten
#         ids = [i for sub in ids for i in sub]
#
#     # Fallback: alles scannen
#     if not ids:
#         all_res = vectorstore.get(include=["metadatas"])
#         all_ids = all_res.get("ids") or []
#         metas = all_res.get("metadatas") or []
#         if metas and isinstance(metas[0], list):
#             metas = [m for sub in metas for m in sub]
#             all_ids = [i for sub in all_ids for i in sub]
#         ids = [i for i, m in zip(all_ids, metas) if (m or {}).get("source", "") == fname]
#
#     if not ids:
#         return {"status": "error", "message": f"No chunks found for {fname}"}
#
#     # 2) Update
#     meta_val = {"category": (new_category or ""), "source": fname}
#     vectorstore._collection.update(ids=ids, metadatas=[meta_val] * len(ids))
#     try:
#         vectorstore._client.persist()
#     except Exception as e:
#         print("persist warning:", e)
#
#     # 3) Mini-Check: ist Kategorie jetzt drin?
#     check = vectorstore.get(where={"source": {"$eq": fname}}, include=["metadatas"])
#     metas = check.get("metadatas") or []
#     if metas and isinstance(metas[0], list):
#         metas = [m for sub in metas for m in sub]
#     applied = any((m or {}).get("category") == (new_category or "") for m in metas)
#
#     return {
#         "status": "success" if applied else "warning",
#         "updated": len(ids),
#         "filename": fname,
#         "new_category": new_category,
#         "verified": applied,
#     }

import os

def update_category(vectorstore, filename: str, new_category: str | None):
    fname = os.path.basename(filename)

    res = vectorstore.get(where={"source": {"$eq": fname}}, include=[])
    ids = res.get("ids", []) or []
    if not ids:
        return {"status": "error", "message": f"No chunks found for {filename}"}

    # 2) Update metadata (keep "source", set/clear "category")
    meta_val = {"category": (new_category or ""), "source": fname}
    vectorstore._collection.update(ids=ids, metadatas=[meta_val] * len(ids))
    try:
        vectorstore._client.persist()
    except Exception as e:
        print("persist warning:", e)

    return {"status": "success", "updated": len(ids), "filename": fname, "new_category": new_category}




#

# # services/chroma_service.py
# import os
#
# def update_category(vectorstore, filename: str, new_category: str | None):
#     fname = os.path.basename(filename)
#
#     # 1) fetch matching chunk IDs (ids are always returned; don't ask for them in include)
#     res = vectorstore.get(where={"source": {"$eq": fname}}, include=[])
#     ids = res.get("ids") or []
#
#     # some wrappers can return nested lists; flatten just in case
#     if ids and isinstance(ids[0], list):
#         ids = [i for sub in ids for i in sub]
#
#     if not ids:
#         # fallback: scan all metadatas to find exact filename matches
#         all_res = vectorstore.get(include=["metadatas"])
#         all_ids = all_res.get("ids") or []
#         metas = all_res.get("metadatas") or []
#         if metas and isinstance(metas[0], list):
#             metas = [m for sub in metas for m in sub]
#             all_ids = [i for sub in all_ids for i in sub]
#         ids = [
#             i for i, m in zip(all_ids, metas)
#             if (m or {}).get("source", "") == fname
#         ]
#
#     if not ids:
#         return {"status": "error", "message": f"No chunks found for {fname}"}
#
#     # 2) update metadata for those ids
#     meta_val = {"category": new_category or "", "source": fname}
#     vectorstore._collection.update(ids=ids, metadatas=[meta_val] * len(ids))
#
#     try:
#         vectorstore._client.persist()
#     except Exception as e:
#         print("persist warning:", e)
#
#     return {"status": "success", "updated": len(ids), "filename": fname, "new_category": new_category}

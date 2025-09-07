from fastapi import FastAPI
import uvicorn
from starlette.middleware.cors import CORSMiddleware

from query_data import query_rag
from pydantic import BaseModel


app = FastAPI()


#allowed origins
origins = [
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:8000",
]

# Block unauthorized requrests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Tells where to extract the query string from the json object received from the frontend
class Question(BaseModel):
    query: str


@app.get("/")
async def root():
    return {"message": "Hello World"}

#ask LLM
@app.post("/ask")
async def askForm(question: Question): # Fastapi gets question Json object from frontend and changes it into Question-Object (see above)
    query = question.query # retrieve the attribute "query" of Question-Object
    answer = query_rag(query)
    return answer


#update database
# @app.put("/database")



if __name__ == "__main__":
    uvicorn.run("router:app", host="127.0.0.1", port=8000, reload=True)


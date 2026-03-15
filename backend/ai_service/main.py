from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
import io
import numpy as np

app = FastAPI(title="SherLock AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def embed_image_bytes(data: bytes) -> List[float]:
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {exc}")
    img = img.resize((64, 64))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    gray = arr.mean(axis=2)
    flat = gray.flatten()
    emb = l2_normalize(flat)
    return emb.astype(float).tolist()


def embed_text_value(text: str) -> List[float]:
    tokens = [t for t in text.lower().split() if t]
    dim = 128
    vec = np.zeros(dim, dtype=np.float32)
    for tok in tokens:
        h = hash(tok)
        idx = h % dim
        vec[idx] += 1.0
    emb = l2_normalize(vec)
    return emb.astype(float).tolist()


class CompareRequest(BaseModel):
    target: List[float]
    candidates: List[List[float]]


class CompareResponse(BaseModel):
    scores: List[float]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/embed")
async def embed(image: UploadFile = File(None), text: Optional[str] = Form(None)):
    if image is not None:
        data = await image.read()
        embedding = embed_image_bytes(data)
        return {"embedding": embedding}
    if text is not None:
        embedding = embed_text_value(text)
        return {"embedding": embedding}
    raise HTTPException(status_code=400, detail="Provide either image file or text")


@app.post("/compare", response_model=CompareResponse)
async def compare(req: CompareRequest):
    target = np.asarray(req.target, dtype=np.float32)
    scores: List[float] = []
    t_norm = np.linalg.norm(target)
    if t_norm == 0:
        scores = [0.0 for _ in req.candidates]
        return CompareResponse(scores=scores)
    for cand in req.candidates:
        c = np.asarray(cand, dtype=np.float32)
        denom = t_norm * np.linalg.norm(c)
        if denom == 0:
            scores.append(0.0)
        else:
            sim = float(np.dot(target, c) / denom)
            scores.append(sim)
    return CompareResponse(scores=scores)


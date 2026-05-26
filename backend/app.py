# =========================
# app.py
# =========================

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pathlib import Path

import pandas as pd
import io

from backend.mapper import run_mapping

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "frontend"),
    name="static"
)

@app.get("/")
def home():
    return FileResponse(BASE_DIR / "frontend" / "index.html")

@app.post("/columns")
async def get_columns(file: UploadFile = File(...)):

    content = await file.read()

    df = pd.read_excel(io.BytesIO(content))

    return {
        "columns": list(df.columns)
    }

@app.post("/map")
async def map_products(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...)
):

    content_a = await file_a.read()
    content_b = await file_b.read()

    df_a = pd.read_excel(io.BytesIO(content_a))
    df_b = pd.read_excel(io.BytesIO(content_b))

    result_df = run_mapping(df_a, df_b)

    return result_df.to_dict("records")
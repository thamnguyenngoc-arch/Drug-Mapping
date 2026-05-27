# =========================
# app.py
# =========================

from fastapi import FastAPI
from fastapi import UploadFile
from fastapi import File
from fastapi import Form

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pathlib import Path

import pandas as pd
import io
import json

from backend.mapper import run_mapping

# =========================
# BASE DIR
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent

# =========================
# FASTAPI INIT
# =========================

app = FastAPI()

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# STATIC FRONTEND
# =========================

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "frontend"),
    name="static"
)

# =========================
# HOME PAGE
# =========================

@app.get("/")
def home():

    return FileResponse(
        BASE_DIR / "frontend" / "index.html"
    )

# =========================
# READ FILE FUNCTION
# =========================

def read_uploaded_file(content: bytes, filename: str):

    filename = filename.lower()

    # =========================
    # CSV
    # =========================

    if filename.endswith(".csv"):

        df = pd.read_csv(
            io.BytesIO(content),
            dtype=str
        )

    # =========================
    # EXCEL
    # =========================

    else:

        df = pd.read_excel(
            io.BytesIO(content),
            dtype=str
        )

    df = df.fillna("")

    return df

# =========================
# GET COLUMNS
# =========================

@app.post("/columns")
async def get_columns(
    file: UploadFile = File(...)
):

    content = await file.read()

    df = read_uploaded_file(
        content,
        file.filename
    )

    return {
        "columns": list(df.columns)
    }

# =========================
# RUN MAPPING
# =========================

@app.post("/map")
async def map_products(

    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),

    mapping_config: str = Form(...),

    export_columns: str = Form(...),

    threshold: float = Form(...)

):

    # =========================
    # READ FILES
    # =========================

    content_a = await file_a.read()
    content_b = await file_b.read()

    df_a = read_uploaded_file(
        content_a,
        file_a.filename
    )

    df_b = read_uploaded_file(
        content_b,
        file_b.filename
    )

    # =========================
    # PARSE JSON
    # =========================

    mapping_config = json.loads(
        mapping_config
    )

    export_columns = json.loads(
        export_columns
    )

    # =========================
    # VALIDATE WEIGHT
    # =========================

    total_weight = round(

        sum(
            float(x["weight"])
            for x in mapping_config
        ),

        4
    )

    if total_weight != 1:

        return {
            "error": "Total weight must equal 1"
        }

    # =========================
    # RUN MAPPING
    # =========================

    result_df = run_mapping(

        df_a=df_a,
        df_b=df_b,

        mapping_config=mapping_config,

        export_columns=export_columns,

        threshold=threshold

    )

    # =========================
    # RETURN JSON
    # =========================

    return result_df.to_dict(
        orient="records"
    )

# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
def health():

    return {
        "status": "ok"
    }
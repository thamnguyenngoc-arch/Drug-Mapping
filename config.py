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
from fastapi.responses import StreamingResponse

from pathlib import Path

import pandas as pd
import io
import json

from backend.mapper import run_mapping
from backend.mapper import run_mapping_stream

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

    if filename.endswith(".csv"):
        df = pd.read_csv(
            io.BytesIO(content),
            dtype=str
        )
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
    df = read_uploaded_file(content, file.filename)
    return {"columns": list(df.columns)}

# =========================
# RUN MAPPING (JSON response)
# =========================

@app.post("/map")
async def map_products(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    mapping_config: str = Form(...),
    export_columns: str = Form(...),
    threshold: float = Form(...)
):
    content_a = await file_a.read()
    content_b = await file_b.read()

    df_a = read_uploaded_file(content_a, file_a.filename)
    df_b = read_uploaded_file(content_b, file_b.filename)

    mapping_config = json.loads(mapping_config)
    export_columns = json.loads(export_columns)

    # Validate weight
    total_weight = round(
        sum(float(x["weight"]) for x in mapping_config),
        4
    )

    if abs(total_weight - 1) > 0.001:
        return {"error": "Total weight must equal 1"}

    result_df = run_mapping(
        df_a=df_a,
        df_b=df_b,
        mapping_config=mapping_config,
        export_columns=export_columns,
        threshold=threshold
    )

    return result_df.to_dict(orient="records")

# =========================
# RUN MAPPING (SSE stream with progress)
# =========================

@app.post("/map_stream")
async def map_products_stream(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    mapping_config: str = Form(...),
    export_columns: str = Form(...),
    threshold: float = Form(...)
):
    content_a = await file_a.read()
    content_b = await file_b.read()

    df_a = read_uploaded_file(content_a, file_a.filename)
    df_b = read_uploaded_file(content_b, file_b.filename)

    mapping_config_parsed = json.loads(mapping_config)
    export_columns_parsed = json.loads(export_columns)

    # Validate weight
    total_weight = round(
        sum(float(x["weight"]) for x in mapping_config_parsed),
        4
    )

    if abs(total_weight - 1) > 0.001:
        async def error_gen():
            err_msg = json.dumps({"type": "error", "message": "Total weight must equal 1"})
            yield f"data: {err_msg}\n\n"
        return StreamingRespo
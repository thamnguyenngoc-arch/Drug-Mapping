# =========================
# app.py
# =========================

from fastapi import FastAPI
from fastapi import UploadFile
from fastapi import File

from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import io

from mapper import run_mapping

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================
# GET COLUMNS
# ====================================

@app.post("/columns")

async def get_columns(
    file: UploadFile = File(...)
):

    content = await file.read()

    df = pd.read_excel(
        io.BytesIO(content)
    )

    return {
        "columns": list(df.columns)
    }

# ====================================
# MAP
# ====================================

@app.post("/map")

async def map_products(

    file_a: UploadFile = File(...),

    file_b: UploadFile = File(...)

):

    content_a = await file_a.read()

    content_b = await file_b.read()

    df_a = pd.read_excel(
        io.BytesIO(content_a)
    )

    df_b = pd.read_excel(
        io.BytesIO(content_b)
    )

    result_df = run_mapping(
        df_a,
        df_b
    )

    return result_df.to_dict("records")
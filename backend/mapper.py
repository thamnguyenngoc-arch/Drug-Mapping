# =========================
# mapper.py
# =========================

import pandas as pd

from rapidfuzz import fuzz
from functools import lru_cache

from backend.utils import normalize


@lru_cache(maxsize=200000)
def cached_ratio(a, b):
    return fuzz.ratio(str(a), str(b))


THRESHOLD_MATCH = 90
THRESHOLD_REVIEW = 70


def safe_str(value):

    if pd.isna(value):
        return ""

    return str(value)


def run_mapping(
    df_a,
    df_b,
    mapping_config,
    export_columns
):

    df_a = df_a.copy()
    df_b = df_b.copy()

    df_a = df_a.fillna("")
    df_b = df_b.fillna("")

    results = []

    df_b_records = df_b.to_dict("records")

    for _, row_a in df_a.iterrows():

        best_score = -1
        best_row = None

        # =========================
        # FIND BEST MATCH
        # =========================

        for row_b in df_b_records:

            final_score = 0

            for mapping in mapping_config:

                source_col = mapping["source"]
                target_col = mapping["target"]
                weight = float(mapping["weight"])

                value_a = normalize(
                    safe_str(row_a.get(source_col, ""))
                )

                value_b = normalize(
                    safe_str(row_b.get(target_col, ""))
                )

                score = cached_ratio(value_a, value_b)

                final_score += score * weight

            if final_score > best_score:

                best_score = final_score
                best_row = row_b

        # =========================
        # BUILD RESULT ROW
        # =========================

        result_row = {}

        # -------------------------
        # SOURCE EXPORT COLUMNS
        # -------------------------

        for col in export_columns.get("source", []):

            result_row[f"source_{col}"] = row_a.get(col, "")

        # -------------------------
        # TARGET EXPORT COLUMNS
        # -------------------------

        if best_row:

            for col in export_columns.get("target", []):

                result_row[f"target_{col}"] = best_row.get(col, "")

        # -------------------------
        # MAPPING PREVIEW
        # -------------------------

        preview_parts = []

        if best_row:

            for mapping in mapping_config:

                source_col = mapping["source"]
                target_col = mapping["target"]

                source_value = safe_str(
                    row_a.get(source_col, "")
                )

                target_value = safe_str(
                    best_row.get(target_col, "")
                )

                preview_parts.append(
                    f"{source_col}: {source_value} ↔ {target_col}: {target_value}"
                )

        result_row["mapping_preview"] = " | ".join(preview_parts)

        # -------------------------
        # SCORE
        # -------------------------

        result_row["score"] = round(best_score, 2)

        # -------------------------
        # STATUS
        # -------------------------

        if best_score >= THRESHOLD_MATCH:

            status = "Matched"

        elif best_score >= THRESHOLD_REVIEW:

            status = "Review"

        else:

            status = "Unmatched"

        result_row["status"] = status

        # -------------------------
        # APPEND
        # -------------------------

        results.append(result_row)

    return pd.DataFrame(results)
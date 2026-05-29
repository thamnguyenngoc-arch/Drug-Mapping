# =========================
# mapper.py
# =========================

import pandas as pd

from rapidfuzz import fuzz
from rapidfuzz import process

from functools import lru_cache

from backend.utils import normalize

# =========================
# CACHE FUZZY SCORE
# =========================

@lru_cache(maxsize=500000)
def cached_ratio(a, b):
    return fuzz.ratio(str(a), str(b))

# =========================
# SAFE STRING
# =========================

def safe_str(value):
    if pd.isna(value):
        return ""
    return str(value)

# =========================
# BUILD SOURCE KEY
# =========================

def build_source_key(row, mapping_config):
    values = []
    for mapping in mapping_config:
        source_col = mapping["source"]
        value = normalize(safe_str(row.get(source_col, "")))
        values.append(value)
    return " ".join(values).strip()

# =========================
# BUILD TARGET KEY
# =========================

def build_target_key(row, mapping_config):
    values = []
    for mapping in mapping_config:
        target_col = mapping["target"]
        value = normalize(safe_str(row.get(target_col, "")))
        values.append(value)
    return " ".join(values).strip()

# =========================
# CALCULATE WEIGHTED SCORE
# =========================

def calculate_weighted_score(row_a, row_b, mapping_config):
    final_score = 0
    detail_scores = {}

    for mapping in mapping_config:
        source_col = mapping["source"]
        target_col = mapping["target"]
        weight = float(mapping["weight"])

        value_a = normalize(safe_str(row_a.get(source_col, "")))
        value_b = normalize(safe_str(row_b.get(target_col, "")))

        score = cached_ratio(value_a, value_b)
        weighted_score = score * weight
        final_score += weighted_score

        detail_scores[f"{source_col}__vs__{target_col}"] = round(score, 2)

    return round(final_score, 2), detail_scores

# =========================
# PREP TARGET INDEX
# =========================

def prepare_target_index(df_b, mapping_config):
    target_records = df_b.to_dict(orient="records")
    target_keys = []

    for row in target_records:
        target_key = build_target_key(
            row=row,
            mapping_config=mapping_config
        )
        target_keys.append(target_key)

    return target_records, target_keys

# =========================
# GET BEST MATCH
# =========================

def get_best_match(row_a, target_records, target_keys, mapping_config):
    source_key = build_source_key(
        row=row_a,
        mapping_config=mapping_config
    )

    # RapidFuzz candidates
    candidates = process.extract(
        query=source_key,
        choices=target_keys,
        scorer=fuzz.ratio,
        limit=20
    )

    best_score = -1
    best_row = None
    best_detail_scores = {}

    for _, _, idx in candidates:
        row_b = target_records[idx]
        final_score, detail_scores = calculate_weighted_score(
            row_a=row_a,
            row_b=row_b,
            mapping_config=mapping_config
        )

        if final_score > best_score:
            best_score = final_score
            best_row = row_b
            best_detail_scores = detail_scores

    return best_row, best_score, best_detail_scores

# =========================
# BUILD RESULT ROW
# =========================

def build_result_row(
    row_a, best_row, best_score,
    detail_scores, export_columns,
    mapping_config, threshold
):
    result_row = {}

    # Export source columns
    for col in export_columns.get("source", []):
        result_row[f"source__{col}"] = row_a.get(col, "")

    # Export target columns
    for col in export_columns.get("target", []):
        if best_row:
            result_row[f"target__{col}"] = best_row.get(col, "")
        else:
            result_row[f"target__{col}"] = ""

    # Final score
    result_row["score"] = round(best_score, 2)

    # Predict
    if best_score >= threshold:
        predict = "Match"
    else:
        predict = "Unmatch"

    result_row["predict"] = predict

    return result_row

# =========================
# MAIN MAPPING FUNCTION
# (returns DataFrame)
# =========================

def run_mapping(df_a, df_b, mapping_config, export_columns, threshold):
    df_a = df_a.fillna("")
    df_b = df_b.fillna("")

    target_records, target_keys = prepare_target_index(
        df_b=df_b,
        mapping_config=mapping_config
    )

    results = []
    total_rows = len(df_a)

    for idx, (_, row_a) in enumerate(df_a.iterrows()):
        best_row, best_score, detail_scores = get_best_match(
            row_a=row_a,
            target_records=target_records,
            target_keys=target_keys,
            mapping_config=mapping_config
        )

        result_row = build_result_row(
            row_a=row_a,
            best_row=best_row,
            best_score=best_score,
            detail_scores=detail_scores,
            export_columns=export_columns,
            mapping_config=mapping_config,
            threshold=threshold
        )

        results.append(result_row)

        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1}/{total_rows}")

    result_df = pd.DataFrame(results)
    return result_df

# =========================
# STREAMING MAPPING FUNCTION
# (yields progress events via SSE)
# =========================

def run_mapping_stream(df_a, df_b, mapping_config, export_columns, threshold):
    """
    Generator that yields SSE event dicts:
      {"type": "progress", "current": N, "total": M}
      {"type": "complete", "data": [...]}
      {"type": "error", "message": "..."}
    """
    df_a = df_a.fillna("")
    df_b = df_b.fillna("")

    target_records, target_keys = prepare_target_index(
        df_b=df_b,
        mapping_config=mapping_config
    )

    results = []
    total_rows = len(df_a)

    # Send initial progress
    yield {"type": "progress", "current": 0, "total": total_rows}

    # Determine progress reporting interval
    # Report every 1% or every 10 rows, whichever is larger
    report_interval = max(1, total_rows // 100, 10)

    for idx, (_, row_a) in enumerate(df_a.iterrows()):
        best_row, best_score, detail_scores = get_best_match(
            row_a=row_a,
            target_records=target_records,
            target_keys=target_keys,
            mapping_config=mapping_config
        )

        result_row = build_result_row(
            row_a=row_a,
            best_row=best_row,
            best_score=best_score,
            detail_scores=detail_scores,
            export_columns=export_columns,
            mapping_config=mapping_config,
            threshold=threshold
        )

        results.append(result_row)

        # Send progress update at intervals
        current = idx + 1
        if current % report_interval == 0 or current == total_rows:
            yield {
                "type": "progress",
                "current": current,
                "total": total_rows
            }

    # Send complete event with all results
    result_df = pd.DataFrame(results)
    yield {
        "type": "complete",
        "data": result_df.to_dict(orient="records")
    }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
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

    return fuzz.ratio(
        str(a),
        str(b)
    )

# =========================
# SAFE STRING
# =========================

def safe_str(value):

    if pd.isna(value):
        return ""

    return str(value)

# =========================
# BUILD SOURCE KEY
# dùng để tạo search key
# cho df_a
# =========================

def build_source_key(
    row,
    mapping_config
):

    values = []

    for mapping in mapping_config:

        source_col = mapping["source"]

        value = normalize(
            safe_str(
                row.get(source_col, "")
            )
        )

        values.append(value)

    return " ".join(values).strip()

# =========================
# BUILD TARGET KEY
# dùng để tạo search key
# cho df_b
# =========================

def build_target_key(
    row,
    mapping_config
):

    values = []

    for mapping in mapping_config:

        target_col = mapping["target"]

        value = normalize(
            safe_str(
                row.get(target_col, "")
            )
        )

        values.append(value)

    return " ".join(values).strip()

# =========================
# CALCULATE WEIGHTED SCORE
# =========================

def calculate_weighted_score(

    row_a,
    row_b,

    mapping_config

):

    final_score = 0

    detail_scores = {}

    for mapping in mapping_config:

        source_col = mapping["source"]
        target_col = mapping["target"]

        weight = float(
            mapping["weight"]
        )

        value_a = normalize(
            safe_str(
                row_a.get(source_col, "")
            )
        )

        value_b = normalize(
            safe_str(
                row_b.get(target_col, "")
            )
        )

        score = cached_ratio(
            value_a,
            value_b
        )

        weighted_score = score * weight

        final_score += weighted_score

        detail_scores[
            f"{source_col}__vs__{target_col}"
        ] = round(score, 2)

    return round(final_score, 2), detail_scores

# =========================
# PREP TARGET INDEX
# optimize performance
# =========================

def prepare_target_index(

    df_b,
    mapping_config

):

    target_records = df_b.to_dict(
        orient="records"
    )

    target_keys = []

    for row in target_records:

        target_key = build_target_key(

            row=row,
            mapping_config=mapping_config

        )

        target_keys.append(
            target_key
        )

    return target_records, target_keys

# =========================
# GET BEST MATCH
# =========================

def get_best_match(

    row_a,

    target_records,
    target_keys,

    mapping_config

):

    source_key = build_source_key(

        row=row_a,
        mapping_config=mapping_config

    )

    # =========================
    # RAPIDFUZZ CANDIDATES
    # =========================

    candidates = process.extract(

        query=source_key,

        choices=target_keys,

        scorer=fuzz.ratio,

        limit=20

    )

    best_score = -1
    best_row = None
    best_detail_scores = {}

    # =========================
    # EVALUATE TOP CANDIDATES
    # =========================

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

    return (

        best_row,
        best_score,
        best_detail_scores

    )

# =========================
# BUILD RESULT ROW
# =========================

def build_result_row(

    row_a,
    best_row,

    best_score,

    detail_scores,

    export_columns,

    mapping_config,

    threshold

):

    result_row = {}

    # =========================
    # EXPORT SOURCE COLUMNS
    # =========================

    for col in export_columns.get(
        "source",
        []
    ):

        result_row[
            f"source__{col}"
        ] = row_a.get(col, "")

    # =========================
    # EXPORT TARGET COLUMNS
    # =========================

    for col in export_columns.get(
        "target",
        []
    ):

        if best_row:

            result_row[
                f"target__{col}"
            ] = best_row.get(col, "")

        else:

            result_row[
                f"target__{col}"
            ] = ""

    # =========================
    # SHOW COMPARE COLUMNS
    # =========================

    for mapping in mapping_config:

        source_col = mapping["source"]

        target_col = mapping["target"]

        result_row[
            f"compare_source__{source_col}"
        ] = row_a.get(
            source_col,
            ""
        )

        if best_row:

            result_row[
                f"compare_target__{target_col}"
            ] = best_row.get(
                target_col,
                ""
            )

        else:

            result_row[
                f"compare_target__{target_col}"
            ] = ""

    # =========================
    # DETAIL SCORES
    # =========================

    for k, v in detail_scores.items():

        result_row[
            f"detail_score__{k}"
        ] = v

    # =========================
    # FINAL SCORE
    # =========================

    result_row["score"] = round(
        best_score,
        2
    )

    # =========================
    # PREDICT
    # =========================

    if best_score >= threshold:

        predict = "Match"

    else:

        predict = "Unmatch"

    result_row["predict"] = predict

    return result_row

# =========================
# MAIN MAPPING FUNCTION
# =========================

def run_mapping(

    df_a,
    df_b,

    mapping_config,

    export_columns,

    threshold

):

    # =========================
    # CLEAN DATA
    # =========================

    df_a = df_a.fillna("")
    df_b = df_b.fillna("")

    # =========================
    # PREP TARGET INDEX
    # =========================

    target_records, target_keys = prepare_target_index(

        df_b=df_b,
        mapping_config=mapping_config

    )

    results = []

    total_rows = len(df_a)

    # =========================
    # LOOP SOURCE ROWS
    # =========================

    for idx, (_, row_a) in enumerate(
        df_a.iterrows()
    ):

        # =========================
        # FIND BEST MATCH
        # =========================

        best_row, best_score, detail_scores = get_best_match(

            row_a=row_a,

            target_records=target_records,
            target_keys=target_keys,

            mapping_config=mapping_config

        )

        # =========================
        # BUILD RESULT
        # =========================

        result_row = build_result_row(

            row_a=row_a,

            best_row=best_row,

            best_score=best_score,

            detail_scores=detail_scores,

            export_columns=export_columns,

            mapping_config=mapping_config,

            threshold=threshold

        )

        results.append(
            result_row
        )

        # =========================
        # LOG PROGRESS
        # =========================

        if (idx + 1) % 100 == 0:

            print(
                f"Processed {idx + 1}/{total_rows}"
            )

    # =========================
    # RETURN DATAFRAME
    # =========================

    result_df = pd.DataFrame(
        results
    )

    return result_df
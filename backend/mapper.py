# =========================
# mapper.py
# =========================

import pandas as pd

from rapidfuzz import fuzz
from functools import lru_cache

from backend.utils import (
    normalize,
    extract_volume,
    remove_volume,
    main_token
)

from config import MATCH_CONFIG

# =========================
# CACHE
# =========================

@lru_cache(maxsize=200000)
def cached_ratio(a, b):
    return fuzz.ratio(a, b)

@lru_cache(maxsize=200000)
def cached_partial(a, b):
    return fuzz.partial_ratio(a, b)

# =========================
# MAIN MAPPING FUNCTION
# =========================

def run_mapping(
    df_a,
    df_b
):

    # =====================
    # PREPARE DATA
    # =====================

    df_a["clean_name"] = (
        df_a["Market Name cleaned"]
        .fillna("")
        .apply(normalize)
    )

    df_a["volume"] = (
        df_a["Packaging"]
        .fillna("")
        .apply(extract_volume)
    )

    df_a["main"] = (
        df_a["clean_name"]
        .apply(remove_volume)
    )

    df_a["unit_clean"] = (
        df_a["Unit (Source)"]
        .fillna("")
        .apply(normalize)
    )

    df_b["clean_name"] = (
        df_b["product_name"]
        .fillna("")
        .apply(normalize)
    )

    df_b["volume"] = (
        df_b["volumes"]
        .fillna("")
        .astype(str)
        .apply(normalize)
    )

    df_b["main"] = (
        df_b["clean_name"]
        .apply(remove_volume)
    )

    df_b["unit_clean"] = (
        df_b["unit"]
        .fillna("")
        .apply(normalize)
    )

    # =====================
    # BLOCKING
    # =====================

    df_a["token"] = df_a["main"].apply(main_token)

    df_b["token"] = df_b["main"].apply(main_token)

    df_b_records = df_b.to_dict("records")

    block_index = {}

    for row in df_b_records:

        tok = row["token"]

        block_index.setdefault(tok, []).append(row)

    # =====================
    # MATCHING
    # =====================

    results = []

    for row_a in df_a.to_dict("records"):

        token = row_a["token"]

        subset = block_index.get(token, df_b_records)

        # =================
        # QUICK FILTER
        # =================

        filtered_subset = []

        for row_b in subset:

            score_quick = cached_partial(
                row_a["main"],
                row_b["main"]
            )

            if score_quick >= MATCH_CONFIG["quick_threshold"]:
                filtered_subset.append(row_b)

        if filtered_subset:
            subset = filtered_subset

        # =================
        # BEST MATCH
        # =================

        best_score = -999
        best_row = None

        for row_b in subset:

            score_name = cached_ratio(
                row_a["main"],
                row_b["main"]
            )

            if score_name < MATCH_CONFIG["name_threshold"]:
                continue

            # UNIT
            if row_a["unit_clean"] and row_b["unit_clean"]:

                score_unit = cached_ratio(
                    row_a["unit_clean"],
                    row_b["unit_clean"]
                )

            else:
                score_unit = 0

            # VOLUME
            if row_a["volume"] and row_b["volume"]:

                score_volume = cached_ratio(
                    row_a["volume"],
                    row_b["volume"]
                )

            else:
                score_volume = 0

            # FINAL SCORE

            final_score = (

                MATCH_CONFIG["weights"]["name"]
                * score_name

                +

                MATCH_CONFIG["weights"]["unit"]
                * score_unit

                +

                MATCH_CONFIG["weights"]["volume"]
                * score_volume

            )

            # BONUS

            if (
                row_a["unit_clean"]
                and
                row_a["unit_clean"]
                == row_b["unit_clean"]
            ):
                final_score += (
                    MATCH_CONFIG["bonus"]["exact_unit"]
                )

            if (
                row_a["volume"]
                and
                row_a["volume"]
                == row_b["volume"]
            ):
                final_score += (
                    MATCH_CONFIG["bonus"]["exact_volume"]
                )

            if final_score > best_score:

                best_score = final_score
                best_row = row_b

        # =================
        # RESULT
        # =================

        result = {

            "source_name":
                row_a["Market Name"],

            "matched_name":
                best_row["product_name"]
                if best_row else None,

            "score":
                round(best_score, 2),

            "brand":
                "",

            "unit":
                best_row["unit"]
                if best_row else None,

            "status":
                (
                    "Matched"
                    if best_score >= 95
                    else "Review"
                )

        }

        results.append(result)

    return pd.DataFrame(results)
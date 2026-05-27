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

from backend.config import MATCH_CONFIG

# =========================
# CACHE
# =========================

@lru_cache(maxsize=200000)
def cached_ratio(a, b):
    return fuzz.ratio(str(a), str(b))


@lru_cache(maxsize=200000)
def cached_partial(a, b):
    return fuzz.partial_ratio(str(a), str(b))


# =========================
# SAFE COLUMN
# =========================

def safe_col(df, col_name):

    if col_name not in df.columns:
        return pd.Series([""] * len(df))

    return df[col_name].fillna("").astype(str)


# =========================
# MAIN MAPPING FUNCTION
# =========================

def run_mapping(df_a, df_b):

    try:

        # =====================
        # EMPTY CHECK
        # =====================

        if df_a.empty:
            raise Exception("File A is empty")

        if df_b.empty:
            raise Exception("File B is empty")

        # =====================
        # PREPARE DATA
        # =====================

        df_a = df_a.copy()
        df_b = df_b.copy()

        # ---------- DF A ----------

        df_a["clean_name"] = (
            safe_col(df_a, "Market Name cleaned")
            .apply(normalize)
        )

        df_a["volume"] = (
            safe_col(df_a, "Packaging")
            .apply(extract_volume)
        )

        df_a["main"] = (
            df_a["clean_name"]
            .apply(remove_volume)
        )

        df_a["unit_clean"] = (
            safe_col(df_a, "Unit (Source)")
            .apply(normalize)
        )

        # ---------- DF B ----------

        df_b["clean_name"] = (
            safe_col(df_b, "product_name")
            .apply(normalize)
        )

        df_b["volume"] = (
            safe_col(df_b, "volumes")
            .apply(normalize)
        )

        df_b["main"] = (
            df_b["clean_name"]
            .apply(remove_volume)
        )

        df_b["unit_clean"] = (
            safe_col(df_b, "unit")
            .apply(normalize)
        )

        # =====================
        # BLOCKING
        # =====================

        df_a["token"] = (
            df_a["main"]
            .apply(main_token)
        )

        df_b["token"] = (
            df_b["main"]
            .apply(main_token)
        )

        df_b_records = (
            df_b.to_dict("records")
        )

        block_index = {}

        for row in df_b_records:

            tok = row.get("token", "")

            block_index.setdefault(tok, []).append(row)

        # =====================
        # MATCHING
        # =====================

        results = []

        for row_a in df_a.to_dict("records"):

            token = row_a.get("token", "")

            subset = (
                block_index.get(token)
                or df_b_records
            )

            # =================
            # QUICK FILTER
            # =================

            filtered_subset = []

            for row_b in subset:

                score_quick = cached_partial(
                    str(row_a.get("main", "")),
                    str(row_b.get("main", ""))
                )

                if (
                    score_quick >=
                    MATCH_CONFIG["quick_threshold"]
                ):
                    filtered_subset.append(row_b)

            if filtered_subset:
                subset = filtered_subset

            # =================
            # BEST MATCH
            # =================

            best_score = 0
            best_row = None

            for row_b in subset:

                score_name = cached_ratio(
                    str(row_a.get("main", "")),
                    str(row_b.get("main", ""))
                )

                if (
                    score_name <
                    MATCH_CONFIG["name_threshold"]
                ):
                    continue

                # =================
                # UNIT
                # =================

                if (
                    row_a.get("unit_clean")
                    and
                    row_b.get("unit_clean")
                ):

                    score_unit = cached_ratio(
                        str(row_a["unit_clean"]),
                        str(row_b["unit_clean"])
                    )

                else:

                    score_unit = 0

                # =================
                # VOLUME
                # =================

                if (
                    row_a.get("volume")
                    and
                    row_b.get("volume")
                ):

                    score_volume = cached_ratio(
                        str(row_a["volume"]),
                        str(row_b["volume"])
                    )

                else:

                    score_volume = 0

                # =================
                # FINAL SCORE
                # =================

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

                # =================
                # BONUS
                # =================

                if (
                    row_a.get("unit_clean")
                    and
                    row_a.get("unit_clean")
                    ==
                    row_b.get("unit_clean")
                ):

                    final_score += (
                        MATCH_CONFIG["bonus"]["exact_unit"]
                    )

                if (
                    row_a.get("volume")
                    and
                    row_a.get("volume")
                    ==
                    row_b.get("volume")
                ):

                    final_score += (
                        MATCH_CONFIG["bonus"]["exact_volume"]
                    )

                # =================
                # BEST MATCH
                # =================

                if final_score > best_score:

                    best_score = final_score
                    best_row = row_b

            # =================
            # STATUS
            # =================

            if best_score >= 95:

                status = "Matched"

            elif best_score >= 80:

                status = "Review"

            else:

                status = "Unmatched"

            # =================
            # RESULT
            # =================

            result = {

                "source_name":
                    row_a.get("Market Name", ""),

                "matched_name":
                    (
                        best_row.get("product_name", "")
                        if best_row
                        else ""
                    ),

                "score":
                    round(float(best_score), 2),

                "brand":
                    "",

                "unit":
                    (
                        best_row.get("unit", "")
                        if best_row
                        else ""
                    ),

                "status":
                    status

            }

            results.append(result)

        return pd.DataFrame(results)

    except Exception as e:

        print("MAPPING ERROR:")
        print(str(e))

        raise e
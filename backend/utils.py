# =========================
# utils.py
# =========================

import re
import unicodedata

# =========================
# REMOVE ACCENT
# =========================

def remove_accent(text):

    text = unicodedata.normalize(
        "NFKD",
        text
    )

    text = "".join(

        c for c in text

        if not unicodedata.combining(c)

    )

    return text

# =========================
# CLEAN SPECIAL TEXT
# =========================

def clean_special_text(text):

    # remove common tags
    text = text.replace("[ngưng bán]", " ")

    text = text.replace("[ngung ban]", " ")

    text = text.replace("(ngưng bán)", " ")

    text = text.replace("(ngung ban)", " ")

    # normalize separators
    text = text.replace("/", " ")

    text = text.replace("-", " ")

    text = text.replace("_", " ")

    return text

# =========================
# NORMALIZE TEXT
# =========================

def normalize(text):

    # =========================
    # NULL SAFE
    # =========================

    if text is None:
        return ""

    text = str(text)

    # =========================
    # LOWER
    # =========================

    text = text.lower().strip()

    # =========================
    # CLEAN SPECIAL
    # =========================

    text = clean_special_text(
        text
    )

    # =========================
    # REMOVE ACCENT
    # =========================

    text = remove_accent(
        text
    )

    # =========================
    # KEEP ONLY:
    # letters + numbers + spaces
    # =========================

    text = re.sub(

        r"[^a-z0-9 ]",

        " ",

        text

    )

    # =========================
    # REMOVE MULTI SPACES
    # =========================

    text = re.sub(

        r"\s+",

        " ",

        text

    )

    # =========================
    # FINAL STRIP
    # =========================

    text = text.strip()

    return text

# =========================
# SAFE FLOAT
# =========================

def safe_float(value):

    try:

        return float(value)

    except:

        return 0.0

# =========================
# SAFE STRING
# =========================

def safe_string(value):

    if value is None:
        return ""

    return str(value).strip()

# =========================
# IS EMPTY
# =========================

def is_empty(value):

    if value is None:
        return True

    value = str(value).strip()

    return value == ""

# =========================
# NORMALIZE COLUMN NAME
# useful for frontend/export
# =========================

def normalize_column_name(col):

    col = str(col)

    col = col.strip()

    col = re.sub(

        r"\s+",

        "_",

        col

    )

    return col.lower()
# =========================
# utils.py
# =========================

import re
import pandas as pd

RE_SPECIAL = re.compile(r"[^a-z0-9 ]")
RE_SPACE = re.compile(r"\s+")
RE_DIGIT = re.compile(r"\d")

RE_VOLUME = re.compile(
    r"\d+(?:\.\d+)?\s?(?:ml|mg|g|kg|mcg|l|iu|ui)"
)

def normalize(text):

    if pd.isna(text):
        return ""

    text = str(text).lower()

    text = text.replace("[ngưng bán]", "")

    text = RE_SPECIAL.sub(" ", text)

    text = RE_SPACE.sub(" ", text).strip()

    return text

def extract_volume(text):

    text = normalize(text)

    matches = RE_VOLUME.findall(text)

    return " ".join(matches)

def remove_volume(text):

    text = normalize(text)

    text = RE_VOLUME.sub(" ", text)

    text = RE_SPACE.sub(" ", text).strip()

    return text

def main_token(text):

    tokens = text.split()

    tokens = [
        t for t in tokens
        if len(t) >= 3 and not RE_DIGIT.search(t)
    ]

    return max(tokens, key=len) if tokens else ""
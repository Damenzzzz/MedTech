from __future__ import annotations

import re
from collections.abc import Iterable


TOKEN_RE = re.compile(r"[a-zа-яёәғқңөұүһі0-9]+", re.IGNORECASE)
ICD_RE = re.compile(r"\b[A-ZА-Я]\d{2}(?:\.\d+)?(?:-[A-ZА-Я]?\d{2}(?:\.\d+)?)?\b")
STOPWORDS = {
    "а",
    "без",
    "бы",
    "в",
    "во",
    "вот",
    "да",
    "для",
    "до",
    "его",
    "ее",
    "если",
    "же",
    "за",
    "и",
    "из",
    "или",
    "им",
    "к",
    "как",
    "ко",
    "ли",
    "мне",
    "на",
    "над",
    "не",
    "но",
    "ну",
    "о",
    "об",
    "от",
    "по",
    "под",
    "при",
    "про",
    "с",
    "со",
    "так",
    "там",
    "то",
    "у",
    "уже",
    "что",
    "это",
    "я",
    "меня",
    "мой",
    "моя",
    "мы",
    "вы",
    "он",
    "она",
    "они",
    "оно",
    "очень",
    "прям",
    "примерно",
    "пожалуйста",
    "здравствуйте",
    "подскажите",
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def tokenize(text: str) -> list[str]:
    tokens = [token.lower().replace("ё", "е") for token in TOKEN_RE.findall(text or "")]
    return [token for token in tokens if len(token) > 2 and token not in STOPWORDS]


def extract_icd_codes(text: str) -> list[str]:
    seen: set[str] = set()
    codes: list[str] = []
    for raw in ICD_RE.findall(text or ""):
        code = raw.upper().replace("А", "A").replace("В", "B").replace("С", "C").replace("Е", "E")
        if code not in seen:
            seen.add(code)
            codes.append(code)
    return codes


def recursive_chunks(text: str, max_chars: int = 700, overlap: int = 100) -> list[str]:
    cleaned = normalize_text(text)
    if not cleaned:
        return []
    paragraphs = split_recursive(cleaned, max_chars=max_chars)
    chunks: list[str] = []
    previous_tail = ""
    for paragraph in paragraphs:
        chunk = normalize_text(f"{previous_tail} {paragraph}") if previous_tail else paragraph
        if chunk:
            chunks.append(chunk[: max_chars + overlap].strip())
        previous_tail = chunk[-overlap:] if overlap > 0 else ""
    return chunks


def split_recursive(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    for sep in ("\n\n", "\n", ". ", "; ", ", ", " "):
        parts = text.split(sep)
        if len(parts) == 1:
            continue
        return list(pack_parts(parts, sep, max_chars))
    return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]


def pack_parts(parts: Iterable[str], sep: str, max_chars: int) -> Iterable[str]:
    current = ""
    for part in parts:
        part = part.strip()
        if not part:
            continue
        candidate = f"{current}{sep}{part}" if current else part
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            yield current.strip()
        if len(part) > max_chars:
            yield from split_recursive(part, max_chars)
            current = ""
        else:
            current = part
    if current:
        yield current.strip()

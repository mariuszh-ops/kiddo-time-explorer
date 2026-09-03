# -*- coding: utf-8 -*-
"""
Generuje obrazki Open Graph 1200x630 dla wpisow /inspiracje/*.

Po co: audyt 400 (BC-E-05) znalazl 4 og:image ponizej 1200x630 — Facebook
i Messenger przycinaja wtedy podglad albo pokazuja go rozmyty. Lokalne
zdjecia bloga maja 800x450, a zdjecia z R2 dowolna wysokosc, wiec zamiast
zgadywac generujemy jeden przewidywalny format per wpis.

Zrodlo: src/data/blogPosts.ts (slug + imageUrl).
Wynik : public/og/blog/<slug>.jpg (1200x630, JPEG q=78).

Uruchomienie (z katalogu repo frontu):
    python scripts/og_blog.py
"""
import io
import os
import re
import sys
import urllib3
import requests
from PIL import Image

urllib3.disable_warnings()
sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "data", "blogPosts.ts")
OUT_DIR = os.path.join(ROOT, "public", "og", "blog")
W, H, QUALITY = 1200, 630, 78


def wpisy() -> list[tuple[str, str]]:
    """[(slug, imageUrl)] w kolejnosci wystapienia w blogPosts.ts."""
    src = io.open(SRC, encoding="utf-8").read()
    slugi = [(m.start(), m.group(1)) for m in re.finditer(r'\n    slug:\s*"([^"]+)"', src)]
    obrazy = [(m.start(), m.group(1)) for m in re.finditer(r'\n    imageUrl:\s*\n?\s*"([^"]+)"', src)]
    out = []
    for i, (poz, slug) in enumerate(slugi):
        koniec = slugi[i + 1][0] if i + 1 < len(slugi) else len(src)
        img = next((u for p, u in obrazy if poz < p < koniec), None)
        if img:
            out.append((slug, img))
    return out


def zrodlo(url: str) -> bytes:
    if url.startswith("http"):
        r = requests.get(url, timeout=30, verify=False)
        r.raise_for_status()
        return r.content
    return open(os.path.join(ROOT, "public", url.lstrip("/")), "rb").read()


def kadr(dane: bytes) -> Image.Image:
    """Skaluje do szerokosci 1200 i przycina w pionie do 630 (bez deformacji)."""
    img = Image.open(io.BytesIO(dane)).convert("RGB")
    skala = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * skala), round(img.height * skala)), Image.LANCZOS)
    lewo = (img.width - W) // 2
    gora = (img.height - H) // 2
    return img.crop((lewo, gora, lewo + W, gora + H))


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    lista = wpisy()
    if not lista:
        print("BLAD: nie wyciagnalem zadnego wpisu z blogPosts.ts")
        return 1
    bledy = 0
    for slug, url in lista:
        cel = os.path.join(OUT_DIR, f"{slug}.jpg")
        try:
            kadr(zrodlo(url)).save(cel, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            print(f"OK  {slug:52s} {os.path.getsize(cel) // 1024:4d} KB  <- {url}")
        except Exception as e:  # noqa: BLE001 — chcemy przejsc caly zestaw
            bledy += 1
            print(f"BLAD {slug}: {e}")
    print(f"\nwpisow={len(lista)} bledow={bledy} katalog={OUT_DIR}")
    return 1 if bledy else 0


if __name__ == "__main__":
    raise SystemExit(main())

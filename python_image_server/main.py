from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
import urllib.parse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트 IP 바뀌어도 대응
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 🔹 메모리 캐시
# =========================
IMAGE_CACHE = {}  # key: (name, address) → imageUrl

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

EXCLUDE_KEYWORDS = [
    "elevator", "엘리베이터",
    "interior", "room", "객실",
    "logo", "sign", "아이콘",
    "keyboard", "lift",
    "백화점", "mall"
]

@app.get("/image")
def get_image(address: str = Query(""), name: str = Query(...)):
    cache_key = (name.strip(), address.strip())

    # 1️⃣ 캐시 히트
    if cache_key in IMAGE_CACHE:
        return {
            "success": True,
            "imageUrl": IMAGE_CACHE[cache_key],
            "cached": True
        }

    # 2️⃣ Bing 검색
    query = f"{address} {name}".strip()
    q = urllib.parse.quote_plus(query)
    url = f"https://www.bing.com/images/search?q={q}&form=HDRSC2"

    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")
        image_divs = soup.select("a.iusc")

        for div in image_divs:
            meta = div.get("m")
            if not meta or '"murl":"' not in meta:
                continue

            start = meta.find('"murl":"') + len('"murl":"')
            end = meta.find('"', start)
            img_url = meta[start:end]

            if not img_url.startswith("https://"):
                continue
            if img_url.endswith(".svg"):
                continue

            lower = img_url.lower()
            if any(word in lower for word in EXCLUDE_KEYWORDS):
                continue

            IMAGE_CACHE[cache_key] = img_url
            return {
                "success": True,
                "imageUrl": img_url,
                "cached": False
            }

        return {
            "success": False,
            "imageUrl": None,
            "cached": False
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

import os
import sys
import urllib.request
import concurrent.futures
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "frontend" / "assets" / "images"

ASSETS = {
    # Brand & About
    "logo-nav.png": "380e19_5e8f78ef0e8c4b4caf716c2364058164~mv2.png",
    "logo-square.png": "380e19_f64a0997cbc14e7fa6f312d2125351d7~mv2.png",
    "founder-anupama.jpeg": "380e19_7967a65c70e8422aa5fa88adb758219d~mv2.jpeg",

    # Courses
    "welcome-kit.jpeg": "380e19_e06e84c9986e44f093ef98e370f708f1~mv2.jpeg",
    "wizard-plus-banner.jpg": "380e19_505d610716bf49c6a31cb90717e91120~mv2.jpg",
    "wizard-banner.jpg": "nsplsh_45377a737a384a4138464d~mv2_d_3024_3024_s_4_2.jpg",
    "courses-testimonial-bg.jpg": "a3c153_aa22866e271a4b9fba587c925c72699c~mv2.jpg",

    # Home Community Slideshow (14 photos)
    "community/01.jpeg": "380e19_72bcb07a7f24496991b6f764f7ec106f~mv2.jpeg",
    "community/02.jpeg": "380e19_ecbce14e70a8490da89871f7da052d1e~mv2.jpeg",
    "community/03.jpeg": "380e19_8e4169e0b7b9498db2692e6cd5a5507e~mv2.jpeg",
    "community/04.jpeg": "380e19_155f368965444b3eb53e126ac83a4f9d~mv2.jpeg",
    "community/05.jpeg": "380e19_3727d6c404004a0b9d4ccbd5a4bf1809~mv2.jpeg",
    "community/06.jpeg": "380e19_3f69aab8f9d045f39e3b2ee5dbe1d7d1~mv2.jpeg",
    "community/07.jpeg": "380e19_498c58e2565f427e89e7cc25a7ed30c4~mv2.jpeg",
    "community/08.jpeg": "380e19_5087913604f94fce848206bf810ef8bc~mv2.jpeg",
    "community/09.jpeg": "380e19_5b5d0e0ae0984ffdb2cea41e909366fc~mv2.jpeg",
    "community/10.jpeg": "380e19_69183737f6d349449630b6cf7d0be6fd~mv2.jpeg",
    "community/11.jpeg": "380e19_864ee01d9bac4d03b8150f4bc9939eb2~mv2.jpeg",
    "community/12.jpeg": "380e19_c7c599b3bdfe418794fefe6842dd3c0b~mv2.jpeg",
    "community/13.jpeg": "380e19_c878844b8d9b4aa7a63c92065370e7d6~mv2.jpeg",
    "community/14.jpeg": "380e19_d69f95ecc6904e8d827652fa37f6f5d5~mv2.jpeg",

    # Workshops & Events Posters
    "event-stitching-spring.png": "380e19_0d97a802fdf2428bb1ee057ff43f1560~mv2.png",
    "event-bengaluru-meetup.png": "380e19_6a615ebf5b7941a2a6e292341f98ad36~mv2.png",
    "event-delhi-meetup.png": "380e19_1137d9369f5c45ddbf3818bfa8e1ade6~mv2.png",

    # Workshops Masonry Gallery (18 photos)
    "workshops/01.jpeg": "380e19_155f368965444b3eb53e126ac83a4f9d~mv2.jpeg",
    "workshops/02.jpeg": "380e19_441f062d5776421dae523c0249083350~mv2.jpeg",
    "workshops/03.jpeg": "380e19_5b5d0e0ae0984ffdb2cea41e909366fc~mv2.jpeg",
    "workshops/04.jpeg": "380e19_7db311e59ded48abacd9f177bee5fbc0~mv2.jpeg",
    "workshops/05.jpeg": "380e19_951ffcc211b14b0d9cf20adaf0812f01~mv2.jpeg",
    "workshops/06.jpeg": "380e19_99ea4fa2467441cb99ee80817741c1e6~mv2.jpeg",
    "workshops/07.jpeg": "380e19_a67b9f02f9c24c2390827b8816a6b2a0~mv2.jpeg",
    "workshops/08.jpeg": "380e19_bf4d2e4cf8ad4145bfe5d5b76c93d96a~mv2.jpeg",
    "workshops/09.jpeg": "380e19_c7c599b3bdfe418794fefe6842dd3c0b~mv2.jpeg",
    "workshops/10.jpeg": "380e19_cc0bab9c550f4f7e81c0f75772312a07~mv2.jpeg",
    "workshops/11.jpeg": "380e19_d0f0d7a4802342ae9e99030c7526cb29~mv2.jpeg",
    "workshops/12.jpeg": "380e19_d3e93c24d6e349b2b64922b373f3fb9f~mv2.jpeg",
    "workshops/13.jpeg": "380e19_d67bd9f82e14472a9db2c2cd4be36c15~mv2.jpeg",
    "workshops/14.jpeg": "380e19_d69f95ecc6904e8d827652fa37f6f5d5~mv2.jpeg",
    "workshops/15.jpeg": "380e19_e643b01badfd4d9ba660b94d17a756f9~mv2.jpeg",
    "workshops/16.jpeg": "380e19_ea6dd11ad1054984a31ea24ea570576a~mv2.jpeg",
    "workshops/17.jpeg": "380e19_eaefdf46ce0548ffa29eb219415d7304~mv2.jpeg",
    "workshops/18.jpeg": "380e19_ecbce14e70a8490da89871f7da052d1e~mv2.jpeg",

    # 1:1 Tailored Embroidery Session
    "session-hero.jpg": "380e19_d7e614548abf473fa4a255bd442456be~mv2.jpg",
    "session-what-you-learn.jpeg": "380e19_1db0c3b4459044a29dae4e97f4c7f108~mv2.jpeg",
    "sessions/01.jpeg": "380e19_5cd1f078b3464809ab35445c6a3872d7~mv2.jpeg",
    "sessions/02.jpeg": "380e19_9b310f748d05420da8ffb4bc7b8e4be9~mv2.jpeg",
    "sessions/03.jpeg": "380e19_eea951cb7f53467c8f3b35406823f627~mv2.jpeg",
    "sessions/04.jpeg": "380e19_54ed626bfe8341e1ada84edbc4f83642~mv2.jpeg",
    "sessions/05.jpeg": "380e19_99ea4fa2467441cb99ee80817741c1e6~mv2.jpeg",
    "sessions/06.jpeg": "380e19_c51de3a7aaaa4d49b6be993d0cc56238~mv2.jpeg",
    "sessions/07.jpeg": "380e19_d2202a28cb3c4c1989b73b38fb8592e2~mv2.jpeg",
    "sessions/08.jpeg": "380e19_fb8326a8442847e7806af08e49bd98cd~mv2.jpeg",
}

def is_valid_image(data: bytes) -> bool:
    if len(data) < 1024:
        return False
    # PNG, JPEG, WEBP, GIF magic headers
    return (
        data.startswith(b"\x89PNG\r\n\x1a\n")
        or data.startswith(b"\xff\xd8\xff")
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
        or data.startswith(b"GIF8")
    )

def download_one(item):
    rel_path, media_id = item
    dest = IMG_DIR / rel_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1024:
        return (rel_path, True, "cached", dest.stat().st_size)
    url = f"https://static.wixstatic.com/media/{media_id}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Referer": "https://www.youcanstitchwithus.com/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read()
        if not is_valid_image(data):
            return (rel_path, False, f"invalid image bytes ({len(data)}B)", len(data))
        dest.write_bytes(data)
        return (rel_path, True, "downloaded", len(data))
    except Exception as exc:
        return (rel_path, False, str(exc), 0)

def main():
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for res in pool.map(download_one, ASSETS.items()):
            results.append(res)
    ok = [r for r in results if r[1]]
    fail = [r for r in results if not r[1]]
    for r in ok:
        print(f"OK   {r[0]} ({r[2]}, {r[3]} bytes)")
    for r in fail:
        print(f"FAIL {r[0]}: {r[2]}", file=sys.stderr)
    print(f"Summary: {len(ok)}/{len(results)} succeeded, {len(fail)} failed")
    sys.exit(1 if fail else 0)

if __name__ == "__main__":
    main()

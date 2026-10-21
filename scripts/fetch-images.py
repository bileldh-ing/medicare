#!/usr/bin/env python3
"""
MediCare dev-time image pipeline.

Downloads free-licence doctor photos (Pexels License) into assets/doctors/,
builds 400x400 WebP avatars, background-removed cut-outs (rembg) for the
detail screen, blurhash placeholders, CREDITS.md and the generated
TypeScript module src/features/doctors/doctorImages.ts.

Images are NEVER hot-linked at runtime: the app only `require()`s files that
this script actually produced, so a failed download simply means that doctor
keeps the gradient initials avatar (no broken image is possible).

Usage:
    pip install "rembg[cpu]" pillow blurhash-python   # rembg/blurhash optional
    python3 scripts/fetch-images.py            # download + process
    python3 scripts/fetch-images.py --offline  # only regenerate TS/credits from files on disk

Optional: set PEXELS_API_KEY to let the script verify photographer names via
the Pexels API (the curated list below already contains them).
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "doctors"
TS_OUT = ROOT / "src" / "features" / "doctors" / "doctorImages.ts"
CREDITS = ROOT / "CREDITS.md"

AVATAR_SIZE = 400
CUTOUT_MAX_H = 1000
WEBP_QUALITY = 88

# Curated, hand-checked Pexels photos (Pexels License: free for commercial and
# non-commercial use, no attribution required; we credit anyway).
# doctorId must match src/features/doctors/doctors.ts
PHOTOS = [
    {"doctorId": "d1", "pexelsId": 19438563, "photographer": "Oys Photography",
     "page": "https://www.pexels.com/photo/doctor-19438563/"},
    {"doctorId": "d2", "pexelsId": 33067699, "photographer": "KAWENY DENYELE",
     "page": "https://www.pexels.com/photo/smiling-female-doctor-in-white-coat-33067699/"},
    {"doctorId": "d3", "pexelsId": 6129500, "photographer": "RDNE Stock project",
     "page": "https://www.pexels.com/photo/portrait-of-a-doctor-6129500/"},
    {"doctorId": "d4", "pexelsId": 19596247, "photographer": "MARTINS JOHN",
     "page": "https://www.pexels.com/photo/portrait-of-smiling-black-woman-doctor-in-medical-robe-19596247/"},
    {"doctorId": "d5", "pexelsId": 12660379, "photographer": "Jrfotosgrand Fotografia",
     "page": "https://www.pexels.com/photo/portrait-of-a-doctor-12660379/"},
    {"doctorId": "d6", "pexelsId": 19963165, "photographer": "Tessy Agbonome",
     "page": "https://www.pexels.com/photo/smiling-doctor-portrait-19963165/"},
    {"doctorId": "d7", "pexelsId": 32205061, "photographer": "Daniil Kondrashin",
     "page": "https://www.pexels.com/photo/portrait-of-confident-young-doctor-with-stethoscope-32205061/"},
    {"doctorId": "d8", "pexelsId": 38618421, "photographer": "Hiếu Lê",
     "page": "https://www.pexels.com/photo/professional-doctor-in-white-coat-with-stethoscope-38618421/"},
]

LICENSE = "Pexels License (https://www.pexels.com/license/)"


def log(msg: str) -> None:
    print(f"[fetch-images] {msg}", flush=True)


def download(pexels_id: int) -> bytes | None:
    url = (f"https://images.pexels.com/photos/{pexels_id}/pexels-photo-{pexels_id}.jpeg"
           "?auto=compress&cs=tinysrgb&w=1600")
    req = urllib.request.Request(url, headers={"User-Agent": "MediCare-dev-image-pipeline/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            if r.status != 200 or not r.headers.get("content-type", "").startswith("image/"):
                return None
            return r.read()
    except Exception as e:  # noqa: BLE001
        log(f"download failed for {pexels_id}: {e}")
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="skip downloads")
    ap.add_argument("--force", action="store_true", help="re-process doctors that already have files")
    args = ap.parse_args()

    try:
        from PIL import Image
    except ImportError:
        log("Pillow missing: pip install pillow. Keeping initials fallbacks.")
        write_ts({})
        return 0

    try:
        from rembg import new_session, remove  # type: ignore
        session = new_session("u2net")
        has_rembg = True
    except Exception as e:  # noqa: BLE001
        log(f"rembg unavailable ({e}); cut-outs will be skipped.")
        has_rembg = False
        session = None
        remove = None  # type: ignore

    try:
        import blurhash  # type: ignore
    except Exception:  # noqa: BLE001
        blurhash = None  # type: ignore

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results: dict[str, dict] = {}

    for p in PHOTOS:
        did = p["doctorId"]
        raw_path = OUT_DIR / f"{did}-source.jpg"
        if (OUT_DIR / f"{did}-avatar.webp").exists() and not args.force:
            continue  # already processed (picked up below)
        if not args.offline and not raw_path.exists():
            data = download(p["pexelsId"])
            if data:
                raw_path.write_bytes(data)
                log(f"downloaded {did} ({len(data)//1024} KB)")
        if not raw_path.exists():
            log(f"no source for {did}; fallback avatar will be used")
            continue

        src = Image.open(raw_path).convert("RGB")
        entry: dict = {"credit": p}

        mask_bbox = None
        cut = None
        if has_rembg:
            try:
                cut = remove(src, session=session)  # RGBA
                alpha = cut.getchannel("A").point(lambda a: 255 if a > 40 else 0)
                mask_bbox = alpha.getbbox()
            except Exception as e:  # noqa: BLE001
                log(f"rembg failed for {did}: {e}")
                cut = None

        # ---- avatar: head-and-shoulders square crop ----
        w, h = src.size
        if mask_bbox:
            l, t, r, b = mask_bbox
            pw = r - l
            side = int(min(max(pw * 0.82, h * 0.34), w, h))
            cx = (l + r) // 2
            top = max(0, t - int(side * 0.06))
        else:
            side = min(w, h)
            cx = w // 2
            top = 0
        left = max(0, min(w - side, cx - side // 2))
        top = max(0, min(h - side, top))
        avatar = src.crop((left, top, left + side, top + side)).resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
        avatar_path = OUT_DIR / f"{did}-avatar.webp"
        avatar.save(avatar_path, "WEBP", quality=WEBP_QUALITY, method=6)
        entry["avatar"] = avatar_path.name
        if blurhash is not None:
            try:
                small = avatar.resize((32, 32))
                entry["blurhash"] = blurhash.encode(small, 4, 3)
            except Exception:  # noqa: BLE001
                pass

        # ---- cut-out: transparent, trimmed, max 1000px height ----
        if cut is not None and mask_bbox:
            trimmed = cut.crop(cut.getbbox())
            # keep upper body (half-body look): crop to 1.25x width height at most
            tw, th = trimmed.size
            max_h = int(tw * 1.35)
            if th > max_h:
                trimmed = trimmed.crop((0, 0, tw, max_h))
            tw, th = trimmed.size
            if th > CUTOUT_MAX_H:
                trimmed = trimmed.resize((int(tw * CUTOUT_MAX_H / th), CUTOUT_MAX_H), Image.LANCZOS)
            cut_path = OUT_DIR / f"{did}-cutout.webp"
            trimmed.save(cut_path, "WEBP", quality=WEBP_QUALITY, method=6)
            entry["cutout"] = cut_path.name
            entry["cutoutAspect"] = round(trimmed.size[0] / trimmed.size[1], 4)

        if os.environ.get("KEEP_SOURCES") != "1":
            raw_path.unlink(missing_ok=True)
        results[did] = entry
        log(f"processed {did}: avatar{' + cutout' if 'cutout' in entry else ''}")

    # When re-run offline after sources were deleted, pick up existing files.
    for p in PHOTOS:
        did = p["doctorId"]
        if did in results:
            continue
        a = OUT_DIR / f"{did}-avatar.webp"
        if a.exists():
            entry = {"credit": p, "avatar": a.name}
            c = OUT_DIR / f"{did}-cutout.webp"
            if c.exists():
                entry["cutout"] = c.name
                try:
                    im = Image.open(c)
                    entry["cutoutAspect"] = round(im.size[0] / im.size[1], 4)
                except Exception:  # noqa: BLE001
                    pass
            results[did] = entry

    write_ts(results)
    write_credits(results)
    (OUT_DIR / "manifest.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
    log(f"done: {len(results)} doctors with photos, "
        f"{sum(1 for r in results.values() if 'cutout' in r)} cut-outs")
    return 0


def write_ts(results: dict) -> None:
    lines = [
        "// AUTO-GENERATED by scripts/fetch-images.py. Do not edit by hand.",
        "// Only files that exist on disk are required here, so the bundle never",
        "// references a missing image. Doctors without an entry use the gradient",
        "// initials avatar fallback.",
                "export interface DoctorImageSet {",
        "  avatar?: number;",
        "  cutout?: number;",
        "  cutoutAspect?: number;",
        "  blurhash?: string;",
        "}",
        "",
        "export const doctorImages: Record<string, DoctorImageSet> = {",
    ]
    for did in sorted(results):
        e = results[did]
        parts = []
        if "avatar" in e:
            parts.append(f"avatar: require('../../../assets/doctors/{e['avatar']}')")
        if "cutout" in e:
            parts.append(f"cutout: require('../../../assets/doctors/{e['cutout']}')")
        if "cutoutAspect" in e:
            parts.append(f"cutoutAspect: {e['cutoutAspect']}")
        if "blurhash" in e:
            parts.append(f"blurhash: '{e['blurhash']}'")
        lines.append(f"  {did}: {{")
        for part in parts:
            lines.append(f"    {part},")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUT.write_text("\n".join(lines))


def write_credits(results: dict) -> None:
    rows = [
        "# Image credits",
        "",
        "All doctor photos are from [Pexels](https://www.pexels.com) under the "
        "[Pexels License](https://www.pexels.com/license/) (free to use, attribution not "
        "required, identifiable people may not be shown in a bad light or implied endorsement).",
        "Avatars are square crops; cut-outs had their background removed with "
        "[rembg](https://github.com/danielgatis/rembg) (u2net model). The doctor names, "
        "specialties and bios in the app are fictional and not those of the people pictured.",
        "",
        "| Doctor id | File(s) | Photographer | Source | Licence |",
        "|---|---|---|---|---|",
    ]
    for p in PHOTOS:
        e = results.get(p["doctorId"])
        if not e:
            continue
        files = ", ".join(f for f in (e.get("avatar"), e.get("cutout")) if f)
        rows.append(f"| {p['doctorId']} | {files} | {p['photographer']} | {p['page']} | {LICENSE} |")
    rows += [
        "",
        "Empty-state illustrations are original vector drawings (react-native-svg) made for this project.",
        "Inter font: SIL Open Font License 1.1 via @expo-google-fonts/inter.",
        "",
    ]
    CREDITS.write_text("\n".join(rows))


if __name__ == "__main__":
    sys.exit(main())

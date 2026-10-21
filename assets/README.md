# Assets

## Doctor photos (`assets/doctors/`)

Produced at **dev time** by `python3 scripts/fetch-images.py` (never hot-linked at runtime).
The script also regenerates `src/features/doctors/doctorImages.ts`, which only `require()`s
files that exist, so a missing file can never break the bundle: that doctor simply shows the
gradient initials avatar.

| File | Size | Format | Used for |
|---|---|---|---|
| `d1-avatar.webp` … `d8-avatar.webp` | 400 × 400, square head-and-shoulders crop | WebP q88 | avatars, list cards, appointment cards |
| `d1-cutout.webp` … `d8-cutout.webp` | transparent background, trimmed, max 1000 px tall, half-body | WebP q88 with alpha | doctor detail hero (right side) |
| `manifest.json` | – | JSON | pipeline output (credits, aspect ratios, blurhash) |

Doctor ids map to `src/features/doctors/doctors.ts`:
d1 Ali Khan (Cardiology), d2 Sofia Martins (Dermatology), d3 Karim Haddad (Neurology),
d4 Amara Okafor (Pediatrics), d5 Lucas Ferreira (Dentist), d6 Grace Adeyemi (Cardiology),
d7 Yusuf Demir (Neurology), d8 Minh Tran (Pediatrics).

To swap a photo: edit the `PHOTOS` list in `scripts/fetch-images.py` (free-licence source only,
skip anything with an unclear person-photo licence), delete the doctor's two `.webp` files and run
`python3 scripts/fetch-images.py`. Credits are rewritten to `CREDITS.md`.

Requirements: `pip install "rembg[cpu]" pillow blurhash-python` (rembg downloads the u2net model,
about 170 MB, on first run). Without rembg the script still makes avatars and skips cut-outs; the
detail screen then falls back to the large avatar.

## Empty-state illustrations

Drawn in code with `react-native-svg` (`src/components/ui/Illustrations.tsx`), so no files needed.

## App icon / splash

`icon.png`, `splash-icon.png`, `android-icon-*.png`, `favicon.png` are the Expo template
placeholders. Replace them with branded 1024 × 1024 PNGs before shipping.

import argparse
import os

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    FloatObject,
    NameObject,
    TextStringObject,
)
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "public", "cv.pdf")
PHOTO = os.path.join(ROOT, "c", "ahan.jpeg")

LINKS_OLD = (
    "q\n"
    "1 0 0 1 57.02362 692.5354 cm\n"
    "q\n"
    "BT 1 0 0 1 0 17 Tm 13 TL /F1 9 Tf .121569 .141176 .188235 rg (Website: ) Tj "
    ".054902 .478431 .419608 rg (https://my-portfolio-delta-dun-65.vercel.app) Tj "
    ".121569 .141176 .188235 rg ( ) Tj ( ) Tj ( ) Tj ( ) Tj (GitHub: ) Tj "
    ".054902 .478431 .419608 rg (github.com/farhanlabibahan) Tj "
    ".121569 .141176 .188235 rg ( ) Tj ( ) Tj ( ) Tj ( ) Tj (YouTube:) Tj T* "
    ".054902 .478431 .419608 rg (youtube.com/@farhanlabibahan) Tj T* ET\n"
    "Q\n"
    "Q"
)

LINKS_NEW = (
    "q\n"
    "1 0 0 1 57.02362 692.5354 cm\n"
    "q\n"
    "BT 1 0 0 1 0 17 Tm 13 TL /F1 9 Tf .121569 .141176 .188235 rg (Website: ) Tj "
    ".054902 .478431 .419608 rg (farhanlabibahan.github.io/portfolio) Tj T* ET\n"
    "Q\n"
    "Q\n"
    "q\n"
    "1 0 0 1 57.02362 679.5354 cm\n"
    "q\n"
    "BT 1 0 0 1 0 17 Tm 13 TL /F1 9 Tf .121569 .141176 .188235 rg (GitHub: ) Tj "
    ".054902 .478431 .419608 rg (github.com/farhanlabibahan) Tj T* ET\n"
    "Q\n"
    "Q\n"
    "q\n"
    "1 0 0 1 57.02362 666.5354 cm\n"
    "q\n"
    "BT 1 0 0 1 0 17 Tm 13 TL /F1 9 Tf .121569 .141176 .188235 rg (YouTube: ) Tj "
    ".054902 .478431 .419608 rg (youtube.com/@farhanlabibahan) Tj T* ET\n"
    "Q\n"
    "Q"
)


def fix_link_annotations(page):
    annots = page.get("/Annots")
    if not annots:
        return
    uri_map = {
        "https://my-portfolio-delta-dun-65.vercel.app": (
            "https://farhanlabibahan.github.io/portfolio"
        ),
        "https://www.youtube.com/@farhanlabibahan": (
            "https://www.youtube.com/@farhanlabibahan"
        ),
    }
    rects = {
        "https://farhanlabibahan.github.io/portfolio": [
            94.53562, 707.7354, 230.1356, 718.5354,
        ],
        "https://github.com/farhanlabibahan": [94.53562, 694.7354, 205.6356, 705.5354],
        "https://www.youtube.com/@farhanlabibahan": [
            94.53562, 681.7354, 222.2356, 692.5354,
        ],
    }
    for annot in annots:
        obj = annot.get_object()
        action = obj.get("/A")
        uri = str(action.get("/URI")) if action else None
        if not uri:
            continue
        new_uri = uri_map.get(uri, uri)
        if uri.startswith("https://my-portfolio-delta-dun-65.vercel.app"):
            new_uri = "https://farhanlabibahan.github.io/portfolio"
        action[NameObject("/URI")] = TextStringObject(new_uri)
        if new_uri in rects:
            obj[NameObject("/Rect")] = ArrayObject(
                [FloatObject(v) for v in rects[new_uri]]
            )


def main():
    parser = argparse.ArgumentParser(description="Edit the CV in place")
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--photo", default=PHOTO)
    parser.add_argument("-o", "--output", default=BASE)
    parser.add_argument("--tmp-overlay", default="/tmp/cv_overlay.pdf")
    args = parser.parse_args()

    reader = PdfReader(args.base)

    p1 = reader.pages[0]
    raw1 = p1["/Contents"].get_object().get_data()
    raw1 = raw1.replace(b"(Farhan Labib Ahan) Tj", b"(Farhan Labib ) Tj")
    assert b"(Farhan Labib Ahan)" not in raw1
    assert LINKS_OLD.encode() in raw1, "links line not found"
    raw1 = raw1.replace(LINKS_OLD.encode(), LINKS_NEW.encode())
    s1 = DecodedStreamObject()
    s1.set_data(raw1)
    p1[NameObject("/Contents")] = s1
    fix_link_annotations(p1)

    p2 = reader.pages[1]
    raw2 = p2["/Contents"].get_object().get_data()
    for phrase in ["8th Place", "11th Place", "12th Place", "Finalist"]:
        old = f"\\227 {phrase}) Tj".encode()
        new = f"\\227 ) Tj /F2 9.5 Tf ({phrase}) Tj /F1 9.5 Tf".encode()
        assert old in raw2, phrase
        raw2 = raw2.replace(old, new)
    s2 = DecodedStreamObject()
    s2.set_data(raw2)
    p2[NameObject("/Contents")] = s2

    cx, cy, r = 510, 752, 45
    c = canvas.Canvas(args.tmp_overlay, pagesize=A4)
    path = c.beginPath()
    path.circle(cx, cy, r)
    c.saveState()
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(
        args.photo,
        cx - r,
        cy - r,
        width=2 * r,
        height=2 * r,
        preserveAspectRatio=True,
        anchor="c",
    )
    c.restoreState()
    c.showPage()
    c.save()
    p1.merge_page(PdfReader(args.tmp_overlay).pages[0])

    writer = PdfWriter()
    for p in reader.pages:
        writer.add_page(p)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()

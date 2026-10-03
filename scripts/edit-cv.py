import argparse
import os
import tempfile

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
BASE = os.path.join(ROOT, "public", "Farhan Labib CV.pdf")
PHOTO = os.path.join(ROOT, "public", "ahan.jpeg")

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


def remove_project_from_stream(raw, title_frag, link_frag):
    ti = raw.find(title_frag)
    if ti == -1:
        print(f"project not found (already removed?), skipping: {title_frag[:40]!r}")
        return raw
    block_start = raw.rfind(b"\r\nq\r\n1 0 0 1 ", 0, ti)
    li = raw.find(link_frag, ti)
    link_tail = raw.find(b"Q\r\nQ", li)
    end = link_tail + len(b"Q\r\nQ")
    if block_start == -1 or li == -1 or link_tail == -1:
        print(f"could not locate project block boundaries: {title_frag[:40]!r}")
        return raw
    return raw[:block_start] + raw[end:]


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
    parser.add_argument("--tmp-overlay", default=os.path.join(
        tempfile.gettempdir(), "cv_overlay.pdf"
    ))
    args = parser.parse_args()

    reader = PdfReader(args.base)

    p1 = reader.pages[0]
    raw1 = p1["/Contents"].get_object().get_data()
    raw1 = raw1.replace(b"(Farhan Labib Ahan) Tj", b"(Farhan Labib ) Tj")
    assert b"(Farhan Labib Ahan)" not in raw1
    if LINKS_OLD.encode() in raw1:
        raw1 = raw1.replace(LINKS_OLD.encode(), LINKS_NEW.encode())
    else:
        print("links already in new format, skipping")
    raw1 = remove_project_from_stream(
        raw1,
        b"(SUST Onsite ",
        b"github.com/Raihri/sust_onsite) Tj",
    )
    raw1 = remove_project_from_stream(
        raw1,
        b"(AgriSense AI )",
        b"AgriSense/tree/Ahan) Tj",
    )
    s1 = DecodedStreamObject()
    s1.set_data(raw1)
    p1[NameObject("/Contents")] = s1
    fix_link_annotations(p1)

    already_tidied = b"Notre Dame Yoga" not in raw1 and b"Res Judicata" in raw1
    if len(reader.pages) > 1:
        p2 = reader.pages[1]
        raw2 = p2["/Contents"].get_object().get_data()
        for phrase in ["8th Place", "11th Place", "12th Place", "Finalist"]:
            old = f"\\227 {phrase}) Tj".encode()
            new = f"\\227 ) Tj /F2 9.5 Tf ({phrase}) Tj /F1 9.5 Tf".encode()
            if old in raw2:
                raw2 = raw2.replace(old, new)
            else:
                print(f"badge already formatted, skipping: {phrase}")
        if b"Res Judicata" not in raw2:
            anchor = raw2.find(b"(Finalist) Tj /F1 9.5 Tf T* ET\nQ\nQ\n")
            if anchor == -1:
                print("could not locate achievements tail, skipping legal tech entry")
            else:
                insert_at = anchor + len(b"(Finalist) Tj /F1 9.5 Tf T* ET\nQ\nQ\n")
                block = (
                    b"q\n1 0 0 1 57.02362 681.5354 cm\n"
                    b"q\n.121569 .141176 .188235 rg\n"
                    b"BT 1 0 0 1 0 4.5 Tm /F1 9.5 Tf 14 TL "
                    b"(National ADLASB Legal Tech Hackathon 2026 (Res Judicata Digitalis) \\227 ) Tj "
                    b"/F2 9.5 Tf (Grand Champion) Tj /F1 9.5 Tf T* ET\nQ\nQ\n"
                )
                raw2 = raw2[:insert_at] + block + raw2[insert_at:]
        else:
            print("legal tech hackathon entry already present, skipping")
        s2 = DecodedStreamObject()
        s2.set_data(raw2)
        p2[NameObject("/Contents")] = s2

    # --- Page 0 tidy: drop the yoga club experience + Video & Motion skill,
    # close the gap that leaves, then pull Achievements up onto page 0 so it
    # follows the projects instead of stranding them on their own page. ---
    if not already_tidied:
        for y in ("578.5354", "571.5354", "549.5354", "519.5354", "409.5354"):
            marker = f"q\n1 0 0 1 57.02362 {y} cm\n".encode()
            s = raw1.find(marker)
            if s != -1:
                e = raw1.find(b"\nQ\nQ\n", s)
                if e != -1:
                    raw1 = raw1[:s] + raw1[e + len(b"\nQ\nQ\n"):]
                else:
                    print(f"block end not found for y={y}")
            else:
                print(f"block already removed, skipping y={y}")

        for old_y, new_y in [
            ("486.5354", "578.5354"),
            ("479.5354", "571.5354"),
            ("460.5354", "552.5354"),
            ("443.5354", "535.5354"),
            ("426.5354", "518.5354"),
            ("376.5354", "485.5354"),
            ("369.5354", "478.5354"),
            ("347.5354", "456.5354"),
            ("317.5354", "426.5354"),
            ("302.5354", "411.5354"),
            ("280.5354", "389.5354"),
            ("250.5354", "359.5354"),
            ("235.5354", "344.5354"),
        ]:
            old = f"1 0 0 1 57.02362 {old_y} cm".encode()
            if old in raw1:
                raw1 = raw1.replace(old, f"1 0 0 1 57.02362 {new_y} cm".encode(), 1)

        s1b = DecodedStreamObject()
        s1b.set_data(raw1)
        p1[NameObject("/Contents")] = s1b

        # Cut the whole Achievements section off page 2 and re-place it on page 1.
        if len(reader.pages) > 1:
            start = raw2.find(b"q\n1 0 0 1 57.02362 775.5354 cm\n")
            end = raw2.find(b"\nQ\nQ\n", raw2.find(b"(Grand Champion)"))
        else:
            start, end = -1, -1
        if start != -1 and end != -1:
            end += len(b"\nQ\nQ\n")
            block = raw2[start:end]
            raw2 = raw2[:start] + raw2[end:]
            for old_y, new_y in [
                ("775.5354", "304.5354"),
                ("768.5354", "297.5354"),
                ("749.5354", "278.5354"),
                ("732.5354", "261.5354"),
                ("715.5354", "244.5354"),
                ("698.5354", "227.5354"),
                ("681.5354", "210.5354"),
            ]:
                block = block.replace(
                    f"1 0 0 1 57.02362 {old_y} cm".encode(),
                    f"1 0 0 1 57.02362 {new_y} cm".encode(),
                )
            raw1 += block + b"\n"
            s1c = DecodedStreamObject()
            s1c.set_data(raw1)
            p1[NameObject("/Contents")] = s1c
        else:
            print("achievements block not found, leaving page 2 layout alone")

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
    merged_page_one = raw1 is not None and b"(Grand Champion)" in raw1
    for i, p in enumerate(reader.pages):
        # When Achievements moved up onto page 1, page 2 is empty — drop it.
        if merged_page_one and i == 1:
            continue
        writer.add_page(p)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()

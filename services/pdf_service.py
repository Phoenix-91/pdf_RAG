import pymupdf

from config import Config


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def extract_pages(filepath):
    doc = pymupdf.open(filepath)
    try:
        if doc.needs_pass:
            raise ValueError("This PDF is password-protected and cannot be read.")

        pages = []
        for index in range(doc.page_count):
            text = doc.load_page(index).get_text("text").strip()
            if text:
                pages.append({"page": index + 1, "text": text})

        if not pages:
            raise ValueError("No selectable text found. This PDF may be a scanned image.")

        return {"pages": pages, "page_count": doc.page_count}
    finally:
        doc.close()

"""
resume_parser.py — Extract raw text from a PDF using PyMuPDF.
"""

import io
import fitz  # PyMuPDF


MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def extract_text_from_pdf(file_bytes: bytes, filename: str = "upload.pdf") -> str:
    """
    Extract plain text from a PDF byte string.

    Raises ValueError for invalid, empty, or oversized PDFs.
    """
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File too large. Maximum allowed size is 5 MB.")

    if not file_bytes:
        raise ValueError("Empty file received.")

    # Check PDF magic bytes
    if not file_bytes[:4] == b"%PDF":
        raise ValueError("Invalid file type. Only PDF files are accepted.")

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise ValueError("Unable to open PDF. The file may be corrupted.")

    if doc.page_count == 0:
        raise ValueError("PDF has no pages.")

    text_parts = []
    links = []
    for page in doc:
        text_parts.append(page.get_text("text"))
        for link in page.get_links():
            uri = link.get("uri")
            if uri:
                links.append(uri)

    doc.close()

    full_text = "\n".join(text_parts).strip()
    if links:
        full_text = (full_text + "\n\n" + " ".join(links)).strip()

    if not full_text:
        raise ValueError(
            "Could not extract text from this PDF. "
            "It may be a scanned image. Please use a text-based PDF."
        )

    return full_text

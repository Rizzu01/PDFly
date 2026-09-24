# PDFly

PDFly is a next-generation document workspace focused on fast, private and simple PDF workflows.

## Product direction

- Browser-first processing for lightweight PDF operations
- Temporary server processing for heavy workloads
- No permanent PDF storage by default
- Premium, minimal UI
- AI document workspace as a later layer

## Stack

- Next.js + React + TypeScript
- Custom CSS design system
- pdf-lib for client-side PDF operations
- PDF.js for browser PDF rendering
- Tesseract.js for browser OCR
- FastAPI + PyMuPDF processing API
- Supabase for auth and product data (planned)

## MVP roadmap

1. Premium landing page and upload surface
2. Merge PDF
3. Split PDF
4. Compress PDF
5. Reorder / delete pages
6. PDF viewer/editor foundation
7. Conversion tools
8. Browser OCR extraction
9. Temporary processing API — implemented
10. Authentication and usage limits
11. Searchable-PDF reconstruction — API implemented
12. AI Document Copilot

## Processing API

The optional FastAPI service handles heavier PDF workloads without permanent storage.

### Local development

```bash
cd api
python -m venv .venv
# Windows PowerShell
.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```text
GET http://localhost:8000/health
```

Processing endpoints:

- `POST /process/ocr` — create a searchable PDF from a PDF or image
- `POST /process/compress` — server-side PDF optimization
- `POST /process/pdf-to-jpg` — render every PDF page to JPGs inside a ZIP

### Docker

```bash
docker build -t pdfly-processing ./api
docker run --rm -p 8000:8000 -e FRONTEND_ORIGIN=http://localhost:3000 pdfly-processing
```

The Docker image includes English and Hindi Tesseract language data for OCR.

## OCR

The current OCR workspace supports scanned images and PDFs in the browser, with English and Hindi recognition, page-by-page PDF rendering, editable extracted text, copy, and `.txt` export. The processing API additionally supports true searchable-PDF reconstruction with a hidden OCR text layer.

## Privacy model

PDFly processes files ephemerally whenever possible. The processing API keeps uploaded bytes in memory during the request and writes generated files only to temporary runtime storage. Generated response files are scheduled for deletion after the response. PDF content is not written to a database or permanent object storage.

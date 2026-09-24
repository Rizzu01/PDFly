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
- FastAPI/Python worker layer (planned)
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
9. Temporary processing API
10. Authentication and usage limits
11. Searchable-PDF reconstruction
12. AI Document Copilot

## OCR

The current OCR workspace supports scanned images and PDFs in the browser, with English and Hindi recognition, page-by-page PDF rendering, editable extracted text, copy, and `.txt` export. It uses PDF.js for rendering and Tesseract.js for recognition. Searchable-PDF reconstruction is intentionally reserved for the heavier processing engine.

## Privacy model

PDFly should process files ephemerally whenever possible. Files should not be persisted unless the user explicitly opts into a future cloud workspace.

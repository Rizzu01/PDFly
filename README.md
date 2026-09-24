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
- FastAPI/Python worker layer (planned)
- Supabase for auth and product data (planned)

## MVP roadmap

1. Premium landing page and upload surface
2. Merge PDF
3. Split PDF
4. Compress PDF
5. Reorder / delete pages
6. PDF viewer/editor foundation
7. Temporary processing API
8. Authentication and usage limits
9. OCR and conversion tools
10. AI Document Copilot

## Privacy model

PDFly should process files ephemerally whenever possible. Files should not be persisted unless the user explicitly opts into a future cloud workspace.

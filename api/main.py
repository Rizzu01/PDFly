import os
import tempfile
import zipfile
from pathlib import Path

import fitz
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

APP_VERSION = "0.1.0"
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

app = FastAPI(title="PDFly Processing API", version=APP_VERSION)

origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _cleanup(path: str) -> None:
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass


async def _read_upload(upload: UploadFile, allowed_extensions: set[str]) -> bytes:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(status_code=415, detail="Unsupported file type.")

    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_UPLOAD_MB} MB upload limit.")
    return data


def _response(path: str, filename: str, media_type: str, background_tasks: BackgroundTasks) -> FileResponse:
    background_tasks.add_task(_cleanup, path)
    return FileResponse(path, media_type=media_type, filename=filename)


def _rgb_pixmap(page: fitz.Page) -> fitz.Pixmap:
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    if pix.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    return pix


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "pdfly-processing", "version": APP_VERSION}


@app.post("/process/ocr")
async def ocr(file: UploadFile = File(...), language: str = "eng", background_tasks: BackgroundTasks = None):
    if language not in {"eng", "hin+eng", "hin"}:
        raise HTTPException(status_code=400, detail="Supported OCR languages: eng, hin, hin+eng.")

    data = await _read_upload(file, {".pdf", ".png", ".jpg", ".jpeg", ".webp"})
    suffix = Path(file.filename or "").suffix.lower()

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as output:
            output_path = output.name

        if suffix == ".pdf":
            source = fitz.open(stream=data, filetype="pdf")
            result = fitz.open()
            try:
                for page in source:
                    pix = _rgb_pixmap(page)
                    ocr_bytes = pix.pdfocr_tobytes(language=language)
                    ocr_page = fitz.open(stream=ocr_bytes, filetype="pdf")
                    try:
                        result.insert_pdf(ocr_page)
                    finally:
                        ocr_page.close()
                result.save(output_path, garbage=4, deflate=True)
            finally:
                result.close()
                source.close()
        else:
            pix = fitz.Pixmap(data)
            if pix.n != 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            pdf_bytes = pix.pdfocr_tobytes(language=language)
            with open(output_path, "wb") as output_file:
                output_file.write(pdf_bytes)

        return _response(output_path, "PDFly-searchable.pdf", "application/pdf", background_tasks)
    except Exception as exc:
        if "output_path" in locals():
            _cleanup(output_path)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


@app.post("/process/compress")
async def compress(file: UploadFile = File(...), level: str = "balanced", background_tasks: BackgroundTasks = None):
    if level not in {"light", "balanced", "strong"}:
        raise HTTPException(status_code=400, detail="Compression level must be light, balanced, or strong.")

    data = await _read_upload(file, {".pdf"})
    output_path = ""
    try:
        source = fitz.open(stream=data, filetype="pdf")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as output:
            output_path = output.name

        save_options = {"garbage": 2, "deflate": True}
        if level in {"balanced", "strong"}:
            save_options.update({"clean": True, "deflate_images": True, "deflate_fonts": True})
        if level == "strong":
            save_options["garbage"] = 4

        source.save(output_path, **save_options)
        source.close()
        return _response(output_path, "PDFly-compressed.pdf", "application/pdf", background_tasks)
    except Exception as exc:
        _cleanup(output_path)
        raise HTTPException(status_code=500, detail=f"Compression failed: {exc}") from exc


@app.post("/process/pdf-to-jpg")
async def pdf_to_jpg(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    data = await _read_upload(file, {".pdf"})
    output_path = ""
    try:
        source = fitz.open(stream=data, filetype="pdf")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as output:
            output_path = output.name

        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for index, page in enumerate(source, start=1):
                pix = _rgb_pixmap(page)
                jpg_bytes = pix.tobytes("jpg", jpg_quality=90)
                archive.writestr(f"page-{index}.jpg", jpg_bytes)
        source.close()

        return _response(output_path, "PDFly-pages.zip", "application/zip", background_tasks)
    except Exception as exc:
        _cleanup(output_path)
        raise HTTPException(status_code=500, detail=f"PDF to JPG conversion failed: {exc}") from exc

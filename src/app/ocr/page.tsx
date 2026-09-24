"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Languages,
  Lock,
  ScanText,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { createOcrPdf, downloadBlob } from "@/lib/processing-api";
import "./ocr.module.css";

async function renderPdfPages(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
  const pages: HTMLCanvasElement[] = [];

  for (let index = 1; index <= pdf.numPages; index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create a rendering surface.");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push(canvas);
  }
  return pages;
}

export default function OcrPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<"eng" | "hin" | "hin+eng">("eng");
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const acceptFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    setError(""); setText(""); setProgress(0); setStatus("");
    if (!(nextFile.type === "application/pdf" || nextFile.type.startsWith("image/"))) {
      setError("Please choose a PDF, JPG, PNG, WEBP, or another supported image."); return;
    }
    setFile(nextFile);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]); event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]);
  };

  const runOcr = async () => {
    if (!file) return;
    setIsRunning(true); setError(""); setText(""); setProgress(0.03); setCopied(false);
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      setStatus("Starting OCR engine…");
      worker = await createWorker(language, 1, {
        logger: (message) => {
          if (message.status) setStatus(message.status.replace(/\b\w/g, (char) => char.toUpperCase()));
          if (typeof message.progress === "number") setProgress(Math.min(0.99, message.progress));
        },
      });
      const sources = file.type === "application/pdf" ? await renderPdfPages(file) : [file];
      const results: string[] = [];
      for (let index = 0; index < sources.length; index += 1) {
        setStatus(file.type === "application/pdf" ? `Reading page ${index + 1} of ${sources.length}…` : "Reading image…");
        const result = await worker.recognize(sources[index]);
        const pageText = result.data.text.trim();
        if (pageText) results.push(file.type === "application/pdf" ? `--- Page ${index + 1} ---\n${pageText}` : pageText);
        setProgress((index + 1) / sources.length);
      }
      const output = results.join("\n\n").trim();
      setText(output || "No readable text was detected. Try a sharper scan or a different language.");
      setStatus(output ? "OCR complete" : "No text detected");
    } catch (ocrError) {
      console.error(ocrError); setError("OCR could not process this file. Try a clearer scan or a smaller PDF."); setStatus("");
    } finally {
      if (worker) await worker.terminate(); setIsRunning(false);
    }
  };

  const createSearchablePdf = async () => {
    if (!file) return;
    setIsCreatingPdf(true); setError(""); setStatus("Creating searchable PDF…");
    try {
      const blob = await createOcrPdf(file, language);
      downloadBlob(blob, "PDFly-searchable.pdf");
      setStatus("Searchable PDF ready");
    } catch (pdfError) {
      console.error(pdfError);
      setError(pdfError instanceof Error ? pdfError.message : "Could not create the searchable PDF.");
      setStatus("");
    } finally {
      setIsCreatingPdf(false);
    }
  };

  const copyText = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadText = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `PDFly-${file?.name.replace(/\.[^/.]+$/, "") || "ocr"}.txt`);
  };

  const reset = () => {
    setFile(null); setText(""); setProgress(0); setStatus(""); setError(""); setCopied(false);
  };

  return (
    <main className="site-shell">
      <div className="container">
        <a className="back-link" href="/"><ArrowLeft size={16} /> Back to PDFly</a>
        <section className="tool-hero">
          <span className="eyebrow"><ScanText size={14} /> OCR workspace</span>
          <h1>Turn scans into <span>usable text.</span></h1>
          <p>Extract editable text or create a searchable PDF from scanned documents.</p>
        </section>

        {!file ? (
          <section className={`dropzone ${isDragging ? "dropzone-active" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop a scan here</h2>
            <p>PDF, JPG, PNG, WEBP and common image formats</p>
            <button className="dark-button" type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Choose file <Upload size={16} /></button>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" hidden onChange={handleInput} />
          </section>
        ) : (
          <section className="ocr-workspace">
            <aside className="ocr-sidebar">
              <div className="file-card">
                <div className="file-icon">{file.type === "application/pdf" ? <FileText size={20} /> : <ImageIcon size={20} />}</div>
                <div className="file-copy"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type === "application/pdf" ? "PDF" : "Image"}</span></div>
                <button className="icon-button" onClick={reset} disabled={isRunning || isCreatingPdf} aria-label="Remove file"><X size={16} /></button>
              </div>
              <label className="field-label" htmlFor="ocr-language"><Languages size={15} /> Recognition language</label>
              <select id="ocr-language" value={language} onChange={(event) => setLanguage(event.target.value as "eng" | "hin" | "hin+eng")} disabled={isRunning || isCreatingPdf}>
                <option value="eng">English</option><option value="hin">Hindi</option><option value="hin+eng">Hindi + English</option>
              </select>
              <button className="dark-button full-button" onClick={runOcr} disabled={isRunning || isCreatingPdf}>{isRunning ? "Processing…" : "Run OCR"}<ScanText size={17} /></button>
              <button className="ghost-button full-button" onClick={createSearchablePdf} disabled={isRunning || isCreatingPdf}>{isCreatingPdf ? "Creating PDF…" : "Create searchable PDF"}<FileText size={17} /></button>
              <div className="sidebar-note"><ShieldCheck size={16} /><span>Heavy PDF processing is temporary and automatically cleaned up.</span></div>
            </aside>

            <div className="ocr-main">
              <div className="ocr-toolbar">
                <div><span className="eyebrow">Extracted content</span><strong>{status || "Ready for OCR"}</strong></div>
                <div className="toolbar-actions">
                  <button className="ghost-button" onClick={copyText} disabled={!text || isRunning || isCreatingPdf}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</button>
                  <button className="ghost-button" onClick={downloadText} disabled={!text || isRunning || isCreatingPdf}><Download size={16} /> Download .txt</button>
                </div>
              </div>
              {isRunning && <div className="progress-wrap"><div className="progress-track"><span style={{ width: `${Math.max(4, progress * 100)}%` }} /></div><small>{Math.round(progress * 100)}%</small></div>}
              {error && <div className="error-box">{error}</div>}
              <textarea className="ocr-output" value={text} onChange={(event) => setText(event.target.value)} placeholder="Your OCR text will appear here…" spellCheck={false} />
              {!text && !isRunning && !error && <div className="empty-output"><div className="empty-icon"><Zap size={18} /></div><strong>Ready when you are</strong><p>OCR scans the document page-by-page and gives you editable text.</p></div>}
            </div>
          </section>
        )}

        <div className="trust-row"><span><Lock size={15} /> Browser-first processing</span><span><ShieldCheck size={15} /> No permanent file storage</span><span><Zap size={15} /> Searchable PDF export</span></div>
        <p className="ocr-footnote">Text extraction runs locally. Searchable-PDF creation uses the temporary processing engine and is removed after delivery.</p>
      </div>
    </main>
  );
}

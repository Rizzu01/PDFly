"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, FileImage, FileText, Image as ImageIcon, Lock, ShieldCheck, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { convertPdfToJpg as convertPdfToJpgOnServer, downloadBlob } from "@/lib/processing-api";
import styles from "./convert.module.css";

type OutputMode = "pdf-to-jpg" | "jpg-to-pdf";
type ImageFile = File & { previewUrl?: string };

export default function ConvertPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<OutputMode>("pdf-to-jpg");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = mode === "pdf-to-jpg" ? "application/pdf" : "image/jpeg,image/png,image/webp";
  const hasFiles = mode === "pdf-to-jpg" ? Boolean(pdfFile) : images.length > 0;
  const previews = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images]);

  const reset = () => {
    previews.forEach(({ url }) => URL.revokeObjectURL(url));
    setPdfFile(null);
    setImages([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const loadFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    setError("");
    if (mode === "pdf-to-jpg") {
      const file = files[0];
      if (!file || file.type !== "application/pdf") { setError("Please choose a PDF file only."); return; }
      setPdfFile(file);
      setImages([]);
    } else {
      const valid = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
      if (!valid.length) { setError("Please choose JPG, PNG or WebP images."); return; }
      setImages(valid as ImageFile[]);
      setPdfFile(null);
    }
  };

  const convertImagesToPdf = async () => {
    const output = await PDFDocument.create();
    for (const image of images) {
      const bytes = new Uint8Array(await image.arrayBuffer());
      let embedded;
      if (image.type === "image/jpeg") embedded = await output.embedJpg(bytes);
      else if (image.type === "image/png") embedded = await output.embedPng(bytes);
      else throw new Error("WebP input is not supported in this browser-only exporter yet. Use JPG or PNG.");
      const scale = Math.min(1, 595 / embedded.width, 842 / embedded.height);
      const page = output.addPage([embedded.width * scale, embedded.height * scale]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width * scale, height: embedded.height * scale });
    }
    const bytes = await output.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "PDFly-images.pdf");
  };

  const convert = async () => {
    if (!hasFiles || busy) return;
    setBusy(true); setError("");
    try {
      if (mode === "jpg-to-pdf") {
        await convertImagesToPdf();
      } else if (pdfFile) {
        const blob = await convertPdfToJpgOnServer(pdfFile);
        downloadBlob(blob, "PDFly-pages.zip");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed. Please try another file.");
    } finally { setBusy(false); }
  };

  return (
    <main className={styles.shell}>
      <nav className="nav container">
        <a className="brand" href="/"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      <section className="hero container tool-page-hero">
        <div className="eyebrow"><FileImage size={15} /> PDF converter</div>
        <h1>PDF ↔ images,<br /><span>made simple.</span></h1>
        <p className="hero-copy">Turn JPG and PNG images into a clean PDF, or export every PDF page as JPG. Heavy conversion is processed temporarily by PDFly.</p>

        <div className={styles.modeSwitch} role="tablist" aria-label="Conversion type">
          <button className={mode === "pdf-to-jpg" ? styles.active : ""} onClick={() => { setMode("pdf-to-jpg"); reset(); }}><FileText size={16} /> PDF to JPG</button>
          <button className={mode === "jpg-to-pdf" ? styles.active : ""} onClick={() => { setMode("jpg-to-pdf"); reset(); }}><ImageIcon size={16} /> JPG / PNG to PDF</button>
        </div>

        {!hasFiles ? (
          <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFiles(e.dataTransfer.files); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}>
            <input ref={inputRef} hidden type="file" accept={accept} multiple={mode === "jpg-to-pdf"} onChange={(e) => e.target.files && loadFiles(e.target.files)} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>{mode === "pdf-to-jpg" ? "Drop your PDF here" : "Drop your images here"}</h2>
            <p>{mode === "pdf-to-jpg" ? "PDF pages will be exported as JPG files" : "JPG or PNG · multiple files supported"}</p>
            <span className="file-note">Private by default · Temporary processing only</span>
          </div>
        ) : (
          <div className={styles.workspace}>
            <div className={styles.filebar}>
              <div className={styles.fileMeta}>
                {mode === "pdf-to-jpg" ? <FileText size={18} /> : <ImageIcon size={18} />}
                <div><strong>{mode === "pdf-to-jpg" ? pdfFile?.name : `${images.length} image${images.length > 1 ? "s" : ""}`}</strong><span>{mode === "pdf-to-jpg" ? `${((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB` : "Ready to combine"}</span></div>
              </div>
              <button className="icon-button" onClick={reset} aria-label="Remove files"><X size={18} /></button>
            </div>
            {mode === "jpg-to-pdf" && <div className={styles.previewGrid}>{previews.map(({ file, url }, index) => <div className={styles.preview} key={`${file.name}-${index}`}><img src={url} alt="" /><span>{index + 1}</span></div>)}</div>}
            <div className={styles.actionRow}><button className="dark-button large" onClick={convert} disabled={busy}>{busy ? "Processing…" : mode === "pdf-to-jpg" ? "Convert to JPG" : "Create PDF"}</button><button className="ghost-button" onClick={reset}>Start over</button></div>
            {mode === "pdf-to-jpg" && <p className="compression-note">PDF → JPG uses 1 processing job from your daily allowance. JPG/PNG → PDF stays browser-side.</p>}
          </div>
        )}
        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Temporary processing</span><span><ShieldCheck size={14} /> Secure by design</span></div>
      </section>
    </main>
  );
}

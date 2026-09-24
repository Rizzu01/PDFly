"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, FileImage, FileText, Image as ImageIcon, Lock, ShieldCheck, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";
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
  const accept = mode === "pdf-to-jpg" ? "application/pdf" : "image/jpeg,image/png";
  const hasFiles = mode === "pdf-to-jpg" ? Boolean(pdfFile) : images.length > 0;
  const previews = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images]);

  const reset = () => { previews.forEach(({ url }) => URL.revokeObjectURL(url)); setPdfFile(null); setImages([]); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  const loadFiles = (list: FileList | File[]) => {
    const files = Array.from(list); setError("");
    if (mode === "pdf-to-jpg") { const file = files[0]; if (!file || file.type !== "application/pdf") { setError("Please choose a PDF file only."); return; } setPdfFile(file); setImages([]); }
    else { const valid = files.filter((file) => ["image/jpeg", "image/png"].includes(file.type)); if (!valid.length) { setError("Please choose JPG or PNG images."); return; } setImages(valid as ImageFile[]); setPdfFile(null); }
  };

  const download = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 500); };

  const convertPdfToJpg = async (file: File) => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes, disableWorker: true } as any);
    const pdf = await loadingTask.promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not create a canvas for this PDF.");
      await page.render({ canvasContext: context, viewport } as any).promise;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create JPG.")), "image/jpeg", 0.92));
      download(blob, `PDFly-page-${pageNumber}.jpg`);
      page.cleanup();
    }
    await pdf.destroy();
  };

  const convertImagesToPdf = async () => {
    const output = await PDFDocument.create();
    for (const image of images) {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const embedded = image.type === "image/jpeg" ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      const scale = Math.min(1, 595 / embedded.width, 842 / embedded.height);
      const page = output.addPage([embedded.width * scale, embedded.height * scale]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width * scale, height: embedded.height * scale });
    }
    const bytes = await output.save({ useObjectStreams: true });
    download(new Blob([bytes], { type: "application/pdf" }), "PDFly-images.pdf");
  };

  const convert = async () => {
    if (!hasFiles || busy) return;
    setBusy(true); setError("");
    try { if (mode === "jpg-to-pdf") await convertImagesToPdf(); else if (pdfFile) await convertPdfToJpg(pdfFile); }
    catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Conversion failed. Please try another file."); }
    finally { setBusy(false); }
  };

  return <main className={styles.shell}><nav className="nav container"><a className="brand" href="/"><span className="brand-mark"><span /></span><span>PDFly</span></a><a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a></nav>
    <section className="hero container tool-page-hero"><div className="eyebrow"><FileImage size={15} /> PDF converter</div><h1>PDF ↔ images,<br /><span>made simple.</span></h1><p className="hero-copy">Convert PDFs and images directly in your browser. No server upload required.</p>
      <div className={styles.modeSwitch} role="tablist" aria-label="Conversion type"><button className={mode === "pdf-to-jpg" ? styles.active : ""} onClick={() => { setMode("pdf-to-jpg"); reset(); }}><FileText size={16} /> PDF to JPG</button><button className={mode === "jpg-to-pdf" ? styles.active : ""} onClick={() => { setMode("jpg-to-pdf"); reset(); }}><ImageIcon size={16} /> JPG / PNG to PDF</button></div>
      {!hasFiles ? <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFiles(e.dataTransfer.files); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}><input ref={inputRef} hidden type="file" accept={accept} multiple={mode === "jpg-to-pdf"} onChange={(e) => e.target.files && loadFiles(e.target.files)} /><div className="upload-icon"><Upload size={22} /></div><h2>{mode === "pdf-to-jpg" ? "Drop your PDF here" : "Drop your images here"}</h2><p>{mode === "pdf-to-jpg" ? "Every page downloads as a JPG" : "JPG or PNG · multiple files supported"}</p><span className="file-note">Private by default · Browser-only processing</span></div> :
      <div className={styles.workspace}><div className={styles.filebar}><div className={styles.fileMeta}>{mode === "pdf-to-jpg" ? <FileText size={18} /> : <ImageIcon size={18} />}<div><strong>{mode === "pdf-to-jpg" ? pdfFile?.name : `${images.length} image${images.length > 1 ? "s" : ""}`}</strong><span>{mode === "pdf-to-jpg" ? `${((pdfFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB` : "Ready to combine"}</span></div></div><button className="icon-button" onClick={reset} aria-label="Remove files"><X size={18} /></button></div>{mode === "jpg-to-pdf" && <div className={styles.previewGrid}>{previews.map(({ file, url }, index) => <div className={styles.preview} key={`${file.name}-${index}`}><img src={url} alt="" /><span>{index + 1}</span></div>)}</div>}<div className={styles.actionRow}><button className="dark-button large" onClick={convert} disabled={busy}>{busy ? "Processing…" : mode === "pdf-to-jpg" ? "Convert to JPG" : "Create PDF"}</button><button className="ghost-button" onClick={reset}>Start over</button></div>{mode === "pdf-to-jpg" && <p className="compression-note">Pages download individually as JPG files. Your PDF stays in this browser.</p>}</div>}
      {error && <p role="alert" className="error-message">{error}</p>}<div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Browser-first</span><span><ShieldCheck size={14} /> Secure by design</span></div></section></main>;
}

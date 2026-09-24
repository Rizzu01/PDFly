"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, Lock, Maximize2, Minus, Plus, ShieldCheck, Upload, X, Zap } from "lucide-react";
import styles from "./viewer.module.css";

export default function PdfViewerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");

  const loadFile = useCallback((incoming: File | null) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf") { setError("Please choose a PDF file only."); return; }
    if (url) URL.revokeObjectURL(url);
    const nextUrl = URL.createObjectURL(incoming);
    setFile(incoming); setUrl(nextUrl); setPage(1); setPageInput("1"); setZoom(100); setError("");
  }, [url]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const navigate = (nextPage: number) => {
    const safe = Math.max(1, nextPage);
    setPage(safe); setPageInput(String(safe));
  };

  const viewerSrc = url ? `${url}#page=${page}&zoom=${zoom}` : "";

  return (
    <main className={styles.shell}>
      <nav className="nav container">
        <a className="brand" href="/" aria-label="PDFly home"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      {!file ? (
        <section className="hero container tool-page-hero">
          <div className="eyebrow"><FileText size={15} /> PDF viewer</div>
          <h1>Read PDFs,<br /><span>without the clutter.</span></h1>
          <p className="hero-copy">Open a PDF in a focused workspace with page navigation, zoom controls and quick download. Nothing leaves your browser.</p>
          <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0] ?? null); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(event) => loadFile(event.target.files?.[0] ?? null)} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop your PDF here</h2><p>or click to browse from your device</p>
            <span className="file-note">Private by default · No upload · No permanent storage</span>
          </div>
          {error && <p role="alert" className="error-message">{error}</p>}
          <div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Browser processing</span><span><ShieldCheck size={14} /> Secure by design</span></div>
        </section>
      ) : (
        <section className={styles.viewerPage}>
          <div className={styles.workspace}>
            <header className={styles.header}>
              <div className={styles.fileInfo}><span className={styles.fileIcon}><FileText size={17} /></span><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div></div>
              <div className={styles.headerActions}>
                <a className="ghost-button" href={url} download={file.name}><Download size={15} /> Download</a>
                <button className="icon-button" aria-label="Close PDF" onClick={() => { URL.revokeObjectURL(url); setFile(null); setUrl(""); }}><X size={18} /></button>
              </div>
            </header>

            <div className={styles.toolbar}>
              <div className={styles.pageControls}>
                <button className={styles.control} onClick={() => navigate(page - 1)} disabled={page === 1} aria-label="Previous page">←</button>
                <label className={styles.pageInput}><input value={pageInput} inputMode="numeric" aria-label="Page number" onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") navigate(Number(pageInput) || 1); }} /><span>page</span></label>
                <button className={styles.control} onClick={() => navigate(page + 1)} aria-label="Next page">→</button>
              </div>
              <div className={styles.zoomControls}>
                <button className={styles.control} onClick={() => setZoom((value) => Math.max(50, value - 10))} disabled={zoom <= 50} aria-label="Zoom out"><Minus size={15} /></button>
                <span>{zoom}%</span>
                <button className={styles.control} onClick={() => setZoom((value) => Math.min(200, value + 10))} disabled={zoom >= 200} aria-label="Zoom in"><Plus size={15} /></button>
                <button className={styles.control} onClick={() => setZoom(100)} aria-label="Reset zoom"><Maximize2 size={14} /></button>
              </div>
            </div>

            <div className={styles.canvas}>
              <iframe key={`${page}-${zoom}`} title={`PDF viewer — ${file.name}`} src={viewerSrc} className={styles.frame} />
            </div>

            <div className={styles.footerBar}><span><Lock size={13} /> Local browser viewer</span><span>Use your browser&apos;s PDF search for text lookup</span></div>
          </div>
        </section>
      )}
    </main>
  );
}

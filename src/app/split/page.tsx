"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Lock, ShieldCheck, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";

export default function SplitPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadFile = useCallback(async (incoming: File | null) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf") {
      setError("Please choose a PDF file only.");
      return;
    }

    try {
      setError("");
      const pdf = await PDFDocument.load(await incoming.arrayBuffer());
      const count = pdf.getPageCount();
      setFile(incoming);
      setPageCount(count);
      setSelected([]);
    } catch (err) {
      console.error(err);
      setError("This PDF could not be opened. Please choose a valid PDF.");
    }
  }, []);

  const togglePage = (pageIndex: number) => {
    setSelected((current) => current.includes(pageIndex)
      ? current.filter((page) => page !== pageIndex)
      : [...current, pageIndex].sort((a, b) => a - b));
  };

  const extractPages = async () => {
    if (!file || selected.length === 0) {
      setError("Select at least one page to extract.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      const source = await PDFDocument.load(await file.arrayBuffer());
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, selected);
      pages.forEach((page) => output.addPage(page));

      const bytes = await output.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "PDFly-split.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("We couldn't split this PDF. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="site-shell">
      <nav className="nav container">
        <a className="brand" href="/" aria-label="PDFly home">
          <span className="brand-mark"><span /></span>
          <span>PDFly</span>
        </a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      <section className="hero container tool-page-hero">
        <div className="eyebrow"><FileText size={15} /> PDF tool</div>
        <h1>Split PDF,<br /><span>your way.</span></h1>
        <p className="hero-copy">Choose the pages you need and download a new PDF instantly. Everything runs in your browser.</p>

        {!file ? (
          <div
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0] ?? null); }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
          >
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(event) => void loadFile(event.target.files?.[0] ?? null)} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop your PDF here</h2>
            <p>or click to browse from your device</p>
            <span className="file-note">Private by default · No upload · No permanent storage</span>
          </div>
        ) : (
          <div className="split-workspace">
            <div className="split-filebar">
              <div><FileText size={18} /><strong>{file.name}</strong><span>{pageCount} pages</span></div>
              <button className="icon-button" aria-label="Remove PDF" onClick={() => { setFile(null); setPageCount(0); setSelected([]); }}><X size={18} /></button>
            </div>

            <div className="split-toolbar">
              <span>{selected.length} page{selected.length === 1 ? "" : "s"} selected</span>
              <div>
                <button className="ghost-button" onClick={() => setSelected([])}>Clear</button>
                <button className="ghost-button" onClick={() => setSelected(Array.from({ length: pageCount }, (_, i) => i))}>Select all</button>
              </div>
            </div>

            <div className="page-grid">
              {Array.from({ length: pageCount }, (_, index) => {
                const active = selected.includes(index);
                return (
                  <button key={index} className={`page-card ${active ? "is-selected" : ""}`} onClick={() => togglePage(index)} aria-pressed={active}>
                    <span className="page-number">{index + 1}</span>
                    <span className="page-preview"><FileText size={28} /></span>
                    <span className="page-check">{active && <Check size={14} />}</span>
                    <span className="page-label">Page {index + 1}</span>
                  </button>
                );
              })}
            </div>

            <button className="dark-button large split-action" onClick={() => void extractPages()} disabled={processing || selected.length === 0}>
              {processing ? "Creating PDF…" : `Extract ${selected.length || "selected"} page${selected.length === 1 ? "" : "s"}`} <ArrowRight size={17} />
            </button>
          </div>
        )}

        {error && <p role="alert" className="error-message">{error}</p>}

        <div className="trust-row">
          <span><Lock size={14} /> Files stay private</span>
          <span><Zap size={14} /> Browser processing</span>
          <span><ShieldCheck size={14} /> Secure by design</span>
        </div>
      </section>
    </main>
  );
}

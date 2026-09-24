"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, GripVertical, Lock, ShieldCheck, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";

export default function MergePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter((file) => file.type === "application/pdf");
    if (!pdfs.length) {
      setError("Please choose PDF files only.");
      return;
    }
    setError("");
    setFiles((current) => [...current, ...pdfs]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      const output = await PDFDocument.create();

      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach((page) => output.addPage(page));
      }

      const bytes = await output.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "PDFly-merged.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("We couldn't merge these PDFs. Please check the files and try again.");
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
        <h1>Merge PDFs,<br /><span>in the right order.</span></h1>
        <p className="hero-copy">Add your files, arrange them exactly how you want, then create one clean PDF. Processing stays in your browser.</p>

        <div
          className={`dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        >
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <div className="upload-icon"><Upload size={22} /></div>
          <h2>{files.length ? `${files.length} PDF${files.length === 1 ? "" : "s"} added` : "Drop your PDFs here"}</h2>
          <p>or click to browse from your device</p>
          <span className="file-note">Private by default · No upload · No permanent storage</span>
        </div>

        {files.length > 0 && (
          <div className="merge-workspace">
            <div className="merge-header">
              <div><strong>Files to merge</strong><span>{files.length} file{files.length === 1 ? "" : "s"}</span></div>
              <button className="ghost-button" onClick={() => setFiles([])}>Clear all</button>
            </div>

            <div className="merge-list">
              {files.map((file, index) => (
                <div className="merge-file" key={`${file.name}-${index}`}>
                  <GripVertical className="drag-handle" size={17} />
                  <span className="merge-index">{index + 1}</span>
                  <span className="merge-file-icon"><FileText size={18} /></span>
                  <div className="merge-file-info"><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>
                  <div className="merge-file-actions">
                    <button className="icon-button" aria-label={`Move ${file.name} up`} disabled={index === 0} onClick={() => moveFile(index, -1)}>↑</button>
                    <button className="icon-button" aria-label={`Move ${file.name} down`} disabled={index === files.length - 1} onClick={() => moveFile(index, 1)}>↓</button>
                    <button className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <button className="dark-button large merge-action" onClick={() => void mergePdfs()} disabled={processing || files.length < 2}>
              {processing ? "Merging PDFs…" : `Merge ${files.length} PDFs`} <ArrowRight size={17} />
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

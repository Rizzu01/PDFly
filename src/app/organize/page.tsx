"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Lock, ShieldCheck, Trash2, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import styles from "./organize.module.css";

type PageItem = { id: number; originalIndex: number };

export default function OrganizePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadFile = useCallback(async (incoming: File | null) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf") { setError("Please choose a PDF file only."); return; }
    try {
      const pdf = await PDFDocument.load(await incoming.arrayBuffer());
      setFile(incoming);
      setPages(Array.from({ length: pdf.getPageCount() }, (_, index) => ({ id: index, originalIndex: index })));
      setSelected([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError("This PDF could not be opened. Please choose a valid PDF.");
    }
  }, []);

  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const move = (id: number, direction: -1 | 1) => setPages((current) => {
    const index = current.findIndex((page) => page.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const deleteSelected = () => {
    if (!selected.length) { setError("Select at least one page to delete."); return; }
    if (selected.length === pages.length) { setError("A PDF must keep at least one page."); return; }
    setPages((current) => current.filter((page) => !selected.includes(page.id)));
    setSelected([]);
  };

  const exportPdf = async () => {
    if (!file || !pages.length) return;
    try {
      setProcessing(true); setError("");
      const source = await PDFDocument.load(await file.arrayBuffer());
      const output = await PDFDocument.create();
      const copied = await output.copyPages(source, pages.map((page) => page.originalIndex));
      copied.forEach((page) => output.addPage(page));
      const bytes = await output.save();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url; link.download = "PDFly-organized.pdf";
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err); setError("We couldn't create the organized PDF. Please try again.");
    } finally { setProcessing(false); }
  };

  return (
    <main className="site-shell">
      <nav className="nav container">
        <a className="brand" href="/" aria-label="PDFly home"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      <section className="hero container tool-page-hero">
        <div className="eyebrow"><FileText size={15} /> PDF organizer</div>
        <h1>Organize PDF pages,<br /><span>your way.</span></h1>
        <p className="hero-copy">Reorder, select and delete pages, then export a clean PDF. Everything happens locally in your browser.</p>

        {!file ? (
          <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0] ?? null); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
            <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(event) => void loadFile(event.target.files?.[0] ?? null)} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop your PDF here</h2><p>or click to browse from your device</p>
            <span className="file-note">Private by default · No upload · No permanent storage</span>
          </div>
        ) : (
          <div className={styles.workspace}>
            <div className={styles.header}>
              <div><strong>{file.name}</strong><span>{pages.length} pages remaining</span></div>
              <button className="icon-button" aria-label="Remove PDF" onClick={() => { setFile(null); setPages([]); setSelected([]); }}><X size={18} /></button>
            </div>

            <div className={styles.toolbar}>
              <span>{selected.length} selected</span>
              <div>
                <button className="ghost-button" onClick={() => setSelected([])}>Clear</button>
                <button className="ghost-button" onClick={() => setSelected(pages.map((page) => page.id))}>Select all</button>
                <button className="ghost-button danger" onClick={deleteSelected}><Trash2 size={14} /> Delete</button>
              </div>
            </div>

            <div className={styles.grid}>
              {pages.map((page, index) => {
                const active = selected.includes(page.id);
                return <div key={page.id} className={`${styles.card} ${active ? styles.selected : ""}`}>
                  <button className={styles.preview} onClick={() => toggle(page.id)} aria-label={`Select page ${index + 1}`}>
                    <span className={styles.number}>{index + 1}</span>
                    <FileText size={34} />
                    {active && <span className={styles.check}><Check size={13} /></span>}
                  </button>
                  <div className={styles.cardFooter}>
                    <span>Page {index + 1}</span>
                    <div>
                      <button onClick={() => move(page.id, -1)} disabled={index === 0} aria-label="Move page left">←</button>
                      <button onClick={() => move(page.id, 1)} disabled={index === pages.length - 1} aria-label="Move page right">→</button>
                    </div>
                  </div>
                </div>;
              })}
            </div>

            <button className="dark-button large split-action" onClick={() => void exportPdf()} disabled={processing}>
              {processing ? "Creating PDF…" : "Save organized PDF"} <ArrowRight size={17} />
            </button>
          </div>
        )}

        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Browser processing</span><span><ShieldCheck size={14} /> Secure by design</span></div>
      </section>
    </main>
  );
}

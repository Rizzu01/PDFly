"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, FileText, Lock, ShieldCheck, Type, Upload, X, Zap } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import styles from "./editor.module.css";

type TextItem = { id: number; text: string; x: number; y: number };

export default function EditorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadFile = async (candidate?: File) => {
    setError("");
    if (!candidate || candidate.type !== "application/pdf") {
      setError("Please choose a PDF file only.");
      return;
    }
    try {
      await PDFDocument.load(await candidate.arrayBuffer());
      setFile(candidate);
      setPdfBytes(await candidate.arrayBuffer());
      setTextItems([]);
      setSelected(null);
    } catch {
      setError("This PDF could not be opened. It may be damaged or password-protected.");
    }
  };

  const addText = () => {
    const id = Date.now();
    setTextItems((items) => [...items, { id, text: "Double-click to edit", x: 16, y: 20 }]);
    setSelected(id);
  };

  const updateText = (id: number, text: string) =>
    setTextItems((items) => items.map((item) => item.id === id ? { ...item, text } : item));

  const removeText = (id: number) => {
    setTextItems((items) => items.filter((item) => item.id !== id));
    setSelected(null);
  };

  const exportPdf = async () => {
    if (!pdfBytes || !file || busy) return;
    setBusy(true);
    setError("");
    try {
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const first = pages[0];
      if (!first) throw new Error("The PDF has no pages.");

      textItems.forEach((item) => {
        first.drawText(item.text, {
          x: Math.max(12, Math.min(first.getWidth() - 220, item.x * first.getWidth() / 100)),
          y: Math.max(20, first.getHeight() - (item.y * first.getHeight() / 100)),
          size: 14,
          font,
          color: rgb(0.07, 0.08, 0.06),
        });
      });

      const bytes = await pdf.save({ useObjectStreams: true });
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `PDFly-${file.name.replace(/\.pdf$/i, "")}-edited.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export the edited PDF.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfBytes(null);
    setTextItems([]);
    setSelected(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className={styles.shell}>
      <nav className="nav container">
        <a className="brand" href="/"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      <section className="hero container tool-page-hero">
        <div className="eyebrow"><Type size={15} /> PDF editor</div>
        <h1>Edit your PDF,<br /><span>without the upload.</span></h1>
        <p className="hero-copy">Add text directly to a PDF in your browser. Your original file stays on your device.</p>

        {!file ? (
          <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }} role="button" tabIndex={0}>
            <input ref={inputRef} hidden type="file" accept="application/pdf" onChange={(e) => loadFile(e.target.files?.[0])} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop your PDF here</h2>
            <p>One PDF · browser-first editing</p>
            <span className="file-note">Private by default · No upload · No permanent storage</span>
          </div>
        ) : (
          <div className={styles.workspace}>
            <aside className={styles.toolbar}>
              <div className={styles.fileInfo}><FileText size={18} /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div></div>
              <button className={styles.toolButton} onClick={addText}><Type size={17} /> Add text</button>
              <div className={styles.tip}>Text is added to the first page. Full page-aware editing is coming with the PDFly processing engine.</div>
              <button className={styles.clearButton} onClick={reset}><X size={16} /> Start over</button>
            </aside>

            <div className={styles.canvasArea}>
              <div className={styles.pageMock}>
                <div className={styles.pageLabel}>PDF preview · page 1</div>
                {textItems.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.textLayer} ${selected === item.id ? styles.selected : ""}`}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    onClick={(e) => { e.stopPropagation(); setSelected(item.id); }}
                  >
                    <input
                      value={item.text}
                      onChange={(e) => updateText(item.id, e.target.value)}
                      aria-label="PDF text"
                    />
                    {selected === item.id && <button onClick={() => removeText(item.id)} aria-label="Delete text"><X size={13} /></button>}
                  </div>
                ))}
                {!textItems.length && <div className={styles.emptyPage}><FileText size={32} /><span>PDF page ready</span><small>Use “Add text” to place editable text.</small></div>}
              </div>
            </div>

            <div className={styles.actionBar}>
              <div><strong>{textItems.length}</strong> text element{textItems.length === 1 ? "" : "s"}</div>
              <button className="dark-button large" onClick={exportPdf} disabled={busy}>{busy ? "Exporting…" : <><Download size={17} /> Download edited PDF</>}</button>
            </div>
          </div>
        )}

        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Browser processing</span><span><ShieldCheck size={14} /> Secure by design</span></div>
      </section>
    </main>
  );
}

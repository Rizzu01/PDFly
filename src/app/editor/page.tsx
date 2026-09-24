"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Lock, ShieldCheck, Type, Upload, X, Zap } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import styles from "./editor.module.css";

type TextItem = { id: number; page: number; text: string; x: number; y: number };

type RenderState = { width: number; height: number };

export default function EditorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const renderPage = async () => {
    if (!pdfBytes || !canvasRef.current || !pageNumber) return;
    setRendering(true);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes), disableWorker: true }).promise;
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const maxWidth = Math.min(720, Math.max(320, (pageWrapRef.current?.clientWidth || 720) - 2));
      const scale = maxWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not create a PDF rendering surface.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;
      await page.render({ canvasContext: context, viewport }).promise;
      setRenderState({ width: viewport.width, height: viewport.height });
      await pdf.destroy();
    } catch (renderError) {
      console.error(renderError);
      setError("This page could not be rendered. Try another PDF.");
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    void renderPage();
  }, [pdfBytes, pageNumber]);

  const loadFile = async (candidate?: File) => {
    setError("");
    if (!candidate || candidate.type !== "application/pdf") {
      setError("Please choose a PDF file only.");
      return;
    }
    try {
      const bytes = await candidate.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      setFile(candidate);
      setPdfBytes(bytes);
      setPageCount(pdf.getPageCount());
      setPageNumber(1);
      setTextItems([]);
      setSelected(null);
    } catch {
      setError("This PDF could not be opened. It may be damaged or password-protected.");
    }
  };

  const addText = () => {
    const id = Date.now();
    setTextItems((items) => [...items, { id, page: pageNumber, text: "Double-click to edit", x: 12, y: 18 }]);
    setSelected(id);
  };

  const updateText = (id: number, text: string) =>
    setTextItems((items) => items.map((item) => item.id === id ? { ...item, text } : item));

  const removeText = (id: number) => {
    setTextItems((items) => items.filter((item) => item.id !== id));
    setSelected(null);
  };

  const moveText = (id: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (!pageWrapRef.current) return;
    const rect = pageWrapRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(82, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(94, ((event.clientY - rect.top) / rect.height) * 100));
    setTextItems((items) => items.map((item) => item.id === id ? { ...item, x, y } : item));
  };

  const exportPdf = async () => {
    if (!pdfBytes || !file || busy) return;
    setBusy(true);
    setError("");
    try {
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      textItems.forEach((item) => {
        const page = pages[item.page - 1];
        if (!page || !item.text.trim()) return;
        page.drawText(item.text.trim(), {
          x: Math.max(12, Math.min(page.getWidth() - 220, item.x * page.getWidth() / 100)),
          y: Math.max(20, page.getHeight() - (item.y * page.getHeight() / 100)),
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
      document.body.appendChild(link);
      link.click();
      link.remove();
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
    setPageCount(0);
    setPageNumber(1);
    setRenderState(null);
    setTextItems([]);
    setSelected(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const currentItems = textItems.filter((item) => item.page === pageNumber);

  return (
    <main className={styles.shell}>
      <nav className="nav container">
        <a className="brand" href="/"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a>
      </nav>

      <section className="hero container tool-page-hero">
        <div className="eyebrow"><Type size={15} /> PDF editor v2</div>
        <h1>Edit your PDF,<br /><span>page by page.</span></h1>
        <p className="hero-copy">See the real PDF, move text where you need it, and export the edited document — entirely in your browser.</p>

        {!file ? (
          <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }} role="button" tabIndex={0}>
            <input ref={inputRef} hidden type="file" accept="application/pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => loadFile(e.target.files?.[0])} />
            <div className="upload-icon"><Upload size={22} /></div>
            <h2>Drop your PDF here</h2>
            <p>Multi-page · rendered preview · browser-first editing</p>
            <span className="file-note">Private by default · No upload · No permanent storage</span>
          </div>
        ) : (
          <div className={styles.workspace}>
            <aside className={styles.toolbar}>
              <div className={styles.fileInfo}><FileText size={18} /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} pages</span></div></div>
              <button className={styles.toolButton} onClick={addText} disabled={rendering}><Type size={17} /> Add text</button>
              <div className={styles.tip}>Text is attached to the current page. Drag a selected text box to reposition it.</div>
              <div className={styles.pageNav}>
                <button onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber <= 1 || rendering} aria-label="Previous page"><ChevronLeft size={17} /></button>
                <span>Page <strong>{pageNumber}</strong> / {pageCount}</span>
                <button onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))} disabled={pageNumber >= pageCount || rendering} aria-label="Next page"><ChevronRight size={17} /></button>
              </div>
              <button className={styles.clearButton} onClick={reset}><X size={16} /> Start over</button>
            </aside>

            <div className={styles.canvasArea} ref={pageWrapRef}>
              <div className={styles.pageMock} style={renderState ? { width: renderState.width, height: renderState.height } : undefined}>
                <canvas ref={canvasRef} className={styles.pdfCanvas} aria-label={`PDF page ${pageNumber}`} />
                {rendering && <div className={styles.renderOverlay}>Rendering page…</div>}
                {currentItems.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.textLayer} ${selected === item.id ? styles.selected : ""}`}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    onPointerDown={(event) => { event.stopPropagation(); setSelected(item.id); }}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <input value={item.text} onChange={(event) => updateText(item.id, event.target.value)} aria-label="PDF text" />
                    {selected === item.id && <button onClick={() => removeText(item.id)} aria-label="Delete text"><X size={13} /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.actionBar}>
              <div><strong>{textItems.length}</strong> text element{textItems.length === 1 ? "" : "s"} · {currentItems.length} on this page</div>
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

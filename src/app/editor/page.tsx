"use client";

import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, ChevronLeft, ChevronRight, Download, FileText, Lock, ShieldCheck, Trash2, Type, Upload, X, Zap } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import styles from "./editor.module.css";

type TextAlign = "left" | "center" | "right";
type TextItem = {
  id: number;
  page: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  color: string;
  align: TextAlign;
};

type RenderState = { width: number; height: number; pdfWidth: number };
type DragState = { id: number; pointerId: number; offsetX: number; offsetY: number } | null;

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

export default function EditorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const pageMockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
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
      setRenderState({ width: viewport.width, height: viewport.height, pdfWidth: baseViewport.width });
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
    setTextItems((items) => [...items, {
      id,
      page: pageNumber,
      text: "Double-click to edit",
      x: 12,
      y: 18,
      fontSize: 14,
      bold: false,
      color: "#11120f",
      align: "left",
    }]);
    setSelected(id);
  };

  const updateText = (id: number, text: string) =>
    setTextItems((items) => items.map((item) => item.id === id ? { ...item, text } : item));

  const updateSelected = (patch: Partial<TextItem>) => {
    if (selected === null) return;
    setTextItems((items) => items.map((item) => item.id === selected ? { ...item, ...patch } : item));
  };

  const removeText = (id: number) => {
    setTextItems((items) => items.filter((item) => item.id !== id));
    setSelected(null);
  };

  const startDrag = (id: number, event: PointerEvent<HTMLDivElement>) => {
    if (!pageMockRef.current || (event.target as HTMLElement).closest("input,button")) return;
    const rect = pageMockRef.current.getBoundingClientRect();
    const item = textItems.find((entry) => entry.id === id);
    if (!item) return;
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      offsetX: pointerX - item.x,
      offsetY: pointerY - item.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(id);
  };

  const moveText = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !pageMockRef.current || event.pointerId !== drag.pointerId) return;
    const rect = pageMockRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(2, Math.min(92, pointerX - drag.offsetX));
    const y = Math.max(2, Math.min(96, pointerY - drag.offsetY));
    setTextItems((items) => items.map((item) => item.id === drag.id ? { ...item, x, y } : item));
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const selectedItem = textItems.find((item) => item.id === selected) ?? null;

  const exportPdf = async () => {
    if (!pdfBytes || !file || busy) return;
    setBusy(true);
    setError("");
    try {
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = pdf.getPages();
      const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

      textItems.forEach((item) => {
        const page = pages[item.page - 1];
        const text = item.text.trim();
        if (!page || !text) return;
        const font = item.bold ? boldFont : regularFont;
        const size = item.fontSize;
        const pageWidth = page.getWidth();
        const textWidth = font.widthOfTextAtSize(text, size);
        const anchorX = item.x * pageWidth / 100;
        const x = item.align === "center"
          ? anchorX - textWidth / 2
          : item.align === "right"
            ? anchorX - textWidth
            : anchorX;
        const y = page.getHeight() - (item.y * page.getHeight() / 100) - size;
        page.drawText(text, {
          x: Math.max(4, Math.min(Math.max(4, pageWidth - textWidth - 4), x)),
          y: Math.max(4, y),
          size,
          font,
          color: hexToRgb(item.color),
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
        <p className="hero-copy">See the real PDF, move text where you need it, style it, and export the edited document — entirely in your browser.</p>

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

              {selectedItem && (
                <div className={styles.formatPanel}>
                  <div className={styles.panelLabel}>Text formatting</div>
                  <label className={styles.controlLabel}>
                    Size
                    <select value={selectedItem.fontSize} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) })}>
                      {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
                    </select>
                  </label>
                  <div className={styles.controlRow}>
                    <button className={`${styles.formatButton} ${selectedItem.bold ? styles.active : ""}`} onClick={() => updateSelected({ bold: !selectedItem.bold })} aria-label="Toggle bold" aria-pressed={selectedItem.bold}><Bold size={15} /></button>
                    <button className={`${styles.formatButton} ${selectedItem.align === "left" ? styles.active : ""}`} onClick={() => updateSelected({ align: "left" })} aria-label="Align left" aria-pressed={selectedItem.align === "left"}><AlignLeft size={15} /></button>
                    <button className={`${styles.formatButton} ${selectedItem.align === "center" ? styles.active : ""}`} onClick={() => updateSelected({ align: "center" })} aria-label="Align center" aria-pressed={selectedItem.align === "center"}><AlignCenter size={15} /></button>
                    <button className={`${styles.formatButton} ${selectedItem.align === "right" ? styles.active : ""}`} onClick={() => updateSelected({ align: "right" })} aria-label="Align right" aria-pressed={selectedItem.align === "right"}><AlignRight size={15} /></button>
                  </div>
                  <label className={styles.colorControl}>Color <input type="color" value={selectedItem.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
                  <button className={styles.deleteButton} onClick={() => removeText(selectedItem.id)}><Trash2 size={14} /> Delete text</button>
                </div>
              )}

              <div className={styles.tip}>Select a text box to format it. Drag anywhere on the box to reposition it.</div>
              <div className={styles.pageNav}>
                <button onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber <= 1 || rendering} aria-label="Previous page"><ChevronLeft size={17} /></button>
                <span>Page <strong>{pageNumber}</strong> / {pageCount}</span>
                <button onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))} disabled={pageNumber >= pageCount || rendering} aria-label="Next page"><ChevronRight size={17} /></button>
              </div>
              <button className={styles.clearButton} onClick={reset}><X size={16} /> Start over</button>
            </aside>

            <div className={styles.canvasArea} ref={pageWrapRef}>
              <div className={styles.pageMock} ref={pageMockRef} style={renderState ? { width: renderState.width, height: renderState.height } : undefined}>
                <canvas ref={canvasRef} className={styles.pdfCanvas} aria-label={`PDF page ${pageNumber}`} />
                {rendering && <div className={styles.renderOverlay}>Rendering page…</div>}
                {currentItems.map((item) => {
                  const scaledFontSize = renderState ? item.fontSize * (renderState.width / renderState.pdfWidth) : item.fontSize;
                  return (
                    <div
                      key={item.id}
                      className={`${styles.textLayer} ${selected === item.id ? styles.selected : ""}`}
                      style={{ left: `${item.x}%`, top: `${item.y}%` }}
                      onPointerDown={(event) => startDrag(item.id, event)}
                      onPointerMove={moveText}
                      onPointerUp={stopDrag}
                      onPointerCancel={stopDrag}
                    >
                      <input
                        value={item.text}
                        onChange={(event) => updateText(item.id, event.target.value)}
                        aria-label="PDF text"
                        style={{ fontSize: `${scaledFontSize}px`, fontWeight: item.bold ? 700 : 400, color: item.color, textAlign: item.align }}
                      />
                      {selected === item.id && <button onClick={() => removeText(item.id)} aria-label="Delete text"><X size={13} /></button>}
                    </div>
                  );
                })}
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

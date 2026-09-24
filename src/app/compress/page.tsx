"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileDown, FileText, Lock, ShieldCheck, Upload, X, Zap } from "lucide-react";
import { PDFDocument } from "pdf-lib";

const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function CompressPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(0);
  const [level, setLevel] = useState<"light" | "balanced" | "strong">("balanced");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ size: number; saved: number } | null>(null);
  const [error, setError] = useState("");

  const loadFile = useCallback(async (incoming: File | null) => {
    if (!incoming) return;
    if (incoming.type !== "application/pdf") { setError("Please choose a PDF file only."); return; }
    try { const pdf = await PDFDocument.load(await incoming.arrayBuffer()); setFile(incoming); setPages(pdf.getPageCount()); setResult(null); setError(""); }
    catch (err) { console.error(err); setError("This PDF could not be opened. Please choose a valid PDF."); }
  }, []);

  const compress = async () => {
    if (!file) return;
    try {
      setProcessing(true); setError(""); setResult(null);
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      source.setCreator("PDFly"); source.setProducer("PDFly");
      if (level !== "light") { source.setTitle(""); source.setAuthor(""); source.setSubject(""); source.setKeywords([]); }
      const bytes = await source.save({ useObjectStreams: true, objectsPerTick: level === "strong" ? 100 : 50 });
      const saved = Math.max(0, ((file.size - bytes.length) / file.size) * 100);
      setResult({ size: bytes.length, saved });
      const blob = new Blob([bytes], { type: "application/pdf" }); const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = "PDFly-compressed.pdf"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "We couldn't optimize this PDF. Please try again."); }
    finally { setProcessing(false); }
  };

  return <main className="site-shell"><nav className="nav container"><a className="brand" href="/" aria-label="PDFly home"><span className="brand-mark"><span /></span><span>PDFly</span></a><a className="ghost-button" href="/"><ArrowLeft size={16} /> Back home</a></nav>
    <section className="hero container tool-page-hero"><div className="eyebrow"><FileDown size={15} /> PDF compressor</div><h1>Smaller PDFs,<br /><span>without the hassle.</span></h1><p className="hero-copy">Optimize your PDF directly in your browser. No upload is required.</p>
      {!file ? <div className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0] ?? null); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}><input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(event) => void loadFile(event.target.files?.[0] ?? null)} /><div className="upload-icon"><Upload size={22} /></div><h2>Drop your PDF here</h2><p>or click to browse from your device</p><span className="file-note">Private by default · Browser-only processing</span></div> :
      <div className="split-workspace"><div className="split-filebar"><div><FileText size={17} /><strong>{file.name}</strong><span>{pages} pages · {formatBytes(file.size)}</span></div><button className="icon-button" aria-label="Remove PDF" onClick={() => { setFile(null); setPages(0); setResult(null); }}><X size={18} /></button></div>
        <div className="compress-options"><div><span className="option-label">Optimization level</span><p>All levels run locally. Strong uses more PDF cleanup passes.</p></div><div className="level-grid">{([["light","Light","Fastest"],["balanced","Balanced","Recommended"],["strong","Strong","Maximum cleanup"]] as const).map(([value,title,description]) => <button key={value} className={`level-card ${level === value ? "active" : ""}`} onClick={() => setLevel(value)}><span className="level-check">{level === value && <Check size={12} />}</span><strong>{title}</strong><small>{description}</small></button>)}</div></div>
        {result && <div className="compression-result"><div><span>Original</span><strong>{formatBytes(file.size)}</strong></div><ArrowRight size={17} /><div><span>Optimized</span><strong>{formatBytes(result.size)}</strong></div><div className="saved"><strong>{result.saved > 0 ? `${result.saved.toFixed(1)}%` : "No reduction"}</strong><span>{result.saved > 0 ? "smaller" : "already optimized"}</span></div></div>}
        <button className="dark-button large split-action" onClick={() => void compress()} disabled={processing}>{processing ? "Optimizing PDF…" : result ? "Optimize again" : "Compress PDF"} <ArrowRight size={17} /></button><p className="compression-note">Your PDF never leaves this browser.</p></div>}
      {error && <p role="alert" className="error-message">{error}</p>}<div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Browser-first</span><span><ShieldCheck size={14} /> Secure by design</span></div></section></main>;
}

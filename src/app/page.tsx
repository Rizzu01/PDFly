"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { ArrowRight, Check, Download, Eye, FileDown, FileImage, FileText, Lock, Menu, Merge, ScanText, ShieldCheck, Sparkles, Split, Upload, X, Zap, RotateCw, PenLine, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { convertPdfToJpg } from "@/lib/processing-api";

const tools = [
  { href: "/", icon: Merge, title: "Merge PDF", text: "Combine multiple PDFs." },
  { href: "/split", icon: Split, title: "Split PDF", text: "Extract pages your way." },
  { href: "/compress", icon: FileDown, title: "Compress PDF", text: "Reduce PDF file size." },
  { href: "/organize", icon: RotateCw, title: "Organize PDF", text: "Reorder and delete pages." },
  { href: "/editor", icon: PenLine, title: "Edit PDF", text: "Add and edit PDF text." },
  { href: "/convert", icon: FileImage, title: "Convert PDF", text: "PDF to JPG and JPG to PDF." },
  { href: "/ocr", icon: ScanText, title: "OCR PDF", text: "Make scanned files searchable." },
  { href: "/viewer", icon: Eye, title: "PDF Viewer", text: "Read and inspect PDFs." },
];

type Output = { blob: Blob; name: string; previewUrl: string; kind: "pdf" | "image" | "zip" };
type Format = "pdf" | "jpg" | "png";

const formatOptions = (file: File): Format[] => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return ["jpg", "png"];
  if (["jpg", "jpeg", "png"].includes(ext ?? "")) return ["pdf"];
  return [];
};

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [target, setTarget] = useState<Format | "">("");
  const [output, setOutput] = useState<Output | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setLoggedIn(Boolean(data.session));
    };
    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session)));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const resetOutput = () => {
    if (output) URL.revokeObjectURL(output.previewUrl);
    setOutput(null);
  };

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    if (!next.length) return;
    resetOutput();
    setError("");
    setFiles(next);
    const options = formatOptions(next[0]);
    setTarget(options[0] ?? "");
  }, []);

  const renderPdfPreview = async (file: File, imageType: "image/jpeg" | "image/png") => {
    const { pdfjsLib } = await import("pdfjs-dist");
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Preview unavailable");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Preview generation failed")), imageType));
  };

  const makePdfFromImages = async (images: File[]) => {
    const pdf = await PDFDocument.create();
    for (const file of images) {
      const bytes = await file.arrayBuffer();
      const image = file.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    return new Blob([await pdf.save()], { type: "application/pdf" });
  };

  const convert = async () => {
    if (!files.length || !target) return;
    try {
      setProcessing(true); setError(""); resetOutput();
      const source = files[0];
      let blob: Blob;
      let previewBlob: Blob;
      let name: string;
      let kind: Output["kind"];

      if (source.type === "application/pdf" && target === "jpg") {
        blob = await convertPdfToJpg(source);
        previewBlob = await renderPdfPreview(source, "image/jpeg");
        name = "PDFly-pages.zip";
        kind = "zip";
      } else if (source.type === "application/pdf" && target === "png") {
        blob = await renderPdfPreview(source, "image/png");
        previewBlob = blob;
        name = "PDFly-page-1.png";
        kind = "image";
      } else if (target === "pdf") {
        blob = await makePdfFromImages(files);
        previewBlob = blob;
        name = "PDFly-converted.pdf";
        kind = "pdf";
      } else {
        throw new Error("This format is not supported yet.");
      }

      setOutput({ blob, name, previewUrl: URL.createObjectURL(previewBlob), kind });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Conversion failed. Please try another file.");
    } finally { setProcessing(false); }
  };

  const download = () => {
    if (!output) return;
    const url = URL.createObjectURL(output.blob);
    const link = document.createElement("a");
    link.href = url; link.download = output.name;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const startOver = () => {
    resetOutput(); setFiles([]); setTarget(""); setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const options = files.length ? formatOptions(files[0]) : [];

  return (
    <main className="site-shell">
      <nav className="nav container">
        <a className="brand" href="#top" aria-label="PDFly home"><span className="brand-mark"><span /></span><span>PDFly</span></a>
        <div className="nav-links"><a href="#tools">Tools</a><a href="#ai">AI Workspace</a><a href="#security">Security</a><a href="#pricing">Pricing</a></div>
        <div className="nav-actions">
          {loggedIn ? <><Link className="ghost-button" href="/tools">All tools</Link><Link className="dark-button" href="/dashboard">Dashboard <ArrowRight size={16} /></Link></> : <><Link className="ghost-button" href="/login">Sign in</Link><Link className="dark-button" href="/signup">Get started <ArrowRight size={16} /></Link></>}
          <button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={20} /></button>
        </div>
      </nav>

      <section className="hero container" id="top">
        <div className="eyebrow"><Sparkles size={15} /> The smarter way to work with documents</div>
        <h1 className="hero-title-compact">PDF work, <span>without the busywork.</span></h1>

        <div className={`dropzone ${dragging ? "is-dragging" : ""} ${output ? "has-output" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} onClick={() => !output && inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (!output && (event.key === "Enter" || event.key === " ")) inputRef.current?.click(); }}>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          {!files.length && <><div className="upload-icon"><Upload size={22} /></div><h2>Drop your file here</h2><p>or click to browse from your device</p><span className="file-note">PDF · JPG · PNG · Private by default</span></>}

          {files.length > 0 && !output && <div className="converter-panel" onClick={(event) => event.stopPropagation()}>
            <div className="selected-file"><div className="upload-icon"><FileText size={21} /></div><div><strong>{files[0].name}</strong><span>{(files[0].size / 1024 / 1024).toFixed(2)} MB · Ready to convert</span></div><button className="remove-file" onClick={startOver} aria-label="Remove file"><X size={17} /></button></div>
            <div className="convert-controls"><div><label htmlFor="convert-format">Convert to</label><select id="convert-format" value={target} onChange={(event) => setTarget(event.target.value as Format)}>{options.map((format) => <option key={format} value={format}>{format.toUpperCase()}</option>)}</select></div><button className="dark-button convert-button" onClick={() => void convert()} disabled={processing || !target}>{processing ? "Converting…" : "Convert"} <ArrowRight size={17} /></button></div>
            <span className="file-note">Your file is processed temporarily and not permanently stored.</span>
          </div>}

          {output && <div className="converter-result" onClick={(event) => event.stopPropagation()}>
            <div className="result-head"><div><span className="success-badge"><Check size={13} /> Conversion complete</span><h3>{output.name}</h3><p>Your converted file is ready.</p></div><button className="remove-file" onClick={startOver} aria-label="Convert another"><RefreshCw size={17} /></button></div>
            <div className="result-preview">{output.kind === "pdf" ? <iframe title="Converted PDF preview" src={output.previewUrl} /> : <div className="image-preview"><img src={output.previewUrl} alt="Converted preview" />{output.kind === "zip" && <span className="preview-note">Preview of page 1 · Download contains all converted JPG pages.</span>}</div>}</div>
            <div className="result-actions"><button className="dark-button" onClick={download}><Download size={17} /> Download</button><button className="ghost-button" onClick={startOver}>Convert another</button><a className="ghost-button" href={output.previewUrl} target="_blank" rel="noreferrer"><Eye size={16} /> Open preview</a></div>
          </div>}
        </div>
        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="trust-row"><span><Lock size={14} /> Files stay private</span><span><Zap size={14} /> Fast processing</span><span><ShieldCheck size={14} /> Secure by design</span></div>
      </section>

      <section className="section container" id="tools">
        <div className="section-heading"><div><span className="kicker">PDF tools</span><h2>Everything you need.<br />Nothing you don&apos;t.</h2></div><Link href="/tools">All tools <ArrowRight size={16} /></Link></div>
        <div className="tool-grid">{tools.map(({ href, icon: Icon, title, text }) => <Link className="tool-card" href={href} key={title}><span className="tool-icon"><Icon size={20} /></span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight className="tool-arrow" size={17} /></Link>)}</div>
      </section>

      <section className="ai-section" id="ai"><div className="container ai-layout"><div className="ai-copy"><span className="kicker light">PDFly AI</span><h2>Your documents,<br /><em>finally understandable.</em></h2><p>AI document tools are coming next. For now, use OCR and the PDF workspace to work with your files locally.</p><div className="ai-points"><span><Check size={15} /> OCR scanned documents</span><span><Check size={15} /> Organize pages quickly</span><span><Check size={15} /> Edit and convert PDFs</span></div><Link className="light-button" href="/ocr">Try OCR <ArrowRight size={16} /></Link></div><div className="ai-card"><div className="ai-window-top"><span>PDFly Workspace</span><span className="live-dot">● Ready</span></div><div className="chat-message user-msg">What can I do with my PDF?</div><div className="chat-message ai-msg"><span className="ai-avatar"><Sparkles size={13} /></span><div><strong>PDFly tools:</strong><ol><li>Merge and split pages</li><li>Compress, edit and organize</li><li>Convert and OCR documents</li></ol></div></div><div className="chat-input">More AI document tools coming soon… <ArrowRight size={15} /></div></div></div></section>
      <section className="security-section container" id="security"><div className="security-card"><div className="security-icon"><ShieldCheck size={24} /></div><div><span className="kicker">Privacy first</span><h2>Your files are yours.</h2><p>PDFly is designed around temporary processing. We don&apos;t need to keep your documents just to help you work with them.</p></div><div className="security-stat"><strong>0</strong><span>default permanent<br />PDF storage</span></div></div></section>
      <section className="footer-cta container" id="pricing"><span className="kicker">Ready when you are</span><h2>Make PDFs feel<br /><span>effortless.</span></h2><Link className="dark-button large" href="/signup">Start working with PDFly <ArrowRight size={17} /></Link></section>
      <footer className="footer container"><div className="brand"><span className="brand-mark"><span /></span><span>PDFly</span></div><span>Built for better document workflows.</span><span>Privacy-first PDF tools.</span></footer>
      <style jsx>{`
        .hero-title-compact{font-size:clamp(42px,5.2vw,68px);line-height:.98;letter-spacing:-.055em;margin:18px auto 30px;max-width:900px}.hero-title-compact span{white-space:nowrap}.dropzone.has-output{cursor:default}.converter-panel,.converter-result{width:100%;max-width:760px;margin:0 auto;text-align:left}.selected-file,.result-head{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid #e8e9e4;background:#fff;border-radius:18px}.selected-file>div:nth-child(2),.result-head>div{min-width:0;flex:1}.selected-file strong,.result-head h3{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-file span,.result-head p{display:block;color:#6d706a;font-size:13px;margin-top:4px}.remove-file{border:0;background:#f6f7f3;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;cursor:pointer;color:#555}.convert-controls{display:flex;align-items:end;gap:12px;margin-top:14px}.convert-controls>div{flex:1}.convert-controls label{display:block;font-size:12px;font-weight:700;margin-bottom:7px}.convert-controls select{width:100%;height:48px;border:1px solid #dfe1da;border-radius:13px;padding:0 14px;background:#fff;font:inherit}.convert-button{height:48px;min-width:150px;justify-content:center}.converter-panel>.file-note{display:block;margin-top:14px}.success-badge{display:inline-flex;align-items:center;gap:5px;background:#efffd0;color:#4b5d16;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:800}.result-head h3{margin:9px 0 0;font-size:18px}.result-preview{margin-top:14px;border:1px solid #e8e9e4;border-radius:18px;overflow:hidden;background:#f6f7f3;min-height:260px;display:grid;place-items:center}.result-preview iframe{width:100%;height:430px;border:0}.image-preview{padding:18px;max-height:430px;overflow:auto}.image-preview img{display:block;max-width:100%;max-height:390px;margin:auto;object-fit:contain}.preview-note{display:block;text-align:center;font-size:12px;color:#6d706a;margin-top:10px}.result-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.result-actions .ghost-button,.result-actions .dark-button{display:inline-flex;align-items:center;gap:7px}@media(max-width:700px){.hero-title-compact{font-size:42px;line-height:1.02;margin:16px auto 24px}.hero-title-compact span{white-space:normal}.convert-controls{align-items:stretch;flex-direction:column}.convert-button{width:100%}.result-actions>*{width:100%;justify-content:center}.result-preview iframe{height:360px}}
      `}</style>
    </main>
  );
}

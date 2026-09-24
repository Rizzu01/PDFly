"use client";

import { useCallback, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileDown,
  FileText,
  FolderOpen,
  Lock,
  Menu,
  Merge,
  MessageSquareText,
  MoreHorizontal,
  ScanText,
  ShieldCheck,
  Sparkles,
  Split,
  Upload,
  X,
  Zap,
} from "lucide-react";

const tools = [
  { icon: Merge, title: "Merge PDF", text: "Combine files in seconds." },
  { icon: Split, title: "Split PDF", text: "Separate pages your way." },
  { icon: FileDown, title: "Compress PDF", text: "Shrink size, keep quality." },
  { icon: FileText, title: "PDF Editor", text: "Edit, annotate and fill." },
  { icon: ScanText, title: "OCR", text: "Make scanned files searchable." },
  { icon: MessageSquareText, title: "Ask your PDF", text: "Understand documents with AI." },
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter((file) => file.type === "application/pdf");
    if (pdfs.length) {
      setError("");
      setFiles((current) => [...current, ...pdfs]);
    } else {
      setError("Please choose PDF files only.");
    }
  }, []);

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      // Everything happens in the browser. Files are never uploaded to PDFly.
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "PDFly-merged.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("We couldn't merge these files. Please check that the PDFs are valid and try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="site-shell">
      <nav className="nav container">
        <a className="brand" href="#top" aria-label="PDFly home">
          <span className="brand-mark"><span /></span>
          <span>PDFly</span>
        </a>
        <div className="nav-links">
          <a href="#tools">Tools</a>
          <a href="#ai">AI Workspace</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <button className="ghost-button">Sign in</button>
          <button className="dark-button">Get started <ArrowRight size={16} /></button>
          <button className="icon-button mobile-menu" aria-label="Open menu"><Menu size={20} /></button>
        </div>
      </nav>

      <section className="hero container" id="top">
        <div className="eyebrow"><Sparkles size={15} /> The smarter way to work with documents</div>
        <h1>PDF work,<br /><span>without the busywork.</span></h1>
        <p className="hero-copy">Merge, compress, edit, convert and understand your documents from one beautifully simple workspace.</p>

        <div
          className={`dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        >
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <div className="upload-icon"><Upload size={22} /></div>
          <h2>{files.length ? `${files.length} PDF${files.length > 1 ? "s" : ""} ready` : "Drop your PDF here"}</h2>
          <p>{files.length ? "Click to add more files or choose a tool below." : "or click to browse from your device"}</p>
          <span className="file-note">PDF files · Private by default · No permanent storage</span>
        </div>

        {files.length > 0 && (
          <div className="file-strip" onClick={(event) => event.stopPropagation()}>
            {files.slice(0, 3).map((file, index) => (
              <div className="file-chip" key={`${file.name}-${index}`}>
                <FileText size={15} />
                <span>{file.name}</span>
                <button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}><X size={14} /></button>
              </div>
            ))}
            {files.length > 3 && <span className="more-files">+{files.length - 3} more</span>}
          </div>
        )}

        {error && <p role="alert" className="error-message">{error}</p>}

        {files.length >= 2 && (
          <button className="dark-button large merge-action" onClick={(event) => { event.stopPropagation(); void mergePdfs(); }} disabled={processing}>
            {processing ? "Merging PDFs…" : "Merge PDFs"} <ArrowRight size={17} />
          </button>
        )}

        <div className="trust-row">
          <span><Lock size={14} /> Files stay private</span>
          <span><Zap size={14} /> Fast processing</span>
          <span><ShieldCheck size={14} /> Secure by design</span>
        </div>
      </section>

      <section className="section container" id="tools">
        <div className="section-heading">
          <div><span className="kicker">PDF tools</span><h2>Everything you need.<br />Nothing you don&apos;t.</h2></div>
          <a href="#tools">View all tools <ArrowRight size={16} /></a>
        </div>
        <div className="tool-grid">
          {tools.map(({ icon: Icon, title, text }) => (
            <button className="tool-card" key={title} onClick={() => title === "Merge PDF" && window.scrollTo({ top: 0, behavior: "smooth" })}>
              <span className="tool-icon"><Icon size={20} /></span>
              <span><strong>{title}</strong><small>{text}</small></span>
              <ArrowRight className="tool-arrow" size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="ai-section" id="ai">
        <div className="container ai-layout">
          <div className="ai-copy">
            <span className="kicker light">PDFly AI</span>
            <h2>Your documents,<br /><em>finally understandable.</em></h2>
            <p>Ask questions, extract key details, summarize long files and turn messy documents into useful answers — without digging through every page.</p>
            <div className="ai-points">
              <span><Check size={15} /> Summarize long documents</span>
              <span><Check size={15} /> Extract tables and key facts</span>
              <span><Check size={15} /> Ask questions in plain English</span>
            </div>
            <button className="light-button">Explore AI Workspace <ArrowRight size={16} /></button>
          </div>
          <div className="ai-card">
            <div className="ai-window-top"><span>Document Copilot</span><span className="live-dot">● Live</span></div>
            <div className="chat-message user-msg">What are the three most important points in this contract?</div>
            <div className="chat-message ai-msg"><span className="ai-avatar"><Sparkles size={13} /></span><div><strong>Here&apos;s the short version:</strong><ol><li>The agreement renews automatically after 12 months.</li><li>Either party can terminate with 30 days&apos; notice.</li><li>Confidentiality obligations survive termination.</li></ol></div></div>
            <div className="chat-input">Ask anything about this document… <ArrowRight size={15} /></div>
          </div>
        </div>
      </section>

      <section className="security-section container" id="security">
        <div className="security-card">
          <div className="security-icon"><ShieldCheck size={24} /></div>
          <div><span className="kicker">Privacy first</span><h2>Your files are yours.</h2><p>PDFly is designed around temporary processing. We don&apos;t need to keep your documents just to help you work with them.</p></div>
          <div className="security-stat"><strong>0</strong><span>default permanent<br />PDF storage</span></div>
        </div>
      </section>

      <section className="footer-cta container" id="pricing">
        <span className="kicker">Ready when you are</span>
        <h2>Make PDFs feel<br /><span>effortless.</span></h2>
        <button className="dark-button large">Start working with PDFly <ArrowRight size={17} /></button>
      </section>

      <footer className="footer container"><div className="brand"><span className="brand-mark"><span /></span><span>PDFly</span></div><span>Built for better document workflows.</span><button className="icon-button" aria-label="More options"><MoreHorizontal size={18} /></button></footer>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { ArrowRight, Check, FileDown, FileImage, FileText, Lock, Menu, Merge, ScanText, ShieldCheck, Sparkles, Split, Upload, X, Zap, RotateCw, Eye, PenLine } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

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

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter((file) => file.type === "application/pdf");
    if (pdfs.length) { setError(""); setFiles((current) => [...current, ...pdfs]); }
    else setError("Please choose PDF files only.");
  }, []);

  const mergePdfs = async () => {
    if (files.length < 2) { setError("Add at least 2 PDF files to merge."); return; }
    try {
      setProcessing(true); setError("");
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const sourcePdf = await PDFDocument.load(await file.arrayBuffer());
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = "PDFly-merged.pdf"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); setError("We couldn't merge these PDFs. Please try valid PDF files."); }
    finally { setProcessing(false); }
  };

  const marqueeTools = [...tools, ...tools, ...tools];

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
        <h1>PDF work,<br /><span>without the busywork.</span></h1>

        <div className="tools-marquee" aria-label="PDFly tools">
          <div className="marquee-fade marquee-fade-left" aria-hidden="true" />
          <div className="marquee-fade marquee-fade-right" aria-hidden="true" />
          <div className="tools-marquee-row row-one">
            {marqueeTools.map(({ href, icon: Icon, title, text }, index) => (
              <Link href={href} className="marquee-card" key={`one-${title}-${index}`}>
                <span className="marquee-icon"><Icon size={18} /></span>
                <span className="marquee-content"><strong>{title}</strong><small>{text}</small></span>
              </Link>
            ))}
          </div>
          <div className="tools-marquee-row row-two">
            {[...marqueeTools].reverse().map(({ href, icon: Icon, title, text }, index) => (
              <Link href={href} className="marquee-card" key={`two-${title}-${index}`}>
                <span className="marquee-icon"><Icon size={18} /></span>
                <span className="marquee-content"><strong>{title}</strong><small>{text}</small></span>
              </Link>
            ))}
          </div>
        </div>

        <p className="hero-copy">Merge, split, compress, edit, convert and understand your documents from one simple workspace.</p>
        <div className={`dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
          <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <div className="upload-icon"><Upload size={22} /></div><h2>{files.length ? `${files.length} PDF${files.length > 1 ? "s" : ""} ready` : "Drop your PDF here"}</h2><p>{files.length ? "Click to add more files or choose a tool below." : "or click to browse from your device"}</p><span className="file-note">PDF files · Private by default · No permanent storage</span>
        </div>
        {files.length > 0 && <div className="file-strip" onClick={(event) => event.stopPropagation()}>{files.slice(0, 3).map((file, index) => <div className="file-chip" key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}><X size={14} /></button></div>)}{files.length > 3 && <span className="more-files">+{files.length - 3} more</span>}</div>}
        {error && <p role="alert" className="error-message">{error}</p>}
        {files.length >= 2 && <button className="dark-button large merge-action" onClick={(event) => { event.stopPropagation(); void mergePdfs(); }} disabled={processing}>{processing ? "Merging PDFs…" : "Merge PDFs"} <ArrowRight size={17} /></button>}
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
        .tools-marquee{width:100vw;position:relative;left:50%;transform:translateX(-50%);overflow:hidden;margin:32px 0 36px;padding:8px 0;background:#fff}
        .tools-marquee-row{display:flex;width:max-content;align-items:center;gap:24px;padding:0 56px;margin:0;box-sizing:border-box;will-change:transform}
        .tools-marquee-row + .tools-marquee-row{margin-top:24px}
        .row-one{animation:pdfly-tools-left 52s linear infinite}
        .row-two{animation:pdfly-tools-right 56s linear infinite}
        .marquee-card{width:280px;height:90px;box-sizing:border-box;display:grid;grid-template-columns:48px minmax(0,1fr);column-gap:18px;align-items:center;padding:18px 20px;border:1px solid #e3e6de;border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(17,18,15,.05);flex:0 0 280px;text-align:left;text-decoration:none}
        .marquee-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:13px;background:#d8ff5f;color:#20221d;flex:0 0 48px}
        .marquee-content{min-width:0;display:flex;flex-direction:column;gap:5px;justify-content:center}
        .marquee-card strong{display:block;font-size:13px;line-height:18px;font-weight:700;color:#20221d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .marquee-card small{display:block;font-size:10.5px;line-height:15px;color:#777b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .marquee-fade{position:absolute;top:0;bottom:0;width:210px;z-index:5;pointer-events:none}
        .marquee-fade-left{left:0;background:linear-gradient(90deg,#fff 0%,#fff 18%,rgba(255,255,255,.9) 42%,rgba(255,255,255,0) 100%)}
        .marquee-fade-right{right:0;background:linear-gradient(270deg,#fff 0%,#fff 18%,rgba(255,255,255,.9) 42%,rgba(255,255,255,0) 100%)}
        @keyframes pdfly-tools-left{from{transform:translate3d(0,0,0)}to{transform:translate3d(-33.333333%,0,0)}}
        @keyframes pdfly-tools-right{from{transform:translate3d(-33.333333%,0,0)}to{transform:translate3d(0,0,0)}}
        @media(prefers-reduced-motion:reduce){.tools-marquee-row{animation:none}.marquee-fade{display:none}}
        @media(max-width:850px){.tools-marquee{margin:24px 0 30px;padding:6px 0}.tools-marquee-row{gap:16px;padding:0 28px}.tools-marquee-row + .tools-marquee-row{margin-top:18px}.row-one{animation-duration:42s}.row-two{animation-duration:46s}.marquee-card{width:240px;height:82px;flex-basis:240px;grid-template-columns:42px minmax(0,1fr);column-gap:14px;padding:14px 16px}.marquee-icon{width:42px;height:42px;flex-basis:42px}.marquee-card strong{font-size:12px}.marquee-card small{font-size:9.5px}.marquee-fade{width:110px}}
      `}</style>
    </main>
  );
}

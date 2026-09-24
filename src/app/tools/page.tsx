import Link from "next/link";
import { ArrowRight, Eye, FileDown, FileImage, Merge, PenLine, RotateCw, ScanText, Split } from "lucide-react";

const tools = [
  ["/", Merge, "Merge PDF", "Combine multiple PDF files into one."],
  ["/split", Split, "Split PDF", "Extract selected pages into a new PDF."],
  ["/compress", FileDown, "Compress PDF", "Reduce PDF size while keeping it usable."],
  ["/organize", RotateCw, "Organize PDF", "Reorder, delete and extract pages."],
  ["/editor", PenLine, "Edit PDF", "Add and position text on PDF pages."],
  ["/convert", FileImage, "Convert PDF", "Convert PDF to JPG or images to PDF."],
  ["/ocr", ScanText, "OCR PDF", "Extract text from scanned documents."],
  ["/viewer", Eye, "PDF Viewer", "Open, inspect, zoom and navigate PDFs."],
] as const;

export default function ToolsPage() {
  return (
    <main className="site-shell">
      <nav className="nav container">
        <Link className="brand" href="/"><span className="brand-mark"><span /></span><span>PDFly</span></Link>
        <Link className="ghost-button" href="/">Back home</Link>
      </nav>
      <section className="hero container" style={{ paddingBottom: 36 }}>
        <div className="eyebrow">PDFly toolbox</div>
        <h1>All PDF tools,<br /><span>in one place.</span></h1>
        <p className="hero-copy">Choose a tool and get straight to the workspace. Each tool has its own dedicated page.</p>
      </section>
      <section className="section container" style={{ paddingTop: 20 }}>
        <div className="tool-grid">
          {tools.map(([href, Icon, title, text]) => (
            <Link className="tool-card" href={href} key={title}>
              <span className="tool-icon"><Icon size={20} /></span>
              <span><strong>{title}</strong><small>{text}</small></span>
              <ArrowRight className="tool-arrow" size={17} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

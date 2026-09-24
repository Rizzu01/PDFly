import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDFly — Smarter documents. Less friction.",
  description: "A next-generation PDF workspace for editing, converting, organizing and understanding documents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

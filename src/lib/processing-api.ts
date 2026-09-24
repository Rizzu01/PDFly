import { consumeProcessingJob } from "./usage";

const PROCESSING_API_URL = process.env.NEXT_PUBLIC_PROCESSING_API_URL || "http://localhost:8000";

export type OcrLanguage = "eng" | "hin" | "hin+eng";
export type CompressionLevel = "light" | "balanced" | "strong";

async function processFile(path: string, file: File, params?: Record<string, string>) {
  const usage = await consumeProcessingJob();
  if (!usage.allowed) {
    throw new Error("Daily processing limit reached (5 jobs/day). Try again tomorrow or upgrade your plan.");
  }

  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${PROCESSING_API_URL}${path}${query}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Processing failed (${response.status}).`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      // Keep the generic error when the API does not return JSON.
    }
    throw new Error(message);
  }

  return response.blob();
}

export function createOcrPdf(file: File, language: OcrLanguage = "eng") {
  return processFile("/process/ocr", file, { language });
}

export function compressOnServer(file: File, level: CompressionLevel = "balanced") {
  return processFile("/process/compress", file, { level });
}

export function convertPdfToJpg(file: File) {
  return processFile("/process/pdf-to-jpg", file);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

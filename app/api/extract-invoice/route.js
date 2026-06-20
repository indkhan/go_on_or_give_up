import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

import { extractFields } from "./parse.js";

// Tesseract (WASM) + pdf-parse need the Node runtime, not edge.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

// Reuse one OCR worker across requests (first init downloads eng traineddata).
let workerPromise = null;
async function getWorker() {
  if (!workerPromise) workerPromise = createWorker("eng");
  return workerPromise;
}

async function ocrImage(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return {
    text: data?.text || "",
    confidence: typeof data?.confidence === "number" ? data.confidence : null,
  };
}

async function readPdfText(buffer) {
  // pdf-parse v2 is class-based; reads the embedded text layer (no OCR).
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { text: result?.text || "", pages: result?.total ?? null };
  } finally {
    await parser.destroy?.();
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { ok: false, error: "No file uploaded. Send multipart/form-data with a 'file' field." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ ok: false, error: "Empty file." }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 10MB)." }, { status: 400 });
    }

    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    const isPdf = type === "application/pdf" || name.endsWith(".pdf");
    const isImage = IMAGE_TYPES.includes(type) || /\.(jpe?g|png|webp|bmp|tiff?)$/.test(name);

    let text = "";
    let source = "";
    let ocrConfidence = null;
    let needsReview = false;
    let note = null;

    if (isPdf) {
      const pdf = await readPdfText(buffer);
      if (pdf.text.trim().length >= 20) {
        text = pdf.text;
        source = "pdf-text";
      } else {
        // Scanned/image-only PDF: no embedded text layer to read.
        source = "pdf-no-text";
        needsReview = true;
        note = "Scanned PDF with no text layer. Re-upload the invoice as a JPEG/PNG for OCR.";
      }
    } else if (isImage) {
      const ocr = await ocrImage(buffer);
      text = ocr.text;
      ocrConfidence = ocr.confidence;
      source = "ocr";
      if (ocrConfidence != null && ocrConfidence < 70) needsReview = true;
    } else {
      return NextResponse.json(
        { ok: false, error: `Unsupported file type '${type || name || "unknown"}'. Use PDF or JPEG/PNG.` },
        { status: 400 },
      );
    }

    const { fields, meta } = extractFields(text);
    if (meta.missing.length > 0) needsReview = true;

    return NextResponse.json({
      ok: true,
      data: fields,
      meta: {
        source,
        ocrConfidence,
        needsReview,
        amountMethod: meta.amountMethod,
        orgsFound: meta.orgsFound,
        missing: meta.missing,
        rawTextLength: text.length,
        ...(note ? { note } : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Extraction failed." },
      { status: 500 },
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native/WASM deps out of the server bundle so OCR + PDF parsing work.
  serverExternalPackages: ["tesseract.js", "pdf-parse"],
};

export default nextConfig;

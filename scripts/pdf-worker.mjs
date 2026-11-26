import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const assets = new URL("../public/_openbill/", import.meta.url);
await mkdir(assets, { recursive: true });
await copyFile(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"), new URL("pdf.worker.mjs", assets));

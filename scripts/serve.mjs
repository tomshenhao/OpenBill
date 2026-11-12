import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

// A local-only server for the static export. It has no input endpoint or request log.
const outputDirectory = resolve("out");
const portFlag = process.argv.indexOf("--port");
const port = Number(portFlag < 0 ? 3000 : process.argv[portFlag + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Use a valid port from 1 to 65535.");
await stat(resolve(outputDirectory, "index.html")).catch(() => {
  throw new Error("Static output is missing. Run npm run build first.");
});

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let file;
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    file = resolve(outputDirectory, `.${pathname}`);
    if (file !== outputDirectory && !file.startsWith(`${outputDirectory}${sep}`)) throw new Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    if (!(await stat(file)).isFile()) throw new Error("Not a file");
  } catch {
    response.statusCode = 404;
    file = resolve(outputDirectory, "404.html");
  }
  response.setHeader("Content-Type", mimeTypes[extname(file)] ?? "application/octet-stream");
  if (request.method === "HEAD") response.end();
  else createReadStream(file).on("error", () => response.destroy()).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.info(`OpenBill local preview: http://127.0.0.1:${port}`);
});

import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5174);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const safePath = (urlPath) => {
  const cleaned = decodeURIComponent(urlPath.split("?")[0]);
  const withIndex = cleaned.endsWith("/") ? `${cleaned}index.html` : cleaned;
  const resolved = normalize(join(root, withIndex));
  if (!resolved.startsWith(root)) return null;
  return resolved;
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const filePath = safePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      res.writeHead(301, { Location: req.url.replace(/\/+$/, "") + "/" });
      res.end();
      return;
    }
    const ext = extname(filePath).toLowerCase();
    const type = mime[ext] || "application/octet-stream";
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Static dev server on http://localhost:${port}`);
});
import fs from "node:fs/promises";
import path from "node:path";
import { request } from "node:https";
import { createHash } from "node:crypto";

const API_URL =
  "https://nrchd.kz/api/clinical-protocols?folder=%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B%2F%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B";

const OUT_DIR = path.resolve("data/kz_clinical_protocols/nrchd_official");
const PDF_DIR = path.join(OUT_DIR, "pdf");
const CONCURRENCY = Number(process.env.CONCURRENCY || 12);

function get(url, { binary = false, maxMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const req = request(url, { headers: { "user-agent": "Mozilla/5.0 nrchd-protocol-downloader" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(new URL(res.headers.location, url).toString(), { binary, maxMs }));
        return;
      }
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.toString("utf8").slice(0, 200)}`));
          return;
        }
        resolve({ headers: res.headers, body: binary ? body : body.toString("utf8") });
      });
    });
    req.setTimeout(maxMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

function fileNameFor(doc) {
  const hash = createHash("sha1").update(doc.url).digest("hex").slice(0, 10);
  const year = doc.year ? `${doc.year}_` : "";
  return `${year}${slugify(doc.name) || "protocol"}_${hash}.pdf`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function mapLimit(items, limit, fn) {
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = index++;
      await fn(items[current], current);
    }
  });
  await Promise.all(workers);
}

await fs.mkdir(PDF_DIR, { recursive: true });

console.log(`Fetching NRCHD index: ${API_URL}`);
const { body } = await get(API_URL);
const payload = JSON.parse(body);
const docs = payload.documents || payload.protocols || [];
await fs.writeFile(path.join(OUT_DIR, "nrchd_protocols_raw.json"), JSON.stringify(payload, null, 2));

const records = docs.map((doc) => ({
  name: doc.name,
  year: doc.year || "",
  medicine: doc.medicine || "",
  mkb: doc.mkb || "",
  size: doc.size || "",
  modified: doc.modified || "",
  url: doc.url,
  local_file: path.join("pdf", fileNameFor(doc)),
  status: "pending",
}));

await mapLimit(records, CONCURRENCY, async (record, i) => {
  const target = path.join(OUT_DIR, record.local_file);
  try {
    const existing = await fs.stat(target).catch(() => null);
    if (existing && (!record.size || existing.size === Number(record.size))) {
      record.status = "exists";
      return;
    }
    const { body: pdf } = await get(record.url, { binary: true });
    await fs.writeFile(target, pdf);
    record.status = "ok";
    record.downloaded_size = pdf.length;
  } catch (err) {
    record.status = `error: ${err.message}`;
  }
  if ((i + 1) % 25 === 0 || i === records.length - 1) {
    const done = records.filter((x) => x.status !== "pending").length;
    console.log(`Downloaded/checked ${done}/${records.length}`);
  }
});

await fs.writeFile(path.join(OUT_DIR, "nrchd_protocols_index.json"), JSON.stringify(records, null, 2));
const rows = [
  ["name", "year", "medicine", "mkb", "size", "modified", "url", "local_file", "status"],
  ...records.map((x) => [x.name, x.year, x.medicine, x.mkb, x.size, x.modified, x.url, x.local_file, x.status]),
];
await fs.writeFile(path.join(OUT_DIR, "nrchd_protocols_index.csv"), rows.map((row) => row.map(csvEscape).join(",")).join("\n"));

const ok = records.filter((x) => x.status === "ok" || x.status === "exists").length;
const errors = records.length - ok;
console.log(`Done. Documents: ${records.length}; available locally: ${ok}; errors: ${errors}; output: ${OUT_DIR}`);

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { request } from "node:https";

const ROOT_URL =
  "https://diseases.medelement.com/?category_mkb=0&diseases_content_type=4&diseases_filter_type=list&mq=&parent_category_mkb=0&q=&searched_data=diseases&section_medicine=0&tq=";
const OUT_DIR = path.resolve("data/kz_clinical_protocols");
const HTML_DIR = path.join(OUT_DIR, "medelement_html");
const PDF_DIR = path.join(OUT_DIR, "nrchd_pdfs");

const NRCHD_PDFS = [
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9C%D0%B5%D1%82%D0%BE%D0%B4%D0%B8%D1%87%D0%BA%D0%B0%D1%8F%20%D1%80%D0%B5%D0%BA%D0%BE%D0%BC%D0%B5%D0%BD%D0%B4%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BF%D0%BE%20%D0%9A%D0%9F.pdf",
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9D%D0%B0%D0%B1%D0%BE%D1%80%20%E2%80%94%20%D0%9D%D0%BE%D1%80%D0%BC%D0%B0%D1%82%D0%B8%D0%B2%D0%BD%D0%BE-%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D0%B2%D1%8B%D0%B5%20%D0%B0%D0%BA%D1%82%D1%8B/%D0%9C%D0%A0%20%D0%BF%D0%BE%20%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B5%20%D0%B8%20%D0%BF%D0%B5%D1%80%D0%B5%D1%81%D0%BC%D0%BE%D1%82%D1%80%D1%83%20%D0%9A%D0%9F.pdf",
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%94%D0%9E%D0%91%D0%A0%D0%9E%D0%9A%D0%90%D0%A7%D0%95%D0%A1%D0%A2%D0%92%D0%95%D0%9D%D0%9D%D0%AB%D0%95%20%D0%9D%D0%9E%D0%92%D0%9E%D0%9E%D0%91%D0%A0%D0%90%D0%97%D0%9E%D0%92%D0%90%D0%9D%D0%98%D0%AF%20%D0%9C%D0%9E%D0%9B%D0%9E%D0%A7%D0%9D%D0%9E%D0%99%20%D0%96%D0%95%D0%9B%D0%95%D0%97%D0%AB.pdf",
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%A0%D0%B5%D0%B2%D0%BC%D0%B0%D1%82%D0%BE%D0%B8%D0%B4%D0%BD%D1%8B%D0%B9%20%D0%B0%D1%80%D1%82%D1%80%D0%B8%D1%82.pdf",
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%A1%D0%BE%D1%81%D1%83%D0%B4%D0%B8%D1%81%D1%82%D0%B0%D1%8F%20%D0%B4%D0%B5%D0%BC%D0%B5%D0%BD%D1%86%D0%B8%D1%8F%20%28%D0%B2%D0%BA%D0%BB%D1%8E%D1%87%D0%B0%D0%B5%D1%82%D1%81%D1%8F%20%D0%B0%D1%82%D0%B5%D1%80%D0%BE%D1%81%D0%BA%D0%BB%D0%B5%D1%80%D0%BE%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B4%D0%B5%D0%BC%D0%B5%D0%BD%D1%86%D0%B8%D1%8F%29.pdf",
  "https://nrchd.kz/storage/documents/%D0%9A%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D0%BE%D1%82%D0%BE%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%BE%D0%BB%D1%8B/%D0%9F%D1%81%D0%B8%D1%85%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D0%B8%20%D0%BF%D0%BE%D0%B2%D0%B5%D0%B4%D0%B5%D0%BD%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5%20%D1%80%D0%B0%D1%81%D1%81%D1%82%D1%80%D0%BE%D0%B9%D1%81%D1%82%D0%B2%D0%B0%2C%20%D0%B2%D1%8B%D0%B7%D0%B2%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5%20%D1%83%D0%BF%D0%BE%D1%82%D1%80%D0%B5%D0%B1%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D0%BC%20%D0%B0%D0%BB%D0%BA%D0%BE%D0%B3%D0%BE%D0%BB%D1%8F%20%D1%83%20%D0%BD%D0%B5%D1%81%D0%BE%D0%B2%D0%B5%D1%80%D1%88%D0%B5%D0%BD%D0%BD%D0%BE%D0%BB%D0%B5%D1%82%D0%BD%D0%B8%D1%85%20%287-18%20%D0%BB%D0%B5%D1%82%29.pdf",
];

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 110);
}

function uniqueFileName(title, ext, fallback) {
  const slug = slugify(title) || fallback;
  const hash = createHash("sha1").update(title).digest("hex").slice(0, 8);
  return `${slug}_${hash}.${ext}`;
}

function getWithIdleTimeout(url, { idleMs = 2500, maxMs = 30000, binary = false } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const req = request(url, { headers: { "user-agent": "Mozilla/5.0 protocol-downloader" } }, (res) => {
      let idleTimer;
      const finish = () => {
        clearTimeout(idleTimer);
        clearTimeout(maxTimer);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString("utf8"),
        });
      };
      const armIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => req.destroy(new Error("idle-timeout")), idleMs);
      };
      res.on("data", (chunk) => {
        chunks.push(chunk);
        armIdle();
      });
      res.on("end", finish);
      res.on("aborted", finish);
      armIdle();
    });
    const maxTimer = setTimeout(() => req.destroy(new Error("max-timeout")), maxMs);
    req.on("error", (err) => {
      if ((err.message === "idle-timeout" || err.message === "max-timeout") && chunks.length) {
        clearTimeout(maxTimer);
        resolve({ statusCode: 200, headers: {}, body: binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString("utf8") });
        return;
      }
      clearTimeout(maxTimer);
      reject(err);
    });
    req.end();
  });
}

function extractListItems(html) {
  const blocks = [...html.matchAll(/<h2>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]*?)(?=<h2>|<ul class="pagination"|$)/g)];
  return blocks.map(([, href, rawTitle, rest]) => {
    const version = rest.match(/Версия:\s*([^<]+)/)?.[1] ?? "";
    const mkb = rest.match(/МКБ-10:\s*([\s\S]*?)(?:<br|Раздел медицины:|<\/p>|$)/)?.[1] ?? "";
    const section = rest.match(/Раздел медицины:\s*([^<]+)/)?.[1] ?? "";
    const url = href.startsWith("http") ? href : `https://diseases.medelement.com${href}`;
    return {
      title: decodeHtml(rawTitle.replace(/<[^>]+>/g, "")),
      url,
      version: decodeHtml(version.replace(/<[^>]+>/g, "")),
      mkb10: decodeHtml(mkb.replace(/<[^>]+>/g, "")),
      section: decodeHtml(section.replace(/<[^>]+>/g, "")),
    };
  });
}

function nextPageUrl(html) {
  const match = html.match(/<a\s+href="([^"]+)"[^>]*>\s*Вперед\s*→\s*<\/a>/);
  if (!match) return null;
  return match[1].startsWith("http") ? match[1] : `https://diseases.medelement.com${match[1]}`;
}

async function ensureDirs() {
  await fs.mkdir(HTML_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });
}

async function downloadMedElement(limit) {
  const all = [];
  let url = ROOT_URL;
  let page = 1;
  while (url && (!limit || all.length < limit)) {
    console.log(`Fetching list page ${page}: ${url}`);
    const { body } = await getWithIdleTimeout(url);
    const items = extractListItems(body);
    all.push(...items);
    url = nextPageUrl(body);
    page += 1;
  }

  const selected = limit ? all.slice(0, limit) : all;
  for (let i = 0; i < selected.length; i += 1) {
    const item = selected[i];
    const file = uniqueFileName(item.title, "html", `protocol_${i + 1}`);
    item.local_file = path.relative(OUT_DIR, path.join(HTML_DIR, file));
    try {
      const { body } = await getWithIdleTimeout(item.url, { idleMs: 3500, maxMs: 45000 });
      await fs.writeFile(path.join(HTML_DIR, file), body);
      item.download_status = "ok";
    } catch (err) {
      item.download_status = `error: ${err.message}`;
    }
    if ((i + 1) % 25 === 0 || i === selected.length - 1) {
      console.log(`Downloaded MedElement pages: ${i + 1}/${selected.length}`);
    }
  }
  return selected;
}

async function downloadNrchdPdfs() {
  const records = [];
  for (const url of NRCHD_PDFS) {
    const decodedName = decodeURIComponent(url.split("/").pop());
    const title = decodedName.replace(/\.pdf$/i, "");
    const file = uniqueFileName(title, "pdf", "nrchd_protocol");
    const fullPath = path.join(PDF_DIR, file);
    const record = { title, url, source: "nrchd.kz", local_file: path.relative(OUT_DIR, fullPath) };
    try {
      const { body, headers } = await getWithIdleTimeout(url, { idleMs: 5000, maxMs: 60000, binary: true });
      await fs.writeFile(fullPath, body);
      record.download_status = "ok";
      record.content_type = headers["content-type"] ?? "";
      record.bytes = body.length;
    } catch (err) {
      record.download_status = `error: ${err.message}`;
    }
    records.push(record);
    console.log(`Downloaded NRCHD PDF: ${record.title}`);
  }
  return records;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeIndex(medElement, nrchd) {
  await fs.writeFile(path.join(OUT_DIR, "protocols_index.json"), JSON.stringify({ medelement: medElement, nrchd }, null, 2));
  const rows = [
    ["source", "title", "version", "mkb10", "section", "url", "local_file", "download_status"],
    ...medElement.map((x) => ["medelement.com", x.title, x.version, x.mkb10, x.section, x.url, x.local_file, x.download_status]),
    ...nrchd.map((x) => ["nrchd.kz", x.title, "", "", "", x.url, x.local_file, x.download_status]),
  ];
  await fs.writeFile(path.join(OUT_DIR, "protocols_index.csv"), rows.map((row) => row.map(csvEscape).join(",")).join("\n"));
}

await ensureDirs();
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;
const medElement = await downloadMedElement(Number.isFinite(limit) ? limit : 0);
const nrchd = await downloadNrchdPdfs();
await writeIndex(medElement, nrchd);
console.log(`Done. MedElement: ${medElement.length}; NRCHD PDFs: ${nrchd.length}; output: ${OUT_DIR}`);

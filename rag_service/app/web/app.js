const queryEl = document.querySelector("#query");
const topKEl = document.querySelector("#topK");
const analyzeBtn = document.querySelector("#analyze");
const resultsEl = document.querySelector("#results");
const healthEl = document.querySelector("#health");

async function loadHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    healthEl.textContent = `${data.chunks} chunks ready`;
  } catch {
    healthEl.textContent = "Index unavailable";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items, className = "small-list") {
  if (!items || items.length === 0) return "";
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderAnalysis(data) {
  const diagnoses = data.diagnoses || [];
  const sourcesById = new Map((data.sources || []).map((source) => [source.source_id, source]));

  resultsEl.innerHTML = `
    <section class="section">
      <h2>Status: ${escapeHtml(data.status)}</h2>
      <p class="summary">${escapeHtml(data.summary)}</p>
      ${renderList(data.red_flags || [], "small-list bad")}
      ${renderList(data.missing_questions || [])}
    </section>

    <section class="section">
      <h2>Дифференциальные диагнозы</h2>
      <div class="diagnosis-list">
        ${
          diagnoses.length
            ? diagnoses
                .map(
                  (item) => `
                    <article class="diagnosis">
                      <div class="diagnosis-head">
                        <h3>${item.rank}. ${escapeHtml(item.diagnosis)}</h3>
                        <span class="code">${escapeHtml(item.icd10_code)}</span>
                      </div>
                      <p class="explanation">${escapeHtml(item.explanation)}</p>
                      ${renderList(item.supporting_findings || [])}
                      ${(item.source_ids || [])
                        .map((id) => sourcesById.get(id))
                        .filter(Boolean)
                        .map(
                          (source) => `
                            <div class="source">
                              <div class="source-title">${escapeHtml(source.source_id)} · ${escapeHtml(source.title)}</div>
                              <div class="source-text">${escapeHtml(source.text)}</div>
                            </div>
                          `,
                        )
                        .join("")}
                    </article>
                  `,
                )
                .join("")
            : `<div class="empty">Диагнозы не сформированы: недостаточно данных или слабое извлечение.</div>`
        }
      </div>
    </section>

    <section class="section">
      <h2>Черновик записи</h2>
      <p><strong>Жалобы:</strong> ${escapeHtml(data.draft_note?.complaints || "")}</p>
      <p><strong>Анамнез:</strong> ${escapeHtml(data.draft_note?.history || "")}</p>
      <p><strong>Оценка:</strong> ${escapeHtml(data.draft_note?.assessment || "")}</p>
      <p><strong>План:</strong> ${escapeHtml(data.draft_note?.plan || "")}</p>
    </section>
  `;
}

async function analyze() {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing";
  resultsEl.innerHTML = `<div class="empty">Searching protocols...</div>`;
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        query: queryEl.value,
        top_k: Number(topKEl.value),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    renderAnalysis(await res.json());
  } catch (error) {
    resultsEl.innerHTML = `<div class="empty">Error: ${escapeHtml(error.message)}</div>`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze";
  }
}

analyzeBtn.addEventListener("click", analyze);
loadHealth();

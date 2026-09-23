(() => {
  "use strict";
  const documents = JSON.parse(document.getElementById("document-index").textContent);
  const form = document.getElementById("document-search");
  const input = document.getElementById("search-input");
  const clearButton = document.getElementById("clear-search");
  const count = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const normalize = value => value.normalize("NFKC").toLocaleLowerCase("ja");
  const entries = documents.map(item => ({
    ...item,
    searchable: normalize([item.title, item.description, ...item.tags, item.text].join(" ")),
    element: document.getElementById(item.id),
  }));

  function updateSearch() {
    const query = input.value.trim();
    const terms = normalize(query).split(/\s+/u).filter(Boolean);
    let matches = 0;
    for (const entry of entries) {
      const match = terms.every(term => entry.searchable.includes(term));
      entry.element.hidden = !match;
      if (match) matches += 1;
      const excerpt = entry.element.querySelector(".search-excerpt");
      excerpt.hidden = true;
      if (match && terms.length) {
        // Normalize the displayed text too, so offsets work with full-width input.
        const body = entry.text.normalize("NFKC");
        const normalizedBody = normalize(body);
        const positions = terms.map(term => normalizedBody.indexOf(term)).filter(index => index >= 0);
        if (positions.length) {
          const start = Math.max(0, Math.min(...positions) - 36);
          const end = Math.min(body.length, start + 160);
          excerpt.textContent = `${start ? "…" : ""}${body.slice(start, end)}${end < body.length ? "…" : ""}`;
          excerpt.hidden = false;
        }
      }
    }
    count.textContent = query ? `${matches} / ${entries.length} 件` : `${entries.length} 件`;
    emptyState.hidden = matches !== 0;
    clearButton.hidden = !input.value;
    // Keep searches bookmarkable without adding a history entry per keystroke.
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    try { window.history.replaceState(null, "", url); } catch { /* Local file previews can restrict history. */ }
  }

  function resetSearch() {
    input.value = "";
    updateSearch();
    input.focus();
  }

  let composing = false;
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; updateSearch(); });
  input.addEventListener("input", event => {
    if (!composing && !event.isComposing) updateSearch();
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape" && !event.isComposing && !composing) resetSearch();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!composing) updateSearch();
  });
  clearButton.addEventListener("click", resetSearch);
  document.getElementById("reset-search").addEventListener("click", resetSearch);
  window.addEventListener("popstate", () => {
    input.value = new URL(window.location.href).searchParams.get("q") || "";
    updateSearch();
  });
  input.value = new URL(window.location.href).searchParams.get("q") || "";
  updateSearch();
  form.hidden = false;
})();

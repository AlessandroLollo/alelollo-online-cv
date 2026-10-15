/* Progressive enhancement: every résumé section remains readable without JS. */
(() => {
  "use strict";
  const views = Array.from(document.querySelectorAll(".view"));
  const links = Array.from(document.querySelectorAll("[data-view]"));
  const search = document.getElementById("experience-search");
  const rows = Array.from(document.querySelectorAll("[data-record]"));
  const count = document.getElementById("result-count");
  const empty = document.getElementById("no-results");
  const breadcrumb = document.getElementById("breadcrumb-view");

  function activate() {
    const id = location.hash.slice(1) || "overview";
    const record = /^record-\d+$/.test(id) ? document.getElementById(id) : null;
    const selected = record
      ? "experience"
      : views.some((view) => view.id === id)
        ? id
        : "overview";
    views.forEach((view) => {
      view.hidden = view.id !== selected;
    });
    links.forEach((link) => {
      if (link.dataset.view === selected)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    breadcrumb.textContent =
      selected === "opensource" ? "open_source" : selected;
    document.title = `Alessandro Lollo · ${selected === "opensource" ? "Open source" : selected[0].toUpperCase() + selected.slice(1)}`;
    if (record) {
      // A direct record link must remain visible after a previous search.
      search.value = "";
      search.dispatchEvent(new Event("input"));
      record.open = true;
      requestAnimationFrame(() => {
        record.scrollIntoView({ block: "start" });
        record.querySelector("summary").focus({ preventScroll: true });
      });
    }
  }

  search.addEventListener("input", () => {
    const query = search.value.toLocaleLowerCase().trim();
    let matches = 0;
    rows.forEach((row) => {
      const match = row.textContent.toLocaleLowerCase().includes(query);
      row.hidden = !match;
      matches += Number(match);
      document.getElementById(`record-${row.dataset.record}`).hidden = !match;
    });
    count.textContent = `${matches} ${matches === 1 ? "record" : "records"}`;
    empty.hidden = matches !== 0;
  });

  document.querySelectorAll("[data-record-link]").forEach((link) => {
    link.href = `#record-${link.dataset.recordLink}`;
  });
  links.forEach((link) =>
    link.addEventListener("click", () => {
      // Clicking an already selected section should still return to its heading.
      if (location.hash === link.hash)
        document.getElementById(link.dataset.view).scrollIntoView();
    }),
  );
  window.addEventListener("hashchange", activate);
  activate();
})();

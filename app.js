const state = {
  prints: [],
  grade: "all",
  category: "all",
  answer: "all",
  query: "",
  selectedId: null,
};

const list = document.querySelector("#printList");
const searchInput = document.querySelector("#searchInput");
const gradeFilters = document.querySelector("#gradeFilters");
const categoryFilters = document.querySelector("#categoryFilters");
const answerFilters = document.querySelector("#answerFilters");
const resetButton = document.querySelector("#resetButton");
const visibleCount = document.querySelector("#visibleCount");
const totalCount = document.querySelector("#totalCount");
const currentSummary = document.querySelector("#currentSummary");
const pdfFrame = document.querySelector("#pdfFrame");
const viewerTitle = document.querySelector("#viewerTitle");
const viewerMeta = document.querySelector("#viewerMeta");
const openLink = document.querySelector("#openLink");

const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

function unique(values) {
  return [...new Set(values)].sort(collator.compare);
}

function makeChip(label, value, target, activeValue) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip${value === activeValue ? " active" : ""}`;
  button.dataset[target] = value;
  button.textContent = label;
  return button;
}

function renderFilters() {
  gradeFilters.replaceChildren(
    makeChip("すべて", "all", "grade", state.grade),
    ...unique(state.prints.map((item) => item.grade)).map((grade) =>
      makeChip(grade, grade, "grade", state.grade),
    ),
  );

  categoryFilters.replaceChildren(
    makeChip("すべて", "all", "category", state.category),
    ...unique(state.prints.map((item) => item.category)).map((category) =>
      makeChip(category.replace("読解_", ""), category, "category", state.category),
    ),
  );
}

function matches(item) {
  const haystack = `${item.grade} ${item.category} ${item.title}`.toLowerCase();
  const query = state.query.trim().toLowerCase();
  return (
    (state.grade === "all" || item.grade === state.grade) &&
    (state.category === "all" || item.category === state.category) &&
    (state.answer === "all" ||
      (state.answer === "answer" && item.answer) ||
      (state.answer === "worksheet" && !item.answer)) &&
    (!query || haystack.includes(query))
  );
}

function fileUrl(item) {
  return encodeURI(`./${item.file}`);
}

function renderList() {
  const filtered = state.prints.filter(matches);
  visibleCount.textContent = filtered.length;
  currentSummary.textContent = summaryText(filtered.length);

  if (!filtered.length) {
    list.replaceChildren(Object.assign(document.createElement("p"), {
      className: "empty",
      textContent: "条件に合うプリントがありません。",
    }));
    return;
  }

  list.replaceChildren(...filtered.map(renderCard));

  if (!state.selectedId || !filtered.some((item) => item.id === state.selectedId)) {
    selectPrint(filtered[0], false);
  } else {
    markActiveCard();
  }
}

function summaryText(count) {
  const parts = [];
  if (state.grade !== "all") parts.push(state.grade);
  if (state.category !== "all") parts.push(state.category.replace("読解_", ""));
  if (state.answer === "answer") parts.push("解答");
  if (state.answer === "worksheet") parts.push("問題");
  if (state.query) parts.push(`「${state.query}」`);
  return parts.length ? `${parts.join(" / ")}: ${count}件` : `すべてのプリント: ${count}件`;
}

function renderCard(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `print-card${item.id === state.selectedId ? " active" : ""}`;
  button.dataset.id = item.id;
  button.innerHTML = `
    <span class="print-title">${escapeHtml(item.title)}</span>
    <span class="print-meta">
      <span class="badge">${escapeHtml(item.grade)}</span>
      <span class="badge">${escapeHtml(item.category.replace("読解_", ""))}</span>
      <span class="badge${item.answer ? " answer" : ""}">${item.answer ? "解答" : "問題"}</span>
    </span>
  `;
  button.addEventListener("click", () => selectPrint(item));
  return button;
}

function selectPrint(item, focus = true) {
  state.selectedId = item.id;
  viewerTitle.textContent = item.title;
  viewerMeta.textContent = `${item.grade} / ${item.category.replace("読解_", "")} / ${item.answer ? "解答" : "問題"}`;
  pdfFrame.src = fileUrl(item);
  openLink.href = fileUrl(item);
  openLink.classList.remove("disabled");
  markActiveCard();
  if (focus) pdfFrame.scrollIntoView({ block: "nearest" });
}

function markActiveCard() {
  document.querySelectorAll(".print-card").forEach((card) => {
    card.classList.toggle("active", Number(card.dataset.id) === state.selectedId);
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

gradeFilters.addEventListener("click", (event) => {
  const grade = event.target.dataset.grade;
  if (!grade) return;
  state.grade = grade;
  renderFilters();
  renderList();
});

categoryFilters.addEventListener("click", (event) => {
  const category = event.target.dataset.category;
  if (!category) return;
  state.category = category;
  renderFilters();
  renderList();
});

answerFilters.addEventListener("click", (event) => {
  const answer = event.target.dataset.answer;
  if (!answer) return;
  state.answer = answer;
  answerFilters.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.answer === answer);
  });
  renderList();
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderList();
});

resetButton.addEventListener("click", () => {
  state.grade = "all";
  state.category = "all";
  state.answer = "all";
  state.query = "";
  searchInput.value = "";
  answerFilters.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.answer === "all");
  });
  renderFilters();
  renderList();
});

fetch("./public/prints.json")
  .then((response) => response.json())
  .then((prints) => {
    state.prints = prints.sort((a, b) =>
      collator.compare(`${a.grade}/${a.category}/${a.title}/${a.answer}`, `${b.grade}/${b.category}/${b.title}/${b.answer}`),
    );
    totalCount.textContent = state.prints.length;
    renderFilters();
    renderList();
  })
  .catch(() => {
    currentSummary.textContent = "プリント一覧を読み込めませんでした。";
  });

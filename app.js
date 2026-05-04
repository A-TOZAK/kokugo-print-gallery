const REPO = "A-TOZAK/kokugo-print-gallery";
const COMMENT_LABEL = "print-comment";
const QUICK_TOPICS = ["漢字", "説明文", "物語文", "語彙", "作文", "記録文", "詩"];

const state = {
  prints: [],
  grade: "all",
  category: "all",
  answer: "all",
  query: "",
  selectedId: null,
  comments: [],
};

const homePage = document.querySelector("#homePage");
const galleryPage = document.querySelector("#galleryPage");
const homeLink = document.querySelector("#homeLink");
const galleryLink = document.querySelector("#galleryLink");
const recentUpdates = document.querySelector("#recentUpdates");
const homeOverview = document.querySelector("#homeOverview");
const homeUpdateCount = document.querySelector("#homeUpdateCount");
const commentFeed = document.querySelector("#commentFeed");
const commentStatus = document.querySelector("#commentStatus");
const list = document.querySelector("#printList");
const searchInput = document.querySelector("#searchInput");
const topicFilters = document.querySelector("#topicFilters");
const gradeFilters = document.querySelector("#gradeFilters");
const categoryFilters = document.querySelector("#categoryFilters");
const answerFilters = document.querySelector("#answerFilters");
const sidebarOverview = document.querySelector("#sidebarOverview");
const resetButton = document.querySelector("#resetButton");
const visibleCount = document.querySelector("#visibleCount");
const totalCount = document.querySelector("#totalCount");
const currentSummary = document.querySelector("#currentSummary");
const pdfFrame = document.querySelector("#pdfFrame");
const viewerTitle = document.querySelector("#viewerTitle");
const viewerMeta = document.querySelector("#viewerMeta");
const openLink = document.querySelector("#openLink");
const commentLink = document.querySelector("#commentLink");
const closeViewer = document.querySelector("#closeViewer");
const viewer = document.querySelector(".viewer");
const gradeIndicator = document.querySelector("#gradeIndicator");

function isMobile() {
  return window.innerWidth <= 760;
}

closeViewer.addEventListener("click", () => {
  viewer.classList.remove("mobile-open");
  document.body.classList.remove("viewer-open");
});

const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

function unique(values) {
  return [...new Set(values)].sort(collator.compare);
}

function makeChip(label, value, target, activeValue) {
  const button = document.createElement("button");
  button.type = "button";
  const isActive = value === activeValue;
  button.className = `chip${isActive ? " active" : ""}`;
  button.dataset[target] = value;
  button.textContent = isActive ? `✓ ${label}` : label;
  return button;
}

function switchPage() {
  const hash = window.location.hash === "#gallery" ? "#gallery" : "#home";
  homePage.hidden = hash !== "#home";
  galleryPage.hidden = hash !== "#gallery";
  homeLink.classList.toggle("active", hash === "#home");
  galleryLink.classList.toggle("active", hash === "#gallery");
}

function renderFilters() {
  gradeIndicator.textContent = state.grade === "all" ? "" : state.grade;

  topicFilters.replaceChildren(
    ...QUICK_TOPICS.map((topic) => makeChip(topic, topic, "topic", state.query)),
  );

  gradeFilters.replaceChildren(
    makeChip("すべて", "all", "grade", state.grade),
    ...unique(state.prints.map((item) => item.grade)).map((grade) =>
      makeChip(grade, grade, "grade", state.grade),
    ),
  );

  categoryFilters.replaceChildren(
    makeChip("すべて", "all", "category", state.category),
    ...unique(state.prints.map((item) => item.category)).map((category) =>
      makeChip(category, category, "category", state.category),
    ),
  );
}

function matches(item) {
  const haystack = `${item.grade} ${item.category} ${item.title} ${item.file}`.toLowerCase();
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
  return encodeURI(`./public/${item.file}`);
}

function githubIssueUrl(item) {
  const title = `[コメント] ${item.grade} ${item.category} ${item.title}${item.answer ? " 解答" : " 問題"}`;
  const body = [
    "このプリントへのコメントを書いてください。",
    "",
    `print-id: ${item.id}`,
    `print-file: ${item.file}`,
    `print-title: ${item.grade} / ${item.category} / ${item.title} / ${item.answer ? "解答" : "問題"}`,
  ].join("\n");
  const params = new URLSearchParams({
    title,
    body,
    labels: COMMENT_LABEL,
  });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
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
    clearViewer();
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
  if (state.category !== "all") parts.push(state.category);
  if (state.answer === "answer") parts.push("解答");
  if (state.answer === "worksheet") parts.push("問題");
  if (state.query) parts.push(`「${state.query}」`);
  return parts.length ? `${parts.join(" / ")}: ${count}件` : `すべてのプリント: ${count}件`;
}

function renderCard(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `print-card${item.answer ? " answer" : ""}${item.id === state.selectedId ? " active" : ""}`;
  button.dataset.id = item.id;
  button.innerHTML = `
    <span class="print-title${item.answer ? " answer" : ""}">${escapeHtml(item.title)}${item.answer ? " 解答" : ""}</span>
    <span class="print-meta">
      <span class="badge">${escapeHtml(item.grade)}</span>
      <span class="badge">${escapeHtml(item.category)}</span>
      <span class="badge${item.answer ? " answer" : ""}">${item.answer ? "解答" : "問題"}</span>
    </span>
  `;
  button.addEventListener("click", () => selectPrint(item));
  return button;
}

function selectPrint(item, focus = true) {
  state.selectedId = item.id;
  viewerTitle.textContent = `${item.title}${item.answer ? " 解答" : ""}`;
  viewerTitle.classList.toggle("viewer-title-answer", item.answer);
  viewerMeta.textContent = `${item.grade} / ${item.category} / ${item.answer ? "解答" : "問題"}`;
  pdfFrame.src = fileUrl(item);
  openLink.href = fileUrl(item);
  commentLink.href = githubIssueUrl(item);
  openLink.classList.remove("disabled");
  commentLink.classList.remove("disabled");
  markActiveCard();
  if (isMobile()) {
    viewer.classList.add("mobile-open");
    document.body.classList.add("viewer-open");
  }
}

function clearViewer() {
  state.selectedId = null;
  viewerTitle.textContent = "条件に合うPDFがありません";
  viewerTitle.classList.remove("viewer-title-answer");
  viewerMeta.textContent = "絞り込み条件を変更してください";
  pdfFrame.removeAttribute("src");
  openLink.href = "#";
  commentLink.href = "#";
  openLink.classList.add("disabled");
  commentLink.classList.add("disabled");
}

function markActiveCard() {
  document.querySelectorAll(".print-card").forEach((card) => {
    card.classList.toggle("active", Number(card.dataset.id) === state.selectedId);
  });
}

function renderOverview() {
  const grouped = unique(state.prints.map((item) => item.category)).map((category) => {
    const items = state.prints.filter((item) => item.category === category);
    const grades = unique(items.map((item) => item.grade)).join("・");
    return { category, count: items.length, grades };
  });

  sidebarOverview.replaceChildren(...grouped.map(({ category, count, grades }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(category)}</strong><span>${count}件 / ${escapeHtml(grades)}</span>`;
    button.addEventListener("click", () => {
      state.category = category;
      state.query = "";
      searchInput.value = "";
      renderFilters();
      renderList();
    });
    return button;
  }));

  homeOverview.replaceChildren(...grouped.map(({ category, count, grades }) => {
    const row = document.createElement("a");
    row.className = "overview-row";
    row.href = "#gallery";
    row.innerHTML = `<strong>${escapeHtml(category)}</strong><span>${count}件 / ${escapeHtml(grades)}</span>`;
    row.addEventListener("click", () => {
      state.category = category;
      renderFilters();
      renderList();
    });
    return row;
  }));
}

function renderHome() {
  const updates = [...state.prints]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 12);
  homeUpdateCount.textContent = `${updates.length}件表示`;
  recentUpdates.replaceChildren(...updates.map((item) => {
    const link = document.createElement("a");
    link.className = "home-item";
    link.href = "#gallery";
    link.innerHTML = `<strong class="${item.answer ? "print-title answer" : ""}">${escapeHtml(item.title)}${item.answer ? " 解答" : ""}</strong><span>${escapeHtml(item.grade)} / ${escapeHtml(item.category)} / ${formatDate(item.updatedAt)}</span>`;
    link.addEventListener("click", () => {
      state.grade = item.grade;
      state.category = item.category;
      state.answer = item.answer ? "answer" : "worksheet";
      state.query = "";
      searchInput.value = "";
      syncAnswerFilter();
      renderFilters();
      renderList();
      selectPrint(item, false);
    });
    return link;
  }));
}

function renderComments() {
  if (!state.comments.length) {
    commentFeed.replaceChildren(Object.assign(document.createElement("p"), {
      className: "empty",
      textContent: "まだコメントはありません。各PDFの「コメント」から残せます。",
    }));
    return;
  }

  commentFeed.replaceChildren(...state.comments.slice(0, 20).map((issue) => {
    const link = document.createElement("a");
    link.className = "home-item";
    link.href = issue.html_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `<strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.user.login)} / ${formatDate(issue.updated_at)}</span>`;
    return link;
  }));
}

function loadComments() {
  fetch(`https://api.github.com/repos/${REPO}/issues?state=open&per_page=50`)
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((issues) => {
      state.comments = issues.filter((issue) =>
        !issue.pull_request &&
        (issue.title.startsWith("[コメント]") || issue.body?.includes("print-id:"))
      );
      commentStatus.textContent = `${state.comments.length}件`;
      renderComments();
    })
    .catch(() => {
      commentStatus.textContent = "取得できませんでした";
      renderComments();
    });
}

function syncAnswerFilter() {
  answerFilters.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.answer === state.answer);
  });
}

function formatDate(value) {
  if (!value) return "更新日不明";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(value));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

window.addEventListener("hashchange", switchPage);

topicFilters.addEventListener("click", (event) => {
  const topic = event.target.dataset.topic;
  if (!topic) return;
  state.query = topic;
  searchInput.value = topic;
  renderFilters();
  renderList();
});

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
  syncAnswerFilter();
  renderList();
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderFilters();
  renderList();
});

resetButton.addEventListener("click", () => {
  state.grade = "all";
  state.category = "all";
  state.answer = "all";
  state.query = "";
  searchInput.value = "";
  syncAnswerFilter();
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
    renderOverview();
    renderHome();
    renderList();
    loadComments();
    switchPage();
  })
  .catch(() => {
    currentSummary.textContent = "プリント一覧を読み込めませんでした。";
  });

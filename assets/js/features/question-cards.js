import {
  readQuestionContent,
  hasQuestionContent,
  formatQuestionText,
  escapeQuestionText,
  answerChoiceHtml,
} from "./question-content.js?v=20261004-question-dock-4";

let dispose = () => {};

export function clearAuthoredExam() {
  dispose();
}

function safeQuestionImageUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(String(value), window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (_error) {
    return "";
  }
}

function boundedExplanation(value) {
  return String(value ?? "").slice(0, 50000);
}

// Điều khiển vẫn nối vào input cũ để giữ nguyên lưu tiến độ và chấm điểm.
export function mountAuthoredExam({
  answers,
  parts,
  review = false,
  initialAnswers = {},
  initialMarkedQuestions = [],
}) {
  dispose();

  const workspace = document.getElementById("exam-workspace");
  const left = workspace?.querySelector(".left-panel");
  if (!left) return;

  const list = parts.flatMap((part) =>
    Array.from({ length: part.questionCount }, (_, index) => ({
      part: part.key,
      title: part.title,
      number: index + 1,
    })),
  );
  const first = list.findIndex((question) =>
    hasQuestionContent(
      readQuestionContent(answers, question.part, question.number),
    ),
  );
  if (first < 0) return;

  const lifecycle = new AbortController();
  const listenerOptions = { signal: lifecycle.signal };
  const expandedSolutions = new Set();
  const validQuestionKeys = new Set(
    list.map((question) => `${question.part}-${question.number}`),
  );
  const markedQuestions = new Set(
    (Array.isArray(initialMarkedQuestions) ? initialMarkedQuestions : [])
      .map(String)
      .filter((key) => validQuestionKeys.has(key)),
  );
  let index = first;
  let syncFrame = 0;
  let mapOpen = false;

  const mode = document.createElement("div");
  mode.className = "thpt-content-mode-bar";
  mode.innerHTML = `
    <span>Nội dung đề thi</span>
    <div>
      <button type="button" data-view="text">Từng câu</button>
      <button type="button" data-view="pdf">Đề PDF</button>
    </div>
  `;

  const panel = document.createElement("section");
  panel.className = "thpt-authored-panel";
  panel.setAttribute("aria-label", "Câu hỏi và phương án trả lời");
  left.prepend(mode);
  left.appendChild(panel);

  const sheet = document.getElementById("sheets-container");
  const activeNavigation = document.createElement("nav");
  activeNavigation.className = "thpt-active-question-navigation";
  activeNavigation.setAttribute("aria-label", "Danh sách câu hỏi đang làm");
  sheet?.before(activeNavigation);

  const questionDock = document.createElement("nav");
  questionDock.className = "thpt-question-dock";
  questionDock.setAttribute("aria-label", "Chuyển nhanh câu hỏi");
  left.appendChild(questionDock);

  const questionMap = document.createElement("section");
  questionMap.className = "thpt-question-map";
  questionMap.setAttribute("aria-label", "Bảng câu hỏi");
  questionMap.setAttribute("aria-hidden", "true");
  left.appendChild(questionMap);

  const nativeRadio = (name, value) =>
    document.querySelector(
      `#sheets-container input[name="${name}"][value="${value}"]`,
    );
  const nativeValue = (name) =>
    review
      ? initialAnswers[name] || ""
      : document.querySelector(
            `#sheets-container input[name="${name}"]:checked`,
          )?.value || "";
  const submitted = () =>
    review || document.body.classList.contains("has-exam-result");
  const entryFor = (question) =>
    answers?.[question.part]?.[String(question.number)] ??
    answers?.[question.part]?.[question.number];
  const keyFor = (question) => {
    const entry = entryFor(question);
    return typeof entry === "object" ? entry?.ans : entry;
  };

  const choice = (name, value, letter, text, correct) => {
    const native = nativeRadio(name, value);
    const selected = nativeValue(name) === value;
    return answerChoiceHtml({
      letter,
      text,
      selected,
      correct: correct === value,
      reveal: submitted(),
      input: `<input class="thpt-choice-control" type="radio" name="thpt_card_${name}" data-native-name="${name}" value="${value}" aria-label="${escapeQuestionText(letter)}" ${selected ? "checked" : ""} ${submitted() || native?.disabled ? "disabled" : ""}>`,
    });
  };

  function solutionKey(question) {
    return `${question.part}-${question.number}`;
  }

  function isMarked(question) {
    return markedQuestions.has(solutionKey(question));
  }

  function emitMarkedQuestions() {
    document.dispatchEvent(
      new CustomEvent("thpt:question-marks-change", {
        detail: { marks: Array.from(markedQuestions) },
      }),
    );
  }

  function isAnswered(question) {
    if (question.part === "P3") {
      return Boolean(
        document.getElementById(`ans_P3_${question.number}`)?.value ||
          initialAnswers[`ans_P3_${question.number}`],
      );
    }
    if (question.part === "P1") {
      return Boolean(nativeValue(`ans_P1_${question.number}`));
    }
    return ["a", "b", "c", "d"].every((letter) =>
      Boolean(nativeValue(`ans_P2_${question.number}${letter}`)),
    );
  }

  function correctAnswerHtml(question) {
    const entry = entryFor(question);

    if (question.part === "P2") {
      return `
        <div class="thpt-inline-solution-answer thpt-inline-solution-tf">
          ${["a", "b", "c", "d"]
            .map((letter) => {
              const value = entry?.[letter];
              const answer =
                value === "T" ? "Đúng" : value === "F" ? "Sai" : "Chưa nhập";
              return `<span><b>${letter})</b> ${answer}</span>`;
            })
            .join("")}
        </div>
      `;
    }

    const answer = keyFor(question);
    const hasAnswer =
      answer !== undefined && answer !== null && String(answer).trim() !== "";
    return `
      <div class="thpt-inline-solution-answer">
        <span>Đáp án đúng</span>
        <strong>${formatQuestionText(hasAnswer ? answer : "Chưa nhập")}</strong>
      </div>
    `;
  }

  function solutionHtml(question) {
    if (!submitted()) return "";

    const key = solutionKey(question);
    const entry = entryFor(question);
    const explanation = boundedExplanation(
      typeof entry === "object" ? entry?.exp : "",
    ).trim();
    const imageUrl = safeQuestionImageUrl(
      typeof entry === "object" ? entry?.img : "",
    );
    const isOpen = expandedSolutions.has(key);

    return `
      <div class="thpt-inline-solution-block" data-inline-solution-block="${key}">
        <button
          type="button"
          class="thpt-inline-solution-toggle"
          data-inline-solution-toggle="${key}"
          aria-expanded="${String(isOpen)}"
          aria-controls="thpt-inline-solution-${key}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5"></path>
            <path d="M8 7h8M8 11h6"></path>
          </svg>
          <span>${isOpen ? "Ẩn đáp án" : "Hiện đáp án"}</span>
          <i aria-hidden="true"></i>
        </button>
        <div
          id="thpt-inline-solution-${key}"
          class="thpt-inline-solution-collapse ${isOpen ? "is-open" : ""}"
          aria-hidden="${String(!isOpen)}"
        >
          <div class="thpt-inline-solution-inner">
            <div class="thpt-inline-solution-card">
              <div class="thpt-inline-solution-heading">
                <span>Đáp án và hướng dẫn</span>
                <small>${escapeQuestionText(question.title)} · Câu ${question.number}</small>
              </div>
              ${correctAnswerHtml(question)}
              ${
                imageUrl
                  ? `<figure class="thpt-inline-solution-image"><img src="${escapeQuestionText(imageUrl)}" alt="Hình minh họa lời giải câu ${question.number}" loading="lazy" decoding="async"></figure>`
                  : ""
              }
              <div class="thpt-inline-solution-explanation">
                ${
                  explanation
                    ? formatQuestionText(explanation)
                    : '<p class="thpt-inline-solution-empty">Câu này chưa có lời giải chi tiết. Em vẫn có thể đối chiếu đáp án đúng ở trên.</p>'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function questionButtonHtml(question, listIndex, attribute) {
    const classes = [
      listIndex === index ? "active" : "",
      isAnswered(question) ? "answered" : "",
      isMarked(question) ? "marked" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<button type="button" ${attribute}="${listIndex}" class="${classes}" aria-current="${listIndex === index ? "true" : "false"}" aria-label="${escapeQuestionText(question.title)}, câu ${question.number}${isMarked(question) ? ", đã đánh dấu" : ""}">${question.number}</button>`;
  }

  function drawQuestionNavigation() {
    const currentQuestion = list[index];
    const currentPart = parts.find((part) => part.key === currentQuestion.part);
    const answeredTotal = list.filter(isAnswered).length;
    const currentPartQuestions = list
      .map((question, listIndex) => ({ question, listIndex }))
      .filter(({ question }) => question.part === currentQuestion.part);

    activeNavigation.innerHTML = `
      <div class="thpt-active-question-head">
        <div>
          <strong>Danh sách câu hỏi</strong>
          <span>${answeredTotal}/${list.length} câu đã làm</span>
        </div>
        <div class="thpt-active-question-legend" aria-label="Chú giải">
          <span><i class="answered"></i>Đã làm</span>
          <span><i class="marked"></i>Đánh dấu</span>
        </div>
      </div>
      <div class="thpt-active-question-parts">
        ${parts
          .map((part) => {
            const entries = list
              .map((question, listIndex) => ({ question, listIndex }))
              .filter(({ question }) => question.part === part.key);
            const partAnswered = entries.filter(({ question }) =>
              isAnswered(question),
            ).length;
            return `
              <section class="thpt-active-question-part">
                <div>
                  <strong>${escapeQuestionText(part.title)}</strong>
                  <span>${partAnswered}/${entries.length}</span>
                </div>
                <div class="thpt-active-question-grid">
                  ${entries
                    .map(({ question, listIndex }) =>
                      questionButtonHtml(
                        question,
                        listIndex,
                        "data-active-card-index",
                      ),
                    )
                    .join("")}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    `;

    questionDock.innerHTML = `
      <div class="thpt-question-dock-main">
        <button type="button" class="thpt-question-map-toggle" data-question-map-toggle aria-expanded="${String(mapOpen)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="1"></circle><circle cx="12" cy="6" r="1"></circle><circle cx="18" cy="6" r="1"></circle><circle cx="6" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="18" cy="12" r="1"></circle><circle cx="6" cy="18" r="1"></circle><circle cx="12" cy="18" r="1"></circle><circle cx="18" cy="18" r="1"></circle></svg>
          <span>Bảng câu hỏi</span>
        </button>
        <div class="thpt-question-dock-numbers" aria-label="${escapeQuestionText(currentPart?.title || currentQuestion.title)}">
          ${currentPartQuestions
            .map(({ question, listIndex }) =>
              questionButtonHtml(question, listIndex, "data-dock-card-index"),
            )
            .join("")}
        </div>
        <span class="thpt-question-dock-position">${index + 1}/${list.length}</span>
      </div>
      <div class="thpt-question-part-tabs" aria-label="Các phần của đề thi">
        ${parts
          .map((part) => {
            const partQuestions = list.filter(
              (question) => question.part === part.key,
            );
            const firstIndex = list.findIndex(
              (question) => question.part === part.key,
            );
            const answeredCount = partQuestions.filter(isAnswered).length;
            const percent = partQuestions.length
              ? (answeredCount / partQuestions.length) * 100
              : 0;
            return `
              <button type="button" data-dock-part-index="${firstIndex}" class="${part.key === currentQuestion.part ? "active" : ""}">
                <span><b>${escapeQuestionText(part.title)}</b><small>${answeredCount}/${partQuestions.length}</small></span>
                <i><em style="width:${percent}%"></em></i>
              </button>
            `;
          })
          .join("")}
      </div>
    `;

    questionMap.innerHTML = `
      <div class="thpt-question-map-head">
        <div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="1"></circle><circle cx="12" cy="6" r="1"></circle><circle cx="18" cy="6" r="1"></circle><circle cx="6" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="18" cy="12" r="1"></circle><circle cx="6" cy="18" r="1"></circle><circle cx="12" cy="18" r="1"></circle><circle cx="18" cy="18" r="1"></circle></svg><strong>Bảng câu hỏi</strong></div>
        <button type="button" data-question-map-close aria-label="Đóng bảng câu hỏi">×</button>
      </div>
      <div class="thpt-question-map-legend" aria-label="Chú giải">
        <span><i class="answered"></i>Đã làm</span>
        <span><i></i>Chưa làm</span>
        <span><i class="marked"></i>Đã đánh dấu</span>
      </div>
      <div class="thpt-question-map-parts">
        ${parts
          .map((part) => {
            const entries = list
              .map((question, listIndex) => ({ question, listIndex }))
              .filter(({ question }) => question.part === part.key);
            return `
              <div class="thpt-question-map-part">
                <strong>${escapeQuestionText(part.title)} <small>(${entries.length} câu)</small></strong>
                <div>${entries
                  .map(({ question, listIndex }) =>
                    questionButtonHtml(
                      question,
                      listIndex,
                      "data-map-card-index",
                    ),
                  )
                  .join("")}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
    questionMap.classList.toggle("is-open", mapOpen);
    questionMap.setAttribute("aria-hidden", String(!mapOpen));
  }

  let activeView = "text";
  function updateNavigationVisibility() {
    const isTextView = activeView === "text";
    const isSubmitted = submitted();
    const showActiveNavigation = isTextView && !isSubmitted;
    const showReviewNavigation = isTextView && isSubmitted;
    activeNavigation.hidden = !showActiveNavigation;
    questionDock.hidden = !showReviewNavigation;
    questionMap.hidden = !showReviewNavigation;
    if (!showReviewNavigation) mapOpen = false;
    document.body.classList.toggle(
      "is-text-question-mode",
      showReviewNavigation,
    );
    workspace.classList.toggle(
      "thpt-result-text-mode",
      isTextView && isSubmitted,
    );
    workspace.classList.toggle(
      "thpt-active-text-mode",
      showActiveNavigation,
    );
  }

  function jumpToQuestion(nextIndex) {
    const parsedIndex = Number(nextIndex);
    if (!Number.isInteger(parsedIndex)) return;
    index = Math.max(0, Math.min(list.length - 1, parsedIndex));
    render();
    panel.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      activeNavigation
        .querySelector('[aria-current="true"]')
        ?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
      questionDock
        .querySelector('[aria-current="true"]')
        ?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    });
  }

  function render() {
    const question = list[index];
    const data = readQuestionContent(
      answers,
      question.part,
      question.number,
    );
    const name = `ans_${question.part}_${question.number}`;
    const reveal = submitted();
    let controls = "";

    if (hasQuestionContent(data)) {
      if (question.part === "P1") {
        controls = `
          <div class="thpt-answer-choices">
            ${["A", "B", "C", "D"]
              .map((letter) =>
                choice(
                  name,
                  letter,
                  letter,
                  data.options?.[letter] || "",
                  keyFor(question),
                ),
              )
              .join("")}
          </div>
          ${reveal && !nativeValue(name) ? '<p class="thpt-answer-empty">Em chưa chọn đáp án.</p>' : ""}
        `;
      } else if (question.part === "P2") {
        controls = ["a", "b", "c", "d"]
          .map(
            (letter) => `
              <p class="thpt-question-stem">${letter}) ${formatQuestionText(data.statements?.[letter] || "")}</p>
              <div class="thpt-answer-tf">
                ${choice(name + letter, "T", "Đ", "Đúng", answers.P2?.[question.number]?.[letter])}
                ${choice(name + letter, "F", "S", "Sai", answers.P2?.[question.number]?.[letter])}
              </div>
            `,
          )
          .join("");
      } else {
        const native = document.getElementById(name);
        controls = `
          <label class="thpt-content-label" for="thpt-card-short">Đáp án của em</label>
          <input type="text" id="thpt-card-short" class="thpt-content-input" inputmode="decimal" maxlength="20" data-native-id="${name}" value="${escapeQuestionText((review ? initialAnswers[name] : native?.value) || "")}" ${reveal || native?.disabled ? "disabled" : ""}>
          ${reveal ? `<p class="thpt-answer-state">Đáp án đúng: ${escapeQuestionText(keyFor(question) ?? "Chưa nhập")}</p>` : ""}
        `;
      }
    }

    panel.innerHTML = `
      <article class="thpt-inline-question">
        <div class="thpt-inline-question-head">
          <span>${escapeQuestionText(question.title)} · Câu ${question.number}</span>
          <div>
            <button type="button" class="thpt-question-mark ${isMarked(question) ? "is-marked" : ""}" data-toggle-question-mark aria-pressed="${String(isMarked(question))}" ${submitted() ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"></path></svg>
              <span>${isMarked(question) ? "Đã đánh dấu" : "Đánh dấu"}</span>
            </button>
            <span>${index + 1} / ${list.length}</span>
          </div>
        </div>
        ${
          hasQuestionContent(data)
            ? `<p class="thpt-question-stem">${formatQuestionText(data.text)}</p>${controls}${solutionHtml(question)}`
            : '<p class="thpt-question-fallback">Câu này chưa có nội dung gõ. Chọn “Đề PDF” để đọc và trả lời trên phiếu.</p>'
        }
      </article>
      <div class="thpt-card-pagination">
        <button type="button" data-card-step="-1" ${index === 0 ? "disabled" : ""}>Câu trước</button>
        <button type="button" data-card-step="1" ${index === list.length - 1 ? "disabled" : ""}>Câu tiếp</button>
      </div>
    `;
    drawQuestionNavigation();
    updateNavigationVisibility();
  }

  const setMode = (view) => {
    activeView = view;
    workspace.classList.toggle("thpt-text-mode", view === "text");
    panel.hidden = view !== "text";
    updateNavigationVisibility();
    mode.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (view === "pdf") {
      requestAnimationFrame(() => window.refreshPdfViewportLayout?.());
    }
  };

  function sync() {
    // Sau khi nộp, chuyển thẳng sang chế độ soát từng câu để luôn hiện dock dưới.
    if (submitted() && activeView !== "text") setMode("text");
    // Bảo toàn con trỏ trong ô đáp án ngắn; radio có thể dựng lại ngay.
    const short = panel.querySelector("[data-native-id]");
    if (short === document.activeElement && !submitted()) {
      drawQuestionNavigation();
      return;
    }
    render();
  }

  function scheduleSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      sync();
    });
  }

  mode.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-view]");
      if (button) setMode(button.dataset.view);
    },
    listenerOptions,
  );

  panel.addEventListener(
    "click",
    (event) => {
      const solutionButton = event.target.closest(
        "[data-inline-solution-toggle]",
      );
      if (solutionButton) {
        const key = solutionButton.dataset.inlineSolutionToggle;
        const block = panel.querySelector(
          `[data-inline-solution-block="${key}"]`,
        );
        const collapse = block?.querySelector(
          ".thpt-inline-solution-collapse",
        );
        if (!collapse) return;

        const open = !collapse.classList.contains("is-open");
        collapse.classList.toggle("is-open", open);
        collapse.setAttribute("aria-hidden", String(!open));
        solutionButton.setAttribute("aria-expanded", String(open));
        solutionButton.querySelector("span").textContent = open
          ? "Ẩn đáp án"
          : "Hiện đáp án";
        if (open) expandedSolutions.add(key);
        else expandedSolutions.delete(key);
        return;
      }

      const markButton = event.target.closest("[data-toggle-question-mark]");
      if (markButton && !submitted()) {
        const key = solutionKey(list[index]);
        if (markedQuestions.has(key)) markedQuestions.delete(key);
        else markedQuestions.add(key);
        emitMarkedQuestions();
        render();
        return;
      }

      const button = event.target.closest("[data-card-step]");
      if (button && !button.disabled) {
        jumpToQuestion(index + Number(button.dataset.cardStep));
      }
    },
    listenerOptions,
  );

  questionDock.addEventListener(
    "click",
    (event) => {
      const toggle = event.target.closest("[data-question-map-toggle]");
      if (toggle) {
        mapOpen = !mapOpen;
        drawQuestionNavigation();
        return;
      }
      const button = event.target.closest("[data-dock-card-index]");
      if (button) jumpToQuestion(button.dataset.dockCardIndex);
      const partButton = event.target.closest("[data-dock-part-index]");
      if (partButton) jumpToQuestion(partButton.dataset.dockPartIndex);
    },
    listenerOptions,
  );

  activeNavigation.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-active-card-index]");
      if (button) jumpToQuestion(button.dataset.activeCardIndex);
    },
    listenerOptions,
  );

  questionMap.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("[data-question-map-close]")) {
        mapOpen = false;
        drawQuestionNavigation();
        return;
      }
      const button = event.target.closest("[data-map-card-index]");
      if (button) {
        mapOpen = false;
        jumpToQuestion(button.dataset.mapCardIndex);
      }
    },
    listenerOptions,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && mapOpen) {
        mapOpen = false;
        drawQuestionNavigation();
      }
    },
    listenerOptions,
  );

  panel.addEventListener(
    "input",
    (event) => {
      const input = event.target;
      if (submitted()) return;

      if (input.dataset.nativeName) {
        const native = nativeRadio(input.dataset.nativeName, input.value);
        if (!native || native.disabled) return;
        native.checked = true;
        native.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (input.dataset.nativeId) {
        const native = document.getElementById(input.dataset.nativeId);
        if (!native || native.disabled) return;
        native.value = input.value;
        native.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    listenerOptions,
  );

  sheet?.addEventListener("change", scheduleSync, listenerOptions);
  sheet?.addEventListener("input", scheduleSync, listenerOptions);
  const observer = new MutationObserver(scheduleSync);
  if (sheet) {
    observer.observe(sheet, {
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
  }
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  render();
  // Khi xem lại, mở ngay chế độ từng câu để đáp án tại chỗ thay cho trang lời giải cũ.
  setMode("text");

  dispose = () => {
    lifecycle.abort();
    observer.disconnect();
    if (syncFrame) cancelAnimationFrame(syncFrame);
    mode.remove();
    panel.remove();
    activeNavigation.remove();
    questionDock.remove();
    questionMap.remove();
    document.body.classList.remove("is-text-question-mode");
    workspace.classList.remove(
      "thpt-text-mode",
      "thpt-result-text-mode",
      "thpt-active-text-mode",
    );
    dispose = () => {};
  };
}

const ENGAGEMENT_RANKS = Object.freeze([
  Object.freeze({
    key: "starter",
    minPoints: 0,
    nextPoints: 100,
    label: "Khởi động",
  }),
  Object.freeze({
    key: "momentum",
    minPoints: 100,
    nextPoints: 250,
    label: "Đang vào guồng",
  }),
  Object.freeze({
    key: "scholar",
    minPoints: 250,
    nextPoints: 500,
    label: "Học tập ổn định",
  }),
  Object.freeze({
    key: "warrior",
    minPoints: 500,
    nextPoints: 1000,
    label: "Chiến binh luyện đề",
  }),
  Object.freeze({
    key: "ultimate",
    minPoints: 1000,
    nextPoints: null,
    label: "Bền bỉ tối thượng",
  }),
]);

export function getEngagementRank(points) {
  const value = Math.max(0, Number(points || 0));

  return (
    [...ENGAGEMENT_RANKS]
      .reverse()
      .find((rank) => value >= rank.minPoints) || ENGAGEMENT_RANKS[0]
  );
}

export function updateRankCharacter(container, points) {
  if (!container) return;

  const value = Math.max(0, Number(points || 0));
  const rank = getEngagementRank(value);
  const previousRank = container.dataset.rank;
  const nameElement = container.querySelector("[data-rank-name]");
  const progressElement = container.querySelector("[data-rank-progress]");
  const progressBar = container.querySelector("[data-rank-progress-bar]");

  container.dataset.rank = rank.key;
  container.setAttribute(
    "aria-label",
    `Hạng hiện tại: ${rank.label}, ${value} điểm chuyên cần`,
  );

  if (nameElement) nameElement.textContent = rank.label;

  if (rank.nextPoints === null) {
    if (progressElement) progressElement.textContent = "Đã đạt cấp cao nhất";
    if (progressBar) progressBar.style.setProperty("--rank-progress", "100%");
  } else {
    const rankSpan = rank.nextPoints - rank.minPoints;
    const currentSpan = Math.min(rankSpan, value - rank.minPoints);
    const percentage = Math.max(0, (currentSpan / rankSpan) * 100);

    if (progressElement) {
      progressElement.textContent = `${value}/${rank.nextPoints} điểm`;
    }
    if (progressBar) {
      progressBar.style.setProperty("--rank-progress", `${percentage}%`);
    }
  }

  if (previousRank !== rank.key) {
    container.classList.remove("rank-awaken");
    void container.offsetWidth;
    container.classList.add("rank-awaken");
  }
}

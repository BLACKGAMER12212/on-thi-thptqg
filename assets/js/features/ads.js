import { ADS_CONFIG } from "../config/ads.config.js";

// Quảng cáo chỉ xuất hiện ở các màn hình nội dung, không chen vào phòng thi.
// Trạng thái đóng được giữ trong suốt phiên SPA. Đổi mục trên menu chỉ làm mới
// nội dung quảng cáo; chỉ F5 hoặc hoàn tất một đề mới mở lại khung quảng cáo góc.
let publicAdsEnabled = false;
let cornerAdClosed = false;
let activeAdView = "";
let refreshSequence = 0;
let closeTimer = null;

function getCornerAd() {
  return document.querySelector(ADS_CONFIG.selectors.cornerSlot);
}

function updateAdVisibility() {
  const adsCanDisplay = ADS_CONFIG.enabled && publicAdsEnabled;

  document
    .querySelectorAll(ADS_CONFIG.selectors.sideSlots)
    .forEach((slot) => {
      slot.hidden = !adsCanDisplay;
    });

  const cornerAd = getCornerAd();
  if (cornerAd) cornerAd.hidden = !adsCanDisplay || cornerAdClosed;

  document.body.classList.toggle("ads-hidden", !adsCanDisplay);
}

function restartSlotAnimation(slot) {
  slot.dataset.adState = "refreshing";
  // Hai frame giúp trình duyệt ghi nhận trạng thái cũ trước khi chạy lại
  // animation; không dùng reflow đồng bộ nên không làm khựng giao diện.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      slot.dataset.adState = "ready";
    });
  });
}

function notifyAdProvider(viewKey, reason) {
  const slots = Array.from(
    document.querySelectorAll(ADS_CONFIG.selectors.allSlots),
  );
  refreshSequence += 1;

  const detail = {
    viewKey,
    reason,
    sequence: refreshSequence,
    slots,
  };

  // Điểm nối dành cho mã quảng cáo thật sau này. Provider chỉ cần lắng nghe
  // sự kiện này và gọi API refresh chính thức của họ; không tải lại cả trang.
  document.dispatchEvent(new CustomEvent("thpt:ads-refresh", { detail }));

  if (typeof window.refreshThptAds === "function") {
    try {
      window.refreshThptAds(detail);
    } catch (error) {
      console.warn("Không thể làm mới quảng cáo:", error);
    }
  }
}

export function refreshAds({
  viewKey = "content",
  reason = "navigation",
  force = false,
  reopenCorner = false,
} = {}) {
  if (!ADS_CONFIG.enabled) return false;

  const normalizedView = String(viewKey || "content");
  const viewChanged = normalizedView !== activeAdView;
  const shouldRefresh = force || viewChanged || !publicAdsEnabled;

  if (!shouldRefresh) {
    updateAdVisibility();
    return false;
  }

  activeAdView = normalizedView;
  // Đổi menu vẫn làm mới nội dung quảng cáo nhưng tôn trọng việc học sinh đã
  // đóng khung góc. Chỉ F5 (module khởi tạo lại) hoặc trở về sau khi hoàn tất
  // một đề thi mới được phép mở khung góc trở lại.
  if (reopenCorner) cornerAdClosed = false;
  window.clearTimeout(closeTimer);

  const cornerAd = getCornerAd();
  if (cornerAd) cornerAd.classList.remove("is-closing");

  document
    .querySelectorAll(ADS_CONFIG.selectors.allSlots)
    .forEach(restartSlotAnimation);

  updateAdVisibility();
  notifyAdProvider(normalizedView, reason);
  return true;
}

export function closeCornerAd() {
  cornerAdClosed = true;

  const cornerAd = getCornerAd();
  if (!cornerAd || cornerAd.hidden) return;

  cornerAd.classList.add("is-closing");
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    cornerAd.hidden = true;
    cornerAd.classList.remove("is-closing");
  }, 220);
}

export function setPublicAdsVisibility(isVisible, options = {}) {
  const wasVisible = publicAdsEnabled;
  publicAdsEnabled = Boolean(isVisible);

  if (publicAdsEnabled && options.refresh) {
    refreshAds({
      viewKey: options.viewKey,
      reason: options.reason,
      force: options.force || !wasVisible,
      reopenCorner: options.reopenCorner,
    });
    return;
  }

  updateAdVisibility();
}

export function initAds() {
  // Dọn khóa của bản cũ. Từ phiên bản này việc đóng không còn sống qua F5.
  sessionStorage.removeItem(ADS_CONFIG.closedStorageKey);

  document
    .querySelectorAll(ADS_CONFIG.selectors.allSlots)
    .forEach((slot) => {
      slot.dataset.adState = "idle";
    });

  window.closeCornerAd = closeCornerAd;
  updateAdVisibility();
}

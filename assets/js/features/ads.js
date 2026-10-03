import { ADS_CONFIG } from "../config/ads.config.js";

// Chỉ bật sau khi học sinh vào một trang nội dung; màn hình đăng nhập luôn sạch.
let publicAdsEnabled = false;
let closeTimer = null;

function getCornerAd() {
  return document.querySelector(ADS_CONFIG.selectors.cornerSlot);
}

function wasCornerAdClosed() {
  return (
    sessionStorage.getItem(ADS_CONFIG.closedStorageKey) === "true"
  );
}

function updateAdVisibility() {
  const adsCanDisplay = ADS_CONFIG.enabled && publicAdsEnabled;

  document
    .querySelectorAll(ADS_CONFIG.selectors.sideSlots)
    .forEach((slot) => {
      slot.hidden = !adsCanDisplay;
    });

  const cornerAd = getCornerAd();
  if (cornerAd) {
    cornerAd.hidden = !adsCanDisplay || wasCornerAdClosed();
  }

  document.body.classList.toggle("ads-hidden", !adsCanDisplay);
}

export function closeCornerAd() {
  sessionStorage.setItem(ADS_CONFIG.closedStorageKey, "true");

  const cornerAd = getCornerAd();
  if (!cornerAd || cornerAd.hidden) return;

  cornerAd.classList.add("is-closing");
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    cornerAd.hidden = true;
    cornerAd.classList.remove("is-closing");
  }, 220);
}

export function setPublicAdsVisibility(isVisible) {
  publicAdsEnabled = Boolean(isVisible);
  updateAdVisibility();
}

export function initAds() {
  document
    .querySelectorAll(ADS_CONFIG.selectors.allSlots)
    .forEach((slot) => {
      slot.dataset.adState = "ready";
    });

  window.closeCornerAd = closeCornerAd;
  updateAdVisibility();
}

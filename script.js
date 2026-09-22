import { supabase } from "./assets/js/config/supabase.js";
import { initAds, setPublicAdsVisibility } from "./assets/js/features/ads.js";
import { updateRankCharacter } from "./assets/js/features/rank-character.js";
import {
  escapeHtml,
  formatExamDuration,
  getPublicStoragePath,
  parseJsonArray,
  parseJsonObject,
  parseVietnameseDate,
} from "./assets/js/core/utils.js";

initAds();

const PDFJS_LIBRARY_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let pdfJsLoadPromise = null;

function ensurePdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_LIBRARY_URL;
    script.async = true;
    script.dataset.pdfjsLoader = "true";
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("Thư viện PDF.js không khởi tạo được."));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = () =>
      reject(new Error("Không tải được thư viện hiển thị PDF."));
    document.head.appendChild(script);
  }).catch((error) => {
    pdfJsLoadPromise = null;
    throw error;
  });

  return pdfJsLoadPromise;
}

let EXAM_DATABASE = [];
let DOCUMENT_DATABASE = [];

// ==============================================================================
// 3. BIẾN QUẢN LÝ TOÀN CỤC
// ==============================================================================
let currentUser = null;
let currentExam = null;
let totalTime = 0;
let endTime = 0;
let timerInterval = null;
let isSubmitted = false;
let isSubmitting = false;
let isReviewMode = false;
let pendingAction = null;
let userDataCache = { history: {}, activeExam: null, activeState: null };
let isInitialLoad = true;
let isKickedOut = false;
let originalPdfWidth = 0;
let originalPdfHeight = 0;
let currentCategoryFilter = "all";
let currentCohortFilter = "2k9";
let currentSearchQuery = "";
let currentDocumentFilter = "tong-on";
let currentDocumentSearchQuery = "";
let likedDocumentIds = new Set();
let savedDocumentIds = new Set();
let documentPreviewObserver = null;
let documentsLoaded = false;
let documentRealtimeChannel = null;
let documentRealtimeFallbackInterval = null;
let isAuthenticating = false;
let realtimeSyncInterval = null;
let sessionGuardInterval = null;
let progressSavePromise = Promise.resolve();
let recentlyInteracted = new Set();
let isExamsMergedWithDB = false;
let engagementFeatureAvailable = null;
let resultExamSortOrder = "asc";

// 100vh trên trình duyệt điện thoại có thể bao gồm cả vùng đang bị thanh địa
// chỉ che khuất. Đồng bộ chiều cao nhìn thấy thật để phòng thi không bị cắt
// hoặc chừa một dải trống ở cạnh dưới trên Chrome/Safari mobile.
let viewportHeightSyncFrame = 0;
function syncVisibleViewportHeight() {
  cancelAnimationFrame(viewportHeightSyncFrame);
  viewportHeightSyncFrame = requestAnimationFrame(() => {
    const viewportHeight = Math.round(
      window.visualViewport?.height || window.innerHeight,
    );
    if (viewportHeight > 0) {
      document.documentElement.style.setProperty(
        "--app-viewport-height",
        `${viewportHeight}px`,
      );
    }
  });
}

syncVisibleViewportHeight();
window.addEventListener("resize", syncVisibleViewportHeight, { passive: true });
window.addEventListener("orientationchange", syncVisibleViewportHeight, {
  passive: true,
});
window.visualViewport?.addEventListener("resize", syncVisibleViewportHeight, {
  passive: true,
});
let engagementLoadSequence = 0;
let resultRankingLoadSequence = 0;
let avatarModerationFeatureAvailable = null;
let homeSearchTimer = null;
let documentSearchTimer = null;
let activePdfLoadingTask = null;
let activePdfDocument = null;
let activePdfRenderToken = 0;
let pdfPageObserver = null;
let loaderHideTimer = null;
let notificationHideTimer = null;
let customModalHideTimer = null;
let drawerBackdropHideTimer = null;

let currentSessionId = localStorage.getItem("thpt_stu_session_id");
if (!currentSessionId) {
  currentSessionId =
    Date.now().toString() + Math.random().toString(36).substr(2, 5);
  localStorage.setItem("thpt_stu_session_id", currentSessionId);
}
const VALID_COHORTS = new Set(["2k8", "2k9"]);

function getCohortStorageKey() {
  return currentUser ? `thpt_cohort_${currentUser.id}` : null;
}

function restoreCohortPreference() {
  const storageKey = getCohortStorageKey();
  if (!storageKey) return currentCohortFilter;

  const savedCohort = localStorage.getItem(storageKey);
  if (VALID_COHORTS.has(savedCohort)) currentCohortFilter = savedCohort;
  return currentCohortFilter;
}

function syncCohortInterface() {
  document.querySelectorAll(".cohort-btn").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.cohort === currentCohortFilter,
    );
  });

  const pageTitle = document.getElementById("main-page-title");
  if (pageTitle) {
    pageTitle.innerText =
      `Kho Đề Thi & Ôn Luyện ${currentCohortFilter.toUpperCase()}`;
  }
}

function getUserDisplayName() {
  return String(
    userDataCache.full_name ||
      currentUser?.user_metadata?.full_name ||
      userDataCache.username ||
      "Học sinh",
  ).trim();
}

function getSafeAvatarUrl(value) {
  const avatarUrl = String(value || "").trim();
  if (!avatarUrl) return "";
  try {
    const parsed = new URL(avatarUrl, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (_error) {
    return "";
  }
}

function applyAvatarToElement(element, avatarUrl, fallbackName) {
  if (!element) return;
  const safeAvatarUrl = getSafeAvatarUrl(avatarUrl);
  const fallbackLetter = String(fallbackName || "U").trim().charAt(0).toUpperCase() || "U";
  const requestId = `${safeAvatarUrl}|${fallbackLetter}`;

  // Luôn dựng fallback trước. Chỉ thay bằng ảnh sau khi ảnh đã tải thành công,
  // nhờ vậy URL cũ/404 không tạo vòng tròn trắng hoặc biểu tượng ảnh lỗi.
  element.dataset.avatarRequest = requestId;
  element.textContent = fallbackLetter;
  element.style.removeProperty("background-image");
  element.style.removeProperty("background-size");
  element.style.removeProperty("background-position");
  element.style.color = "";
  element.classList.remove("has-avatar-image");

  if (!safeAvatarUrl) return;

  const probe = new Image();
  probe.decoding = "async";
  probe.onload = () => {
    if (element.dataset.avatarRequest !== requestId) return;
    element.textContent = "";
    element.style.backgroundImage = `url(${JSON.stringify(safeAvatarUrl)})`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.color = "transparent";
    element.classList.add("has-avatar-image");
  };
  probe.onerror = () => {
    if (element.dataset.avatarRequest !== requestId) return;
    element.textContent = fallbackLetter;
    element.style.removeProperty("background-image");
    element.style.removeProperty("background-size");
    element.style.removeProperty("background-position");
    element.style.color = "";
    element.classList.remove("has-avatar-image");
  };
  probe.src = safeAvatarUrl;
}

function syncUserIdentityUI() {
  if (!currentUser) return;
  const displayName = getUserDisplayName();
  const avatarUrl = userDataCache.avatar_url || "";

  ["display-username", "display-username-mobile", "menu-display-username"].forEach(
    (id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = displayName;
    },
  );

  const profileName = document.getElementById("prof-page-name");
  if (profileName) profileName.textContent = displayName;

  ["user-avatar-initial", "menu-avatar-initial", "prof-page-avatar"].forEach(
    (id) =>
      applyAvatarToElement(
        document.getElementById(id),
        avatarUrl,
        displayName,
      ),
  );
}

function avatarMarkup(url, name, className = "ranking-avatar") {
  const safeUrl = getSafeAvatarUrl(url);
  const fallback = escapeHtml(String(name || "H").charAt(0).toUpperCase());
  if (!safeUrl) return `<span class="${className}">${fallback}</span>`;
  return `<span class="${className} has-avatar-image">${fallback}<img src="${escapeHtml(safeUrl)}" alt="" loading="lazy" decoding="async" onerror="this.parentElement.classList.remove('has-avatar-image');this.remove()"></span>`;
}

function showAvatarModerationNotice() {
  const warning = String(userDataCache.avatar_warning || "").trim();
  if (!warning || !currentUser) return;
  if (document.body.classList.contains("is-taking-exam")) return;
  const warningVersion = String(
    userDataCache.avatar_warning_at || userDataCache.avatar_status || warning,
  );
  const storageKey = `thpt_avatar_warning_${currentUser.id}`;
  if (localStorage.getItem(storageKey) === warningVersion) return;
  localStorage.setItem(storageKey, warningVersion);
  setTimeout(() => {
    if (document.body.classList.contains("is-taking-exam")) {
      localStorage.removeItem(storageKey);
      return;
    }
    window.showNotification("Thông báo về ảnh đại diện", warning);
  }, 550);
}

function disposeExamPdf() {
  activePdfRenderToken += 1;
  pdfPageObserver?.disconnect();
  pdfPageObserver = null;
  if (activePdfLoadingTask) {
    void activePdfLoadingTask.destroy().catch(() => {});
    activePdfLoadingTask = null;
  }
  if (activePdfDocument) {
    void activePdfDocument.destroy().catch(() => {});
    activePdfDocument = null;
  }

  document.querySelectorAll("#pdf-scroll-content .pdf-page-canvas").forEach(
    (canvas) => {
      canvas.width = 1;
      canvas.height = 1;
      canvas.remove();
    },
  );

  // Hai lớp vẽ có thể lớn bằng toàn bộ chiều cao PDF. Thu nhỏ bitmap khi rời
  // phòng thi để trình duyệt trả bộ nhớ ngay, thay vì giữ đến lần mở đề sau.
  ["static-layer", "draw-layer"].forEach((id) => {
    const layer = document.getElementById(id);
    if (!layer) return;
    layer.width = 1;
    layer.height = 1;
  });
  const zoomContainer = document.getElementById("pdf-zoom-container");
  if (zoomContainer) {
    zoomContainer.style.width = "";
    zoomContainer.style.height = "";
  }
  originalPdfWidth = 0;
  originalPdfHeight = 0;
}

// ==============================================================================
// 4. TIỆN ÍCH GIAO DIỆN CHUNG
// ==============================================================================
window.initDrawerHandle = () => {
  const drawer = document.getElementById("right-panel-drawer");
  if (drawer && !document.getElementById("drawer-handle-zone")) {
    const handle = document.createElement("div");
    handle.id = "drawer-handle-zone";
    drawer.insertBefore(handle, drawer.firstChild);
  }
};
window.updateFabVisibility = () => {
  let fab = document.getElementById("mobile-fab-answer");

  // Khôi phục nút tròn động nguyên bản trên mobile.
  if (!fab) {
    fab = document.createElement("button");
    fab.type = "button";
    fab.id = "mobile-fab-answer";
    fab.className = "mobile-fab-answer";
    fab.setAttribute("aria-label", "Mở bảng đáp án");
    fab.addEventListener("click", (event) => {
      event.stopPropagation();
      window.toggleMobileSheet();
    });
    document.body.appendChild(fab);
  }

  fab.style.display = "";

  if (window.innerWidth > 1024) {
    fab.classList.remove("show");
    return;
  }

  const workspace = document.getElementById("exam-workspace");
  const isWorkspaceVisible =
    workspace &&
    (workspace.style.display === "flex" ||
      workspace.classList.contains("fullscreen-active"));

  if (isWorkspaceVisible) {
    fab.classList.add("show");

    if (isReviewMode || isSubmitted) {
      fab.style.background = "linear-gradient(135deg, #10b981, #047857)";
      fab.setAttribute("aria-label", "Mở bảng kết quả");
      fab.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      `;
    } else {
      fab.style.background = "linear-gradient(135deg, #0ea5e9, #0284c7)";
      fab.setAttribute("aria-label", "Mở phiếu điền đáp án");
      fab.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
      `;
    }
  } else {
    fab.classList.remove("show");
  }
};
window.initDrawerHandle();
window.updateFabVisibility();

window.showLoader = (text = "Đang tải...") => {
  clearTimeout(loaderHideTimer);
  const loaderText = document.getElementById("loader-text");
  if (loaderText) loaderText.innerText = text;
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.style.display = "flex";
    loader.style.opacity = "1";
  }
};
window.hideLoader = () => {
  const loader = document.getElementById("global-loader");
  if (!loader || loader.style.display === "none") return;
  clearTimeout(loaderHideTimer);
  loader.style.transition = "opacity 0.3s ease";
  loader.style.opacity = "0";
  loaderHideTimer = setTimeout(() => {
    loader.style.display = "none";
    loader.style.opacity = "1";
  }, 300);
};
window.showNotification = (title, message) => {
  const notifModal = document.getElementById("notification-modal");
  if (!notifModal) return;
  clearTimeout(notificationHideTimer);
  document.getElementById("notif-title").innerText = title || "Thông báo";
  document.getElementById("notif-message").innerText = message || "";
  notifModal.style.display = "flex";
  requestAnimationFrame(() => notifModal.classList.add("active"));
};
window.closeNotificationModal = () => {
  const notifModal = document.getElementById("notification-modal");
  if (!notifModal) return;
  if (
    sessionStorage.getItem("thpt_in_exam") === "true" &&
    !document.fullscreenElement
  ) {
    requestFullScreen();
  }
  notifModal.classList.remove("active");
  clearTimeout(notificationHideTimer);
  notificationHideTimer = setTimeout(
    () => (notifModal.style.display = "none"),
    220,
  );
};
window.closeModal = () => {
  if (isKickedOut) return;
  const modal = document.getElementById("custom-modal");
  if (modal) {
    clearTimeout(customModalHideTimer);
    modal.classList.remove("active");
    customModalHideTimer = setTimeout(() => {
      modal.style.display = "none";
      modal.classList.remove("history-mode");
    }, 220);
  }
};
window.closeProfileModal = () => {
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) {
    profileModal.classList.remove("active");
    setTimeout(() => (profileModal.style.display = "none"), 300);
  }
};

// ==============================================================================
// 5. THEO DÕI PHIÊN ĐĂNG NHẬP & BẢO MẬT (AUTO-SAVE)
// ==============================================================================
let initialLagTimeout = setTimeout(() => {
  if (isInitialLoad) {
    window.hideLoader();
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("login-form").classList.add("active");
  }
}, 1500);
const hasLocalSession = localStorage.getItem("thpt_student_auth_token");
if (!hasLocalSession) {
  clearTimeout(initialLagTimeout);
  window.hideLoader();
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("login-form").classList.add("active");
}

supabase.auth.onAuthStateChange(async (event, session) => {
  clearTimeout(initialLagTimeout);
  if (session) {
    currentUser = session.user;
    if (isAuthenticating) return;
    try {
      const [profileResult, moderationResult] = await Promise.all([
        supabase
          .from("user_profiles")
          .select(
            "id, username, email, phone, dob, school, full_name, avatar_url, role, history, active_exam, active_state, session_id, liked_exams, bookmarked_exams",
          )
          .eq("id", currentUser.id)
          .maybeSingle(),
        // Query tách riêng để web vẫn đăng nhập bình thường trước khi migration
        // hậu kiểm avatar được chạy trên Supabase.
        supabase
          .from("user_profiles")
          .select("avatar_status, avatar_warning, avatar_warning_at")
          .eq("id", currentUser.id)
          .maybeSingle(),
      ]);
      let { data, error } = profileResult;
      if (error) throw error;
      avatarModerationFeatureAvailable = !moderationResult.error;
      if (data && !moderationResult.error && moderationResult.data) {
        data = { ...data, ...moderationResult.data };
      }

      if (!data) {
        const fallbackUsername = currentUser.email
          ? currentUser.email.split("@")[0]
          : "user_" + Date.now().toString().slice(-4);
        const newProfile = {
          id: currentUser.id,
          username: fallbackUsername,
          email: currentUser.email || fallbackUsername + "@thithu.local",
          full_name: currentUser.user_metadata?.full_name || null,
          history: {},
          active_exam: null,
          active_state: null,
          session_id: currentSessionId,
          role: "student",
        };
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert([newProfile]);
        if (insertError) throw insertError;
        data = newProfile;
      }

      if (data) {
        userDataCache = {
          history: data.history || {},
          activeExam: data.active_exam,
          activeState: data.active_state,
          sessionId: data.session_id,
          username: data.username,
          email: data.email,
          phone: data.phone,
          dob: data.dob,
          school: data.school,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          avatar_status: data.avatar_status || (data.avatar_url ? "pending" : "none"),
          avatar_warning: data.avatar_warning || "",
          avatar_warning_at: data.avatar_warning_at || null,
          role: data.role,
          liked_exams: data.liked_exams || [],
          bookmarked_exams: data.bookmarked_exams || [],
        };

        // Đồng bộ Két sắt Tim xuống máy (Chống Ảo ảnh hiển thị)
        localStorage.setItem(
          "thpt_liked_" + currentUser.id,
          JSON.stringify(userDataCache.liked_exams),
        );
        localStorage.setItem(
          "thpt_bookmarked_" + currentUser.id,
          JSON.stringify(userDataCache.bookmarked_exams),
        );

        // Hồi sinh dữ liệu từ LocalStorage (Cứu nét vẽ & thời gian)
        const localActiveStr = localStorage.getItem(
          "thpt_active_" + currentUser.id,
        );
        if (localActiveStr) {
          try {
            const localActive = JSON.parse(localActiveStr);
            if (localActive.state && localActive.state.endTime > Date.now()) {
              userDataCache.activeExam = localActive.examId;
              userDataCache.activeState = localActive.state;
            } else {
              localStorage.removeItem("thpt_active_" + currentUser.id);
            }
          } catch (e) {}
        }

        if (sessionStorage.getItem("just_logged_in") === "true") {
          sessionStorage.removeItem("just_logged_in");
          await supabase
            .from("user_profiles")
            .update({ session_id: currentSessionId })
            .eq("id", currentUser.id);
          userDataCache.sessionId = currentSessionId;
        } else if (
          userDataCache.role !== "admin" &&
          userDataCache.role !== "editor"
        ) {
          if (
            userDataCache.sessionId &&
            currentSessionId &&
            userDataCache.sessionId !== currentSessionId
          ) {
            window.hideLoader();
            clearInterval(timerInterval);
            window.openModal("kickout");
            return;
          }
        }

        startSessionGuard();

        syncUserIdentityUI();
        let displayEmail = currentUser.email || "Chưa cập nhật";
        if (displayEmail.includes("@thithu.local"))
          displayEmail = "Tài khoản không dùng Gmail";
        document.getElementById("menu-display-email").innerText = displayEmail;
        showAvatarModerationNotice();

        if (isInitialLoad) {
          isInitialLoad = false;
          window.hideLoader();
          document.getElementById("auth-screen").style.display = "none";

          // Thu thập tín hiệu từ trang Đáp Án gửi về
          const urlParams = new URLSearchParams(window.location.search);
          const action = urlParams.get("action");
          const urlExamId = urlParams.get("examId");
          const urlAttempt = urlParams.get("attempt");

          const rState = JSON.parse(
            sessionStorage.getItem("thpt_review_state") || "null",
          );

          // 👉 ĐÃ FIX: Nhận diện lệnh quay về và khôi phục toàn bộ Bảng điểm + Nét vẽ
          if (
            action === "review" &&
            urlExamId &&
            userDataCache.history[urlExamId]
          ) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            ); // Xóa URL thừa đi cho đẹp
            window.startExam(urlExamId, "review", parseInt(urlAttempt, 10));
          } else if (rState && userDataCache.history[rState.id]) {
            window.startExam(rState.id, "review", rState.idx);
          }
          // Tự động lôi cổ học sinh vào lại phòng thi nếu đang làm dở
          else if (
            userDataCache.activeExam &&
            userDataCache.activeState &&
            userDataCache.activeState.endTime > Date.now()
          ) {
            window.startExam(userDataCache.activeExam, "continue");
          } else {
            const lastView = sessionStorage.getItem("thpt_current_view");
            if (lastView === "profile") window.showProfilePage();
            else if (lastView === "documents") window.showDocumentsPage();
            else window.showHome();
          }
        }
      } else {
        await supabase.auth.signOut();
        window.hideLoader();
        document.getElementById("auth-screen").style.display = "flex";
        document.getElementById("login-form").classList.add("active");
      }
    } catch (err) {
      window.hideLoader();
      document.getElementById("auth-screen").style.display = "flex";
      document.getElementById("login-form").classList.add("active");
    }
  } else {
    clearInterval(sessionGuardInterval);
    stopDocumentRealtimeSync();
    isInitialLoad = true;
    currentUser = null;
    DOCUMENT_DATABASE = [];
    likedDocumentIds.clear();
    savedDocumentIds.clear();
    documentsLoaded = false;
    window.hideLoader();
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("login-form").classList.add("active");
    document.getElementById("header-user-info").style.display = "none";
    document.getElementById("hamburger-btn").style.display = "none";
  }
});

// ==============================================================================
// 6. XỬ LÝ AUTH (LOGIN, REGISTER, QUÊN MẬT KHẨU)
// ==============================================================================
window.formatDOB = (input) => {
  let v = input.value.replace(/\D/g, "");
  if (v.length >= 3 && v.length <= 4) v = v.slice(0, 2) + "/" + v.slice(2);
  else if (v.length > 4)
    v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4, 8);
  input.value = v;
};
window.togglePassword = (id, el) => {
  const i = document.getElementById(id);
  if (i.type === "password") {
    i.type = "text";
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  } else {
    i.type = "password";
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  }
};
window.checkEnter = (e, type) => {
  if (e.key === "Enter") {
    if (type === "login") window.handleLogin();
    else if (type === "register") window.handleRegister();
    else if (type === "forgot") window.handleForgot();
  }
};

window.toggleAuth = (type) => {
  document.getElementById("login-form").classList.remove("active");
  document.getElementById("register-form").classList.remove("active");
  document.getElementById("forgot-form").classList.remove("active");
  document.getElementById("login-error").style.display = "none";
  document.getElementById("reg-error").style.display = "none";
  document.getElementById("reg-success").style.display = "none";
  document.getElementById("forgot-error").style.display = "none";
  if (type === "login")
    document.getElementById("login-form").classList.add("active");
  else if (type === "register")
    document.getElementById("register-form").classList.add("active");
  else if (type === "forgot")
    document.getElementById("forgot-form").classList.add("active");
};

window.handleForgot = async () => {
  const mail = document.getElementById("forgot-email").value.trim();
  const e = document.getElementById("forgot-error");
  const btn = document.getElementById("btn-forgot");
  e.style.display = "none";
  if (!mail) {
    e.innerText = "Vui lòng nhập Gmail của bạn!";
    e.style.display = "block";
    return;
  }
  btn.innerText = "ĐANG GỬI LINK...";
  btn.style.opacity = "0.7";
  btn.disabled = true;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(mail, {
      redirectTo:
        window.location.origin +
        window.location.pathname.replace("index.html", "") +
        "reset.html",
    });
    if (error) throw error;
    window.showNotification("Thành công!", "Link đã được gửi đến Gmail.");
    window.toggleAuth("login");
  } catch (err) {
    e.innerText = "Gmail chưa đăng ký hoặc lỗi hệ thống!";
    e.style.display = "block";
  } finally {
    btn.innerText = "GỬI LINK ĐẶT LẠI MK";
    btn.style.opacity = "1";
    btn.disabled = false;
  }
};

window.handleRegister = async () => {
  const fullName = document.getElementById("reg-fullname").value.trim(),
    u = document.getElementById("reg-user").value.trim(),
    email = document.getElementById("reg-email").value.trim(),
    phone = document.getElementById("reg-phone").value.trim(),
    dobRaw = document.getElementById("reg-dob").value.trim(),
    school = document.getElementById("reg-school").value.trim(),
    p = document.getElementById("reg-pass").value,
    c = document.getElementById("reg-pass-confirm").value;
  const e = document.getElementById("reg-error");
  const s = document.getElementById("reg-success");
  e.style.display = "none";
  s.style.display = "none";
  if (!u || !dobRaw || !p || !c || !fullName) {
    e.innerText = "Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
    e.style.display = "block";
    return;
  }
  if (fullName.toLowerCase() === u.toLowerCase()) {
    e.innerText = "Họ và tên không được giống hệt Tên đăng nhập!";
    e.style.display = "block";
    return;
  }
  const dbDob = parseVietnameseDate(dobRaw);
  if (!dbDob) {
    e.innerText = "Ngày sinh không hợp lệ (VD: 15/08/2009)!";
    e.style.display = "block";
    return;
  }
  if (p !== c) {
    e.innerText = "Mật khẩu xác nhận không khớp!";
    e.style.display = "block";
    return;
  }

  try {
    isAuthenticating = true;
    window.showLoader("Đang tạo tài khoản...");
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("username", u);
    if (existingUser && existingUser.length > 0) {
      window.hideLoader();
      isAuthenticating = false;
      e.innerText = "Tên đăng nhập đã có người sử dụng!";
      e.style.display = "block";
      return;
    }

    currentSessionId =
      Date.now().toString() + Math.random().toString(36).substr(2, 5);
    localStorage.setItem("thpt_stu_session_id", currentSessionId);
    let finalEmail = email || u.toLowerCase() + "@thithu.local";
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: finalEmail,
      password: p,
      options: { data: { full_name: fullName, username: u } },
    });
    if (authErr) throw authErr;
    if (
      authData.user &&
      authData.user.identities &&
      authData.user.identities.length === 0
    ) {
      window.hideLoader();
      isAuthenticating = false;
      e.innerText = "Gmail này đã được đăng ký!";
      e.style.display = "block";
      return;
    }
    if (authData.user) {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert([
          {
            id: authData.user.id,
            username: u,
            email: finalEmail,
            full_name: fullName,
            phone: phone || null,
            dob: dbDob,
            school: school || null,
            history: {},
            active_exam: null,
            active_state: null,
            session_id: currentSessionId,
            role: "student",
          },
        ]);

      if (profileError) throw profileError;
    }
    sessionStorage.setItem("just_logged_in", "true");
    window.hideLoader();
    s.innerText = "Đăng ký thành công! Đang tự động đăng nhập...";
    s.style.display = "block";
    setTimeout(() => {
      isAuthenticating = false;
      window.location.reload();
    }, 1200);
  } catch (err) {
    window.hideLoader();
    isAuthenticating = false;
    e.innerText = "Lỗi đăng ký, vui lòng thử lại!";
    e.style.display = "block";
  }
};

window.handleLogin = async () => {
  const u = document.getElementById("login-user").value.trim(),
    p = document.getElementById("login-pass").value,
    e = document.getElementById("login-error");
  e.style.display = "none";
  if (!u || !p) {
    e.innerText = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
    e.style.display = "block";
    return;
  }
  try {
    isAuthenticating = true;
    window.showLoader("Đang đăng nhập...");
    let loginSuccess = false;
    let finalUserId = null;
    let guessEmail = u.includes("@") ? u : u.toLowerCase() + "@thithu.local";
    const { data: auth1, error: err1 } = await supabase.auth.signInWithPassword(
      { email: guessEmail, password: p },
    );
    if (!err1 && auth1.user) {
      loginSuccess = true;
      finalUserId = auth1.user.id;
    } else if (!u.includes("@")) {
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("email, id")
        .eq("username", u)
        .maybeSingle();
      if (userProfile && userProfile.email) {
        const { data: auth2, error: err2 } =
          await supabase.auth.signInWithPassword({
            email: userProfile.email,
            password: p,
          });
        if (!err2 && auth2.user) {
          loginSuccess = true;
          finalUserId = auth2.user.id;
        }
      }
    }
    if (!loginSuccess || !finalUserId) {
      window.hideLoader();
      isAuthenticating = false;
      e.innerText = "Tài khoản hoặc mật khẩu không chính xác!";
      e.style.display = "block";
      return;
    }
    sessionStorage.setItem("just_logged_in", "true");
    currentSessionId =
      Date.now().toString() + Math.random().toString(36).substr(2, 5);
    localStorage.setItem("thpt_stu_session_id", currentSessionId);
    await supabase
      .from("user_profiles")
      .update({ session_id: currentSessionId })
      .eq("id", finalUserId);
    window.hideLoader();
    setTimeout(() => {
      isAuthenticating = false;
      window.location.reload();
    }, 500);
  } catch (err) {
    window.hideLoader();
    isAuthenticating = false;
    e.innerText = "Lỗi kết nối mạng, vui lòng thử lại!";
    e.style.display = "block";
  }
};

window.handleLogout = async () => {
  window.showLoader("Đang đăng xuất...");
  sessionStorage.removeItem("thpt_in_exam");
  sessionStorage.removeItem("thpt_review_state");
  sessionStorage.removeItem("thpt_current_view");
  await supabase.auth.signOut();
  location.reload();
};

// ==============================================================================
// 7. MENU & ĐIỀU HƯỚNG GIAO DIỆN
// ==============================================================================
const savedTheme = localStorage.getItem("thpt_theme") || "light";
function applyTheme(theme) {
  const isDark = theme === "dark";
  [document.documentElement, document.body].forEach((element) => {
    if (!element) return;
    if (isDark) element.setAttribute("data-theme", "dark");
    else element.removeAttribute("data-theme");
  });
}
applyTheme(savedTheme);

function updateThemeUI(theme) {
  const isDark = theme === "dark";
  const iconD = document.getElementById("theme-icon-desktop");
  const textD = document.getElementById("theme-text-desktop");
  const iconM = document.getElementById("theme-icon-mobile");
  const textM = document.getElementById("theme-text-mobile");
  const themeIconMarkup = isDark
    ? '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>'
    : '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  if (iconD) iconD.innerHTML = themeIconMarkup;
  if (textD) textD.innerText = isDark ? "Chế độ sáng" : "Chế độ tối";
  if (iconM) iconM.innerHTML = themeIconMarkup;
  if (textM) textM.innerText = isDark ? "Chế độ sáng" : "Chế độ tối";
}

document.addEventListener("DOMContentLoaded", () => {
  updateThemeUI(savedTheme);
  window.initDrawerHandle();
  window.updateFabVisibility();
});
window.toggleTheme = () => {
  const currentTheme = document.body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("thpt_theme", newTheme);
  updateThemeUI(newTheme);
};
function setMainMenuActive(tabId) {
  document
    .querySelectorAll(".menu-item, .m-menu-item")
    .forEach((item) => item.classList.remove("active"));

  document
    .querySelectorAll(`[onclick*="'${tabId}'"]`)
    .forEach((item) => item.classList.add("active"));
}

window.switchTab = (tabId, element, event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const mobileDropdown = document.getElementById("mobile-dropdown");
  if (mobileDropdown) mobileDropdown.classList.remove("show");

  if (tabId === "luyenthi") {
    setMainMenuActive("luyenthi");
    sessionStorage.setItem("thpt_current_tab", "luyenthi");
    window.showHome();
  } else if (tabId === "tailieu") {
    setMainMenuActive("tailieu");
    sessionStorage.setItem("thpt_current_tab", "tailieu");
    window.showDocumentsPage();
  } else if (["ontap", "tintuc"].includes(tabId)) {
    // Không lưu các tab chưa phát triển, tránh popup tự bật lại sau F5/chuyển trang.
    sessionStorage.setItem("thpt_current_tab", "luyenthi");
    window.showNotification(
      "Thông báo",
      "Tính năng đang được đội ngũ kỹ thuật xây dựng và sẽ sớm ra mắt!",
    );
  }
};
window.handleLogoClick = () => {
  if (!isSubmitted && !isReviewMode && currentExam) window.openModal("exit");
  else window.switchTab("luyenthi");
};
window.toggleUserMenu = (event) => {
  if (event) event.stopPropagation();
  const menu = document.getElementById("profile-dropdown-menu");
  const container = document.getElementById("user-dropdown-container");
  if (menu) menu.classList.toggle("show");
  if (container) container.classList.toggle("open");
};
window.openProfileModal = () => {
  window.showProfilePage();
};
window.toggleMobileMenu = () => {
  document.getElementById("mobile-dropdown").classList.toggle("show");
};
window.toggleMobileSheet = (e) => {
  if (e) e.stopPropagation();
  const panel = document.getElementById("right-panel-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (panel) {
    panel.style.transition = "";
    panel.style.transform = "";
  }
  if (backdrop) {
    backdrop.style.transition = "";
    backdrop.style.opacity = "";
  }
  if (panel && panel.classList.contains("open")) {
    panel.classList.remove("open");
    if (backdrop) {
      clearTimeout(drawerBackdropHideTimer);
      backdrop.classList.remove("show");
      drawerBackdropHideTimer = setTimeout(() => {
        if (!backdrop.classList.contains("show"))
          backdrop.style.display = "none";
      }, 300);
    }
  } else if (panel) {
    panel.classList.add("open");
    if (backdrop) {
      clearTimeout(drawerBackdropHideTimer);
      backdrop.style.display = "block";
      setTimeout(() => backdrop.classList.add("show"), 10);
    }
  }
  window.updateFabVisibility();
};

// ==============================================================================
// 8. TẢI ĐỀ THI LÊN GIAO DIỆN TRANG CHỦ & TÌM KIẾM
// ==============================================================================
window.handleCohort = (cohort, btnEl) => {
  if (!VALID_COHORTS.has(cohort)) return;

  currentCohortFilter = cohort;
  const storageKey = getCohortStorageKey();
  if (storageKey) localStorage.setItem(storageKey, cohort);

  syncCohortInterface();
  renderHome();
};
window.handleFilterExam = (category, btnEl) => {
  currentCategoryFilter = category;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderHome();
};
window.handleSearchExam = () => {
  currentSearchQuery = document
    .getElementById("search-exam-input")
    .value.trim()
    .toLowerCase();
  clearTimeout(homeSearchTimer);
  homeSearchTimer = setTimeout(() => renderHome(), 140);
};

window.showHome = (force = false) => {
  if (
    !force &&
    userDataCache.activeExam &&
    sessionStorage.getItem("thpt_in_exam") === "true"
  ) {
    window.startExam(userDataCache.activeExam, "continue");
    return;
  }

  sessionStorage.setItem("thpt_current_view", "home");
  disposeExamPdf();
  document.body.classList.remove("is-documents-view");
  document.getElementById("documents-screen")?.classList.remove("is-active-screen");
  sessionStorage.setItem("thpt_current_tab", "luyenthi"); // 👉 ĐÃ FIX: Reset bộ nhớ Tab để chống kẹt Popup thông báo
  setMainMenuActive("luyenthi");
  restoreCohortPreference();
  syncCohortInterface();

  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  isReviewMode = false;
  isSubmitted = false;
  document.body.classList.remove("is-taking-exam", "has-exam-result");
  document.title = "Trang Chủ - Hệ Thống Thi Thử THPT Quốc Gia";
  const headerSelectors = [
    "header",
    ".header",
    ".top-navbar",
    "#header",
    ".navbar",
  ];
  headerSelectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (el) {
      el.style.display = "";
    }
  });
  document
    .getElementById("exam-workspace")
    .classList.remove("fullscreen-active");
  document.getElementById("header-timer-box").style.display = "none";
  document.getElementById("header-user-info").style.display =
    window.innerWidth <= 1024 ? "none" : "flex";
  document.getElementById("hamburger-btn").style.display =
    window.innerWidth <= 1024 ? "block" : "none";
  document.getElementById("home-screen").style.display = "block";
  const documentsScreen = document.getElementById("documents-screen");
  if (documentsScreen) documentsScreen.style.display = "none";
  document.getElementById("exam-workspace").style.display = "none";
  const profileScreen = document.getElementById("profile-screen");
  if (profileScreen) profileScreen.style.display = "none";
  setPublicAdsVisibility(true);
  window.updateFabVisibility();
  currentExam = null;
  renderHome();
  loadEngagementDashboard();
  showAvatarModerationNotice();
};

function animateNumberChange(element, newValue) {
  if (element.innerText == newValue) return;
  element.classList.remove("num-slide-up");
  void element.offsetWidth;
  element.innerText = newValue;
  element.classList.add("num-slide-up");
}

function formatLearningTime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}g ${minutes}p`;
  return `${minutes} phút`;
}

function getLocalLearningStats() {
  const history = parseJsonObject(userDataCache?.history);
  let attempts = 0;
  let totalDurationSeconds = 0;

  Object.values(history).forEach((examHistory) => {
    if (!Array.isArray(examHistory)) return;
    attempts += examHistory.length;
    examHistory.forEach((attempt) => {
      const duration = Number(attempt?.duration_seconds);
      if (Number.isFinite(duration) && duration > 0)
        totalDurationSeconds += duration;
    });
  });

  return { attempts, totalDurationSeconds };
}

function getDashboardDisplayName() {
  const fullName = String(userDataCache?.full_name || "").trim();
  const username = String(userDataCache?.username || "").trim();
  return fullName || username || "bạn";
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentWeekDates() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function renderAttendanceWeek(attendanceRows = []) {
  const container = document.getElementById("attendance-week");
  if (!container) return;

  const checkedDates = new Set(
    attendanceRows.map((row) => String(row.checked_date)),
  );
  const todayKey = getLocalDateKey(new Date());
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  container.innerHTML = getCurrentWeekDates()
    .map((date, index) => {
      const dateKey = getLocalDateKey(date);
      const isChecked = checkedDates.has(dateKey);
      const isToday = dateKey === todayKey;
      return `
        <div class="attendance-day ${isChecked ? "checked" : ""} ${isToday ? "today" : ""}">
          <span class="attendance-day-circle"><span class="attendance-day-number">${date.getDate()}</span></span>
          <span>${dayLabels[index]}</span>
        </div>
      `;
    })
    .join("");
}

function renderDashboardSummary(summary = null) {
  const localStats = getLocalLearningStats();
  const displayName = getDashboardDisplayName();
  const points = Number(summary?.total_points || 0);
  const streak = Number(summary?.current_streak || 0);

  const nameElement = document.getElementById("dashboard-user-name");
  if (nameElement) nameElement.textContent = displayName;

  const streakElement = document.getElementById("dashboard-streak");
  const timeElement = document.getElementById("dashboard-study-time");
  const attemptsElement = document.getElementById("dashboard-attempts");
  const pointsElement = document.getElementById("dashboard-points");

  if (streakElement) animateNumberChange(streakElement, streak);
  if (timeElement)
    animateNumberChange(
      timeElement,
      formatLearningTime(localStats.totalDurationSeconds),
    );
  if (attemptsElement) animateNumberChange(attemptsElement, localStats.attempts);
  if (pointsElement) animateNumberChange(pointsElement, `${points} điểm`);

  updateRankCharacter(document.getElementById("dashboard-level"), points);

  const checkinButton = document.getElementById("attendance-checkin-btn");
  const attendanceMessage = document.getElementById("attendance-message");
  if (checkinButton) {
    const checkedToday = Boolean(summary?.checked_today);
    checkinButton.disabled = checkedToday || engagementFeatureAvailable === false;
    checkinButton.classList.toggle("checked", checkedToday);
    const label = checkinButton.querySelector("span");
    if (label)
      label.textContent = checkedToday ? "Đã điểm danh" : "Điểm danh";
    if (attendanceMessage) {
      attendanceMessage.textContent = checkedToday
        ? `Đã giữ chuỗi ${streak} ngày hôm nay`
        : "Sẵn sàng cho hôm nay?";
    }
  }
}

function renderAttendanceLeaderboard(rows = [], error = null) {
  const container = document.getElementById("attendance-leaderboard");
  if (!container) return;

  if (error) {
    container.innerHTML = `<div class="dashboard-setup-notice">Chạy file <strong>supabase-engagement.sql</strong> để kích hoạt điểm danh và xếp hạng.</div>`;
    return;
  }

  if (!rows.length) {
    container.innerHTML = `<div class="dashboard-empty-row">Chưa có lượt điểm danh nào. Em có thể là người đầu tiên.</div>`;
    return;
  }

  container.innerHTML = rows
    .slice(0, 5)
    .map((row) => {
      const name = String(row.display_name || "Học sinh");
      const isCurrentUser = row.user_id === currentUser?.id;
      return `
        <div class="compact-ranking-row ${isCurrentUser ? "is-current-user" : ""}">
          <span class="ranking-position">#${Number(row.rank_position || 0)}</span>
          ${avatarMarkup(row.avatar_url, name)}
          <span class="ranking-person">
            <strong>${escapeHtml(name)}${isCurrentUser ? " (Bạn)" : ""}</strong>
            <span>${Number(row.current_streak || 0)} ngày liên tiếp</span>
          </span>
          <span class="ranking-score">${Number(row.total_points || 0)} điểm</span>
        </div>
      `;
    })
    .join("");
}

function renderEngagementSetupFallback() {
  engagementFeatureAvailable = false;
  renderDashboardSummary(null);
  renderAttendanceWeek([]);
  renderAttendanceLeaderboard([], true);
}

async function loadEngagementDashboard() {
  if (!currentUser) return;
  const loadSequence = ++engagementLoadSequence;
  renderDashboardSummary(null);

  const weekDates = getCurrentWeekDates();
  const weekStart = getLocalDateKey(weekDates[0]);
  const weekEnd = getLocalDateKey(weekDates[6]);

  try {
    const [summaryResult, attendanceResult, leaderboardResult] =
      await Promise.all([
        supabase.rpc("get_my_engagement_summary"),
        supabase
          .from("student_attendance")
          .select("checked_date, points_awarded")
          .gte("checked_date", weekStart)
          .lte("checked_date", weekEnd)
          .order("checked_date", { ascending: true }),
        supabase.rpc("get_attendance_leaderboard", { p_limit: 5 }),
      ]);

    if (loadSequence !== engagementLoadSequence) return;
    if (summaryResult.error || attendanceResult.error || leaderboardResult.error)
      throw (
        summaryResult.error || attendanceResult.error || leaderboardResult.error
      );

    engagementFeatureAvailable = true;
    renderDashboardSummary(summaryResult.data || {});
    renderAttendanceWeek(attendanceResult.data || []);
    renderAttendanceLeaderboard(leaderboardResult.data || []);
  } catch (error) {
    console.warn("Chưa thể tải dashboard chuyên cần:", error);
    if (loadSequence === engagementLoadSequence) renderEngagementSetupFallback();
  }
}

window.checkInToday = async () => {
  if (!currentUser) return;
  if (engagementFeatureAvailable === false) {
    window.showNotification(
      "Chưa kích hoạt",
      "Em hãy chạy file supabase-engagement.sql trong Supabase trước nhé!",
    );
    return;
  }

  const button = document.getElementById("attendance-checkin-btn");
  const label = button?.querySelector("span");
  if (button) button.disabled = true;
  if (label) label.textContent = "Đang ghi nhận...";

  try {
    const { data, error } = await supabase.rpc("check_in_today");
    if (error) throw error;

    if (button) {
      button.classList.add("checked", "checkin-pop");
      setTimeout(() => button.classList.remove("checkin-pop"), 650);
    }

    const awarded = Number(data?.points_awarded || 0);
    const successMessage = data?.already_checked
      ? "Hôm nay em đã điểm danh rồi"
      : `Điểm danh thành công, nhận ${awarded} điểm`;
    await loadEngagementDashboard();
    const message = document.getElementById("attendance-message");
    if (message) message.textContent = successMessage;
  } catch (error) {
    console.error("Không thể điểm danh:", error);
    if (button) button.disabled = false;
    if (label) label.textContent = "Điểm danh";
    window.showNotification(
      "Chưa điểm danh được",
      "Máy chủ chưa sẵn sàng hoặc SQL chuyên cần chưa được chạy.",
    );
  }
};

function renderResultLeaderboardRows(container, rows) {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = `<div class="dashboard-empty-row">Chưa có học sinh nào hoàn thành đề này.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="result-ranking-header"><span>Hạng</span><span>Học sinh</span><span>Điểm</span><span>Thời gian</span></div>
    ${rows
      .map((row) => {
        const isCurrentUser = row.user_id === currentUser?.id;
        const displayName = row.display_name || "Học sinh";
        return `<div class="result-ranking-row ${isCurrentUser ? "is-current-user" : ""}"${isCurrentUser ? ' aria-current="true"' : ""}>
          <span>#${Number(row.rank_position || 0)}</span>
          <span class="ranking-student-cell">
            ${avatarMarkup(row.avatar_url, displayName, "result-ranking-avatar")}
            <strong>${escapeHtml(displayName)}${isCurrentUser ? " (Bạn)" : ""}</strong>
          </span>
          <span class="result-row-score">${Number(row.score || 0).toFixed(2)}</span>
          <span>${formatExamDuration(row.duration_seconds, true)}</span>
        </div>`;
      })
      .join("")}
  `;
}

async function fetchExamLeaderboard(examId, order, limit = 20) {
  if (!examId) return [];
  const { data, error } = await supabase.rpc("get_exam_leaderboard", {
    p_exam_id: String(examId),
    p_limit: limit,
    p_sort_order: order,
  });
  if (error) throw error;
  return data || [];
}

async function loadResultExamLeaderboard(examId = currentExam?.id) {
  const container = document.getElementById("result-exam-leaderboard");
  const rankElement = document.getElementById("result-rank");
  if (!container || !examId) return;

  const requestedExamId = String(examId);
  const requestedOrder = resultExamSortOrder;
  const loadSequence = ++resultRankingLoadSequence;
  container.innerHTML = `<div class="dashboard-loading-row">Đang cập nhật bảng điểm...</div>`;
  if (rankElement) rankElement.textContent = "Đang xếp hạng";

  try {
    const rows = await fetchExamLeaderboard(
      requestedExamId,
      requestedOrder,
      50,
    );
    if (
      loadSequence !== resultRankingLoadSequence ||
      requestedOrder !== resultExamSortOrder ||
      requestedExamId !== String(currentExam?.id || "")
    )
      return;
    renderResultLeaderboardRows(container, rows);
    const myResult = rows.find((row) => row.user_id === currentUser?.id);
    if (rankElement) {
      rankElement.textContent = myResult
        ? `Hạng tốt nhất #${Number(myResult.rank_position || 0)}`
        : "Chưa xếp hạng";
    }
  } catch (error) {
    if (loadSequence !== resultRankingLoadSequence) return;
    console.warn("Chưa thể tải xếp hạng kết quả:", error);
    container.innerHTML = `<div class="dashboard-setup-notice">Chạy file <strong>supabase-engagement.sql</strong> để hiện bảng điểm của đề.</div>`;
    if (rankElement) rankElement.textContent = "Chưa kích hoạt";
  }
}

window.changeResultLeaderboardSort = (order, button) => {
  resultExamSortOrder = order === "desc" ? "desc" : "asc";
  document
    .querySelectorAll(".result-sort-controls button")
    .forEach((item) => item.classList.remove("active"));
  if (button) button.classList.add("active");
  loadResultExamLeaderboard();
};

function resetResultLeaderboardSort() {
  resultExamSortOrder = "asc";
  document
    .querySelectorAll(".result-sort-controls button")
    .forEach((item) =>
      item.classList.toggle("active", item.dataset.order === "asc"),
    );
}

function renderResultAttemptMeta(attemptData = {}) {
  const durationElement = document.getElementById("result-duration");
  if (durationElement) {
    durationElement.textContent = formatExamDuration(
      attemptData?.duration_seconds,
    );
  }
  loadResultExamLeaderboard();
}

// Kiểm tra định kỳ session_id để thiết bị cũ tự thoát khi tài khoản đăng nhập nơi khác.
function startSessionGuard() {
  clearInterval(sessionGuardInterval);

  if (
    !currentUser ||
    userDataCache.role === "admin" ||
    userDataCache.role === "editor"
  )
    return;

  sessionGuardInterval = setInterval(async () => {
    if (!currentUser || isKickedOut || document.hidden) return;

    try {
      const profileFields = avatarModerationFeatureAvailable
        ? "session_id, full_name, avatar_url, avatar_status, avatar_warning, avatar_warning_at"
        : "session_id, full_name, avatar_url";
      const { data, error } = await supabase
        .from("user_profiles")
        .select(profileFields)
        .eq("id", currentUser.id)
        .single();

      if (error) return;

      if (data?.session_id && data.session_id !== currentSessionId) {
        isKickedOut = true;
        clearInterval(timerInterval);
        clearInterval(sessionGuardInterval);
        window.openModal("kickout");
        return;
      }

      const identityChanged =
        data?.full_name !== userDataCache.full_name ||
        data?.avatar_url !== userDataCache.avatar_url;
      userDataCache.full_name = data?.full_name || userDataCache.full_name;
      userDataCache.avatar_url = data?.avatar_url || "";
      if (avatarModerationFeatureAvailable) {
        userDataCache.avatar_status = data?.avatar_status || "none";
        userDataCache.avatar_warning = data?.avatar_warning || "";
        userDataCache.avatar_warning_at = data?.avatar_warning_at || null;
      }
      if (identityChanged) syncUserIdentityUI();
      showAvatarModerationNotice();
    } catch (error) {
      console.warn("Không thể kiểm tra phiên đăng nhập:", error);
    }
  }, 30000);
}

function startRealtimeSync() {
  if (realtimeSyncInterval) clearInterval(realtimeSyncInterval);
  realtimeSyncInterval = setInterval(async () => {
    if (document.hidden) return;
    if (document.getElementById("home-screen").style.display === "none") return;
    try {
      const { data } = await supabase.from("exams").select("id, views, likes");
      if (data) {
        data.forEach((ex) => {
          const localEx = EXAM_DATABASE.find((e) => e.id === ex.id);
          if (localEx) {
            if (
              !recentlyInteracted.has(`view_${ex.id}`) &&
              localEx.views !== ex.views
            ) {
              localEx.views = ex.views || 0;
              const viewEl = document.getElementById(`view-count-${ex.id}`);
              if (viewEl) animateNumberChange(viewEl, localEx.views);
            }
            if (
              !recentlyInteracted.has(`like_${ex.id}`) &&
              localEx.likes !== ex.likes
            ) {
              localEx.likes = ex.likes || 0;
              const likeEl = document.getElementById(`like-val-${ex.id}`);
              if (likeEl) animateNumberChange(likeEl, localEx.likes);
            }
          }
        });
      }
    } catch (e) {}
  }, 10000);
}

window.renderHome = async () => {
  const listEl = document.getElementById("exam-list");
  if (!listEl) return;
  if (!isExamsMergedWithDB) {
    isExamsMergedWithDB = true;
    try {
      const { data: dbExams, error } = await supabase
        .from("exams")
        .select("id, title, category, cohort, pdf_url, views, likes, created_at")
        .order("created_at", { ascending: false });
      if (!error && dbExams) {
        dbExams.forEach((dbEx) => {
          const local = EXAM_DATABASE.find((e) => e.id === dbEx.id);
          if (local) {
            local.views = dbEx.views;
            local.likes = dbEx.likes;
          } else {
            EXAM_DATABASE.unshift({
              id: dbEx.id,
              title: dbEx.title,
              category: dbEx.category || "practise",
              cohort: dbEx.cohort || "2k9",
              pdfUrl: dbEx.pdf_url,
              answers: {},
              answersLoaded: false,
              timeMinutes: 90,
              views: dbEx.views || 0,
              likes: dbEx.likes || 0,
            });
          }
        });
      }
      startRealtimeSync();
    } catch (err) {}
  }

  const uid = currentUser ? currentUser.id : "guest";
  let bookmarkedExams = JSON.parse(
    localStorage.getItem("thpt_bookmarked_" + uid) || "[]",
  );
  let likedExams = JSON.parse(
    localStorage.getItem("thpt_liked_" + uid) || "[]",
  );

  const filteredExams = EXAM_DATABASE.filter((ex) => {
    const isBookmarked = bookmarkedExams.includes(ex.id);
    const matchesCohort = ex.cohort === currentCohortFilter;
    const matchesSearch = ex.title.toLowerCase().includes(currentSearchQuery);
    if (currentCategoryFilter === "bookmarked")
      return isBookmarked && matchesCohort && matchesSearch;
    const matchesCat =
      currentCategoryFilter === "all" || ex.category === currentCategoryFilter;
    return matchesCohort && matchesCat && matchesSearch;
  });

  if (filteredExams.length === 0) {
    if (currentCategoryFilter === "bookmarked")
      listEl.innerHTML = `<div class="empty-state">Bạn chưa lưu đề thi nào.</div>`;
    else
      listEl.innerHTML = `<div class="empty-state">Chưa có đề thi nào. Hệ thống đang cập nhật thêm...</div>`;
    return;
  }

  let examCardsHtml = "";
  filteredExams.forEach((ex) => {
    let historyData = userDataCache.history[ex.id] || [];
    let hasDoneExam = historyData.length > 0;
    let badgeHtml = "";
    let playIcon = `<svg class="prof-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    let actionsHtml = `<button class="btn-play primary" onclick="window.startExam('${ex.id}', 'new')">${playIcon} <span style="margin-left:5px;">Làm bài</span></button>`;
    if (hasDoneExam) {
      const lastAttempt = historyData[historyData.length - 1];
      badgeHtml = `<div class="exam-status-inline success">Đã làm ${historyData.length} lần • ${lastAttempt.score.toFixed(2)}đ</div>`;
      actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'retake')">Làm lại</button> <button class="btn-play secondary" onclick="window.showHistory('${ex.id}')">Lịch sử</button>`;
    } else if (userDataCache.activeExam === ex.id) {
      badgeHtml = `<div class="exam-status-inline warning">Đang làm dở...</div>`;
      actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'continue')">Tiếp tục</button>`;
    }

    const examCategoryLabels = {
      so: "Đề Sở & Tỉnh",
      chuyen: "Đề trường chuyên",
      practise: "Đề luyện tập",
    };
    const catLabel = examCategoryLabels[ex.category] || examCategoryLabels.practise;
    let year = ex.cohort === "2k8" ? "2026" : "2027";
    let isLiked = likedExams.includes(ex.id);
    let isBookmarked = bookmarkedExams.includes(ex.id);
    let totalViews = ex.views || 0;
    let totalLikes = ex.likes || 0;

    let eyeSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    let heartSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${isLiked ? "#ef4444" : "none"}" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    let bookmarkSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? "currentColor" : "none"}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

    examCardsHtml += `
            <div class="exam-card-pro no-cover">
                <div class="exam-info-box">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div class="exam-meta-pro" style="margin-bottom: 0;">${catLabel} • Khóa ${year}</div>${badgeHtml}
                    </div>
                    <h3 class="exam-title-pro">${escapeHtml(ex.title)}</h3>
                    
                    <div class="exam-stats-pro notranslate" translate="no" style="display: flex; align-items: center; gap: 20px; font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 6px;"> ${eyeSvg} <span style="display: inline-flex; align-items: center; gap: 4px;"><span id="view-count-${ex.id}">${totalViews}</span> lượt</span> </div>
                        <div id="like-btn-wrap-${ex.id}" style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${isLiked ? "#ef4444" : "inherit"}; user-select: none;" onclick="window.toggleLike('${ex.id}', this)" class="like-btn-hover ${isLiked ? "liked" : ""}"> ${heartSvg} <span id="like-val-${ex.id}">${totalLikes}</span> </div>
                    </div>
                    
                    <div class="exam-actions-pro" style="margin-top: auto;">
                        ${actionsHtml}
                        <button id="bookmark-btn-${ex.id}" class="btn-more-pro ${isBookmarked ? "active" : ""}" style="display:flex; align-items:center; justify-content:center;" onclick="window.toggleBookmark('${ex.id}', this)">${bookmarkSvg}</button>
                    </div>
                </div>
            </div>
        `;
  });
  listEl.innerHTML = examCardsHtml;
};

window.toggleBookmark = (examId, btn) => {
  const uid = currentUser ? currentUser.id : "guest";
  let bookmarkedExams = JSON.parse(
    localStorage.getItem("thpt_bookmarked_" + uid) || "[]",
  );
  let isBookmarked = bookmarkedExams.includes(examId);

  if (isBookmarked) {
    bookmarkedExams = bookmarkedExams.filter((id) => id !== examId);
    if (btn) {
      btn.classList.remove("active");
      btn.querySelector("svg").setAttribute("fill", "none");
    }
  } else {
    bookmarkedExams.push(examId);
    if (btn) {
      btn.classList.add("active");
      btn.querySelector("svg").setAttribute("fill", "currentColor");
    }
  }

  localStorage.setItem(
    "thpt_bookmarked_" + uid,
    JSON.stringify(bookmarkedExams),
  );
  if (userDataCache) userDataCache.bookmarked_exams = bookmarkedExams;

  if (currentUser) {
    supabase
      .from("user_profiles")
      .update({ bookmarked_exams: bookmarkedExams })
      .eq("id", uid)
      .then();
  }
  if (currentCategoryFilter === "bookmarked") {
    renderHome();
  }
};

window.toggleLike = async (examId, element) => {
  const uid = currentUser ? currentUser.id : "guest";
  const storedHistory = userDataCache?.history?.[examId];
  const historyData = Array.isArray(storedHistory) ? storedHistory : [];

  // Dùng cùng một quy tắc trên PC và mobile, kể cả tài khoản Admin: chỉ được
  // thả tim sau khi đã hoàn thành đề ít nhất một lần.
  if (historyData.length === 0) {
    window.showNotification(
      "Chưa thể thả tim",
      "Bạn phải hoàn thành bài thi này ít nhất 1 lần mới có thể thả tim nhé!",
    );
    return;
  }

  recentlyInteracted.add(`like_${examId}`);
  setTimeout(() => {
    recentlyInteracted.delete(`like_${examId}`);
  }, 8000);

  let likedExams = JSON.parse(
    localStorage.getItem("thpt_liked_" + uid) || "[]",
  );
  let isLiked = likedExams.includes(examId);
  let delta = 0;

  if (element) {
    element.classList.add("animating");
    setTimeout(() => {
      element.classList.remove("animating");
    }, 400);
  }

  if (isLiked) {
    likedExams = likedExams.filter((id) => id !== examId);
    delta = -1;
    element.classList.remove("liked");
    element.style.color = "inherit";
    element.querySelector("svg").setAttribute("fill", "none");
  } else {
    likedExams.push(examId);
    delta = 1;
    element.classList.add("liked");
    element.style.color = "#ef4444";
    element.querySelector("svg").setAttribute("fill", "#ef4444");
  }

  localStorage.setItem("thpt_liked_" + uid, JSON.stringify(likedExams));
  if (userDataCache) userDataCache.liked_exams = likedExams;

  const ex = EXAM_DATABASE.find((e) => e.id === examId);
  if (ex) {
    ex.likes = (ex.likes || 0) + delta;
    if (ex.likes < 0) ex.likes = 0;
    const valEl = document.getElementById(`like-val-${examId}`);
    if (valEl) {
      animateNumberChange(valEl, ex.likes);
    }
  }

  try {
    if (currentUser) {
      await supabase
        .from("user_profiles")
        .update({ liked_exams: likedExams })
        .eq("id", uid);
    }
    await supabase.rpc("increment_like", {
      exam_id_param: examId,
      delta: delta,
    });
  } catch (err) {}
};

// ==============================================================================
// 9. THƯ VIỆN TÀI LIỆU PDF
// ==============================================================================
const DOCUMENT_CATEGORY_LABELS = {
  "tong-on": "Đề thi",
  "chuyen-de": "Khác",
  "cong-thuc": "Công thức",
  khac: "Khác",
};

function formatDocumentFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "PDF";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocumentCount(value) {
  return Math.max(0, Number(value || 0)).toLocaleString("vi-VN");
}

function updateDocumentCountersFromRow(nextDocument) {
  if (!nextDocument?.id) return false;

  const localDocument = DOCUMENT_DATABASE.find(
    (item) => item.id === nextDocument.id,
  );
  if (!localDocument) return false;

  const previousDownloads = Number(localDocument.download_count || 0);
  const previousLikes = Number(localDocument.like_count || 180);
  Object.assign(localDocument, nextDocument);

  const nextDownloads = Number(localDocument.download_count || 0);
  const nextLikes = Number(localDocument.like_count || 180);

  if (previousDownloads !== nextDownloads) {
    const downloadElement = document.getElementById(
      `document-download-count-${localDocument.id}`,
    );
    if (downloadElement) {
      animateNumberChange(downloadElement, formatDocumentCount(nextDownloads));
    }
  }

  if (previousLikes !== nextLikes) {
    const likeElement = document.getElementById(
      `document-like-count-${localDocument.id}`,
    );
    if (likeElement) {
      animateNumberChange(likeElement, formatDocumentCount(nextLikes));
    }
  }

  return true;
}

function handleDocumentRealtimeChange(payload) {
  if (!documentsLoaded || !payload) return;

  if (payload.eventType === "UPDATE") {
    updateDocumentCountersFromRow(payload.new);
    return;
  }

  if (payload.eventType === "INSERT" && payload.new?.id) {
    const exists = DOCUMENT_DATABASE.some((item) => item.id === payload.new.id);
    if (!exists) DOCUMENT_DATABASE.unshift(payload.new);

    const documentsScreen = document.getElementById("documents-screen");
    if (documentsScreen?.style.display !== "none") renderDocuments();
    return;
  }

  if (payload.eventType === "DELETE" && payload.old?.id) {
    DOCUMENT_DATABASE = DOCUMENT_DATABASE.filter(
      (item) => item.id !== payload.old.id,
    );
    likedDocumentIds.delete(payload.old.id);
    savedDocumentIds.delete(payload.old.id);

    const documentsScreen = document.getElementById("documents-screen");
    if (documentsScreen?.style.display !== "none") renderDocuments();
  }
}

async function reconcileDocumentCounters() {
  if (!currentUser || !documentsLoaded || document.hidden) return;
  const documentsScreen = document.getElementById("documents-screen");
  if (!documentsScreen || documentsScreen.style.display === "none") return;

  const { data, error } = await supabase
    .from("documents")
    .select("id, download_count, like_count");
  if (error || !Array.isArray(data)) return;

  const localIds = new Set(DOCUMENT_DATABASE.map((item) => item.id));
  const databaseIds = new Set(data.map((item) => item.id));
  const listChanged =
    localIds.size !== databaseIds.size ||
    [...databaseIds].some((documentId) => !localIds.has(documentId));

  if (listChanged) {
    documentsLoaded = false;
    await loadDocumentsData();
    return;
  }

  data.forEach(updateDocumentCountersFromRow);
}

function stopDocumentRealtimeSync() {
  if (documentRealtimeFallbackInterval) {
    clearInterval(documentRealtimeFallbackInterval);
    documentRealtimeFallbackInterval = null;
  }

  if (documentRealtimeChannel) {
    void supabase.removeChannel(documentRealtimeChannel);
    documentRealtimeChannel = null;
  }
}

function startDocumentRealtimeSync() {
  if (!currentUser) return;
  stopDocumentRealtimeSync();

  documentRealtimeChannel = supabase
    .channel(`documents-live-${currentUser.id}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "documents" },
      handleDocumentRealtimeChange,
    )
    .subscribe((status) => {
      if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
        console.warn("Realtime tài liệu đang kết nối lại:", status);
      }
    });

  // Nhịp đối chiếu dự phòng giúp số liệu vẫn tự cập nhật nếu mạng chặn
  // WebSocket. Realtime vẫn là luồng chính và phản hồi gần như tức thì.
  documentRealtimeFallbackInterval = setInterval(
    reconcileDocumentCounters,
    45000,
  );
}

function setDocumentsLoadingState() {
  const list = document.getElementById("documents-list");
  if (!list) return;

  list.innerHTML = `
    <div class="documents-loading-state">
      <span class="documents-loading-spinner"></span>
      <p>Đang tải thư viện tài liệu...</p>
    </div>
  `;
}

window.showDocumentsPage = async () => {
  if (!currentUser) {
    window.showNotification(
      "Thông báo",
      "Em hãy đăng nhập để xem tài liệu nhé!",
    );
    return;
  }

  sessionStorage.setItem("thpt_current_view", "documents");
  disposeExamPdf();
  document.body.classList.add("is-documents-view");
  sessionStorage.setItem("thpt_current_tab", "tailieu");
  setMainMenuActive("tailieu");

  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  document.body.classList.remove("is-taking-exam");
  document.title = "Thư Viện Tài Liệu - Thi Thử Online";

  const profileScreen = document.getElementById("profile-screen");
  const documentsScreen = document.getElementById("documents-screen");
  const userMenu = document.getElementById("profile-dropdown-menu");

  document.getElementById("home-screen").style.display = "none";
  document.getElementById("exam-workspace").style.display = "none";
  if (profileScreen) profileScreen.style.display = "none";
  if (documentsScreen) {
    documentsScreen.style.display = "block";
    documentsScreen.classList.add("is-active-screen");
    requestAnimationFrame(() => {
      documentsScreen.scrollTop = Number(
        sessionStorage.getItem("thpt_documents_scroll") || 0,
      );
    });
  }
  if (userMenu) userMenu.classList.remove("show");

  document.getElementById("header-timer-box").style.display = "none";
  document.getElementById("header-user-info").style.display =
    window.innerWidth <= 1024 ? "none" : "flex";
  document.getElementById("hamburger-btn").style.display =
    window.innerWidth <= 1024 ? "block" : "none";

  setPublicAdsVisibility(true);
  window.updateFabVisibility();

  if (!documentsLoaded) {
    setDocumentsLoadingState();
    await loadDocumentsData();
  } else {
    renderDocuments();
  }
};

const documentsScrollElement = document.getElementById("documents-screen");
if (documentsScrollElement) {
  let documentsScrollFrame = 0;
  documentsScrollElement.addEventListener(
    "scroll",
    () => {
      if (documentsScrollFrame) return;
      documentsScrollFrame = requestAnimationFrame(() => {
        sessionStorage.setItem(
          "thpt_documents_scroll",
          String(Math.max(0, Math.round(documentsScrollElement.scrollTop))),
        );
        documentsScrollFrame = 0;
      });
    },
    { passive: true },
  );
}

async function loadDocumentsData() {
  const list = document.getElementById("documents-list");

  try {
    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select(
        "id, title, description, category, cohort, pdf_url, file_name, file_size, download_count, like_count, created_at",
      )
      .order("created_at", { ascending: false });

    if (documentsError) throw documentsError;

    const [likesResult, bookmarksResult] = await Promise.all([
      supabase
        .from("document_likes")
        .select("document_id")
        .eq("user_id", currentUser.id),
      supabase
        .from("document_bookmarks")
        .select("document_id")
        .eq("user_id", currentUser.id),
    ]);

    if (likesResult.error) throw likesResult.error;
    if (bookmarksResult.error) throw bookmarksResult.error;

    DOCUMENT_DATABASE = Array.isArray(documents) ? documents : [];
    likedDocumentIds = new Set(
      (likesResult.data || []).map((item) => item.document_id),
    );
    savedDocumentIds = new Set(
      (bookmarksResult.data || []).map((item) => item.document_id),
    );
    documentsLoaded = true;
    renderDocuments();
    startDocumentRealtimeSync();
  } catch (error) {
    console.error("Không thể tải thư viện tài liệu:", error);

    if (list) {
      list.innerHTML = `
        <div class="documents-error-state">
          <strong>Chưa thể tải thư viện tài liệu</strong>
          <span>Hệ thống đang được cập nhật. Em vui lòng thử lại sau nhé!</span>
        </div>
      `;
    }
  }
}

window.reloadDocuments = async () => {
  documentsLoaded = false;
  setDocumentsLoadingState();
  await loadDocumentsData();
};

window.handleSearchDocument = () => {
  currentDocumentSearchQuery = document
    .getElementById("search-document-input")
    .value.trim()
    .toLowerCase();
  clearTimeout(documentSearchTimer);
  documentSearchTimer = setTimeout(() => renderDocuments(), 140);
};

window.handleFilterDocument = (filter, button) => {
  currentDocumentFilter = filter;
  document
    .querySelectorAll(".document-filter-btn")
    .forEach((item) => item.classList.remove("active"));
  if (button) button.classList.add("active");
  renderDocuments();
};

function renderDocuments() {
  const list = document.getElementById("documents-list");
  const totalCount = document.getElementById("documents-total-count");
  if (!list) return;

  if (documentPreviewObserver) documentPreviewObserver.disconnect();

  const filteredDocuments = DOCUMENT_DATABASE.filter((documentItem) => {
    const title = String(documentItem.title || "").toLowerCase();
    const description = String(documentItem.description || "").toLowerCase();
    const matchesSearch =
      title.includes(currentDocumentSearchQuery) ||
      description.includes(currentDocumentSearchQuery);

    if (!matchesSearch) return false;
    if (currentDocumentFilter === "saved") {
      return savedDocumentIds.has(documentItem.id);
    }
    if (currentDocumentFilter === "khac") {
      return ["khac", "chuyen-de"].includes(documentItem.category);
    }
    return documentItem.category === currentDocumentFilter;
  });

  if (totalCount) totalCount.textContent = DOCUMENT_DATABASE.length;
  list.replaceChildren();

  if (filteredDocuments.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "documents-empty-state";
    emptyState.innerHTML = `
      <strong>Chưa tìm thấy tài liệu phù hợp</strong>
      <span>Em thử đổi từ khóa hoặc chọn một nhóm tài liệu khác nhé.</span>
    `;
    list.appendChild(emptyState);
    return;
  }

  documentPreviewObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        renderDocumentFirstPage(entry.target);
      });
    },
    {
      root: document.getElementById("documents-screen"),
      rootMargin: "120px 0px",
      threshold: 0.01,
    },
  );

  const fragment = document.createDocumentFragment();
  filteredDocuments.forEach((documentItem) => {
    const card = createDocumentCard(documentItem);
    fragment.appendChild(card);

    const preview = card.querySelector(".document-preview");
    if (preview) documentPreviewObserver.observe(preview);
  });
  list.appendChild(fragment);
}

function createDocumentCard(documentItem) {
  const card = document.createElement("article");
  const isLiked = likedDocumentIds.has(documentItem.id);
  const isSaved = savedDocumentIds.has(documentItem.id);
  const categoryLabel =
    DOCUMENT_CATEGORY_LABELS[documentItem.category] ||
    DOCUMENT_CATEGORY_LABELS.khac;

  card.className = "document-card";
  card.dataset.documentId = documentItem.id;
  card.innerHTML = `
    <div class="document-preview" role="img" aria-label="Xem trước phần đầu của tài liệu PDF">
      <span class="document-pdf-badge">PDF</span>
      <canvas aria-hidden="true"></canvas>
      <div class="document-preview-loader">
        <span class="document-preview-spinner"></span>
        <span>Đang tạo ảnh xem trước...</span>
      </div>
      <div class="document-preview-error">
        <svg class="ui-icon document-error-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M9 15h6"></path></svg>
        <span>Không xem trước được PDF</span>
      </div>
    </div>

    <div class="document-card-body">
      <div class="document-card-meta">
        <span class="document-category-tag">${escapeHtml(categoryLabel)}</span>
        <span class="document-file-meta">PDF • ${escapeHtml(formatDocumentFileSize(documentItem.file_size))}</span>
      </div>
      <h3 class="document-title">${escapeHtml(documentItem.title || "Tài liệu chưa đặt tên")}</h3>
      <p class="document-description">${escapeHtml(documentItem.description || "Tài liệu PDF phục vụ học tập và ôn thi THPT.")}</p>
      <div class="document-stats notranslate" translate="no">
        <span class="document-stat-item" title="Lượt tải tài liệu">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>
          </svg>
          <span><strong id="document-download-count-${documentItem.id}" data-document-download-count>${formatDocumentCount(documentItem.download_count)}</strong> lượt tải</span>
        </span>
        <button type="button" class="document-stat-like ${isLiked ? "active" : ""}" data-document-action="like" aria-label="Thả tim tài liệu" aria-pressed="${isLiked}">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span id="document-like-count-${documentItem.id}" data-document-like-count>${formatDocumentCount(documentItem.like_count)}</span>
        </button>
      </div>
    </div>

    <div class="document-actions">
      <button type="button" class="document-action-btn download" data-document-action="download">
        <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>
        </svg>
        <span>Tải tài liệu</span>
      </button>
      <button type="button" class="document-action-btn save ${isSaved ? "active" : ""}" data-document-action="save" aria-label="Lưu tài liệu" aria-pressed="${isSaved}">
        <svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  `;

  const preview = card.querySelector(".document-preview");
  preview.dataset.pdfUrl = documentItem.pdf_url || "";

  card
    .querySelector('[data-document-action="download"]')
    .addEventListener("click", (event) =>
      window.downloadDocument(documentItem.id, event.currentTarget),
    );
  card
    .querySelector('[data-document-action="like"]')
    .addEventListener("click", (event) =>
      window.toggleDocumentLike(documentItem.id, event.currentTarget),
    );
  card
    .querySelector('[data-document-action="save"]')
    .addEventListener("click", (event) =>
      window.toggleDocumentSave(documentItem.id, event.currentTarget),
    );

  return card;
}

async function renderDocumentFirstPage(preview) {
  if (!preview || preview.dataset.rendered === "true") return;

  const pdfUrl = preview.dataset.pdfUrl;
  const canvas = preview.querySelector("canvas");
  if (!pdfUrl || !canvas) {
    preview.classList.add("has-error");
    return;
  }

  preview.dataset.rendered = "true";
  let pdfDocument = null;

  try {
    const pdfjs = await ensurePdfJs();
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      disableAutoFetch: true,
    });
    pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const cssWidth = Math.max(220, preview.clientWidth - 28);
    const cssScale = cssWidth / baseViewport.width;
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const renderViewport = page.getViewport({
      scale: cssScale * outputScale,
    });

    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    const canvasCssWidth = Math.floor(renderViewport.width / outputScale);
    const canvasCssHeight = Math.floor(renderViewport.height / outputScale);
    canvas.style.width = `${canvasCssWidth}px`;
    canvas.style.height = `${canvasCssHeight}px`;

    // Chỉ để lộ khoảng 1/3 phía trên của trang đầu. Canvas vẫn được dựng đủ
    // chiều rộng nên chữ rõ hơn nhiều so với việc thu nhỏ cả trang PDF.
    const croppedPreviewHeight = Math.min(
      190,
      Math.max(145, Math.round(canvasCssHeight / 3 + 14)),
    );
    preview.style.setProperty(
      "--document-preview-height",
      `${croppedPreviewHeight}px`,
    );

    const context = canvas.getContext("2d", { alpha: false });
    await page.render({ canvasContext: context, viewport: renderViewport })
      .promise;
    preview.classList.add("is-ready");
  } catch (error) {
    console.warn("Không thể render trang đầu PDF:", error);
    preview.classList.add("has-error");
  } finally {
    if (pdfDocument) pdfDocument.destroy().catch(() => {});
  }
}

window.downloadDocument = async (documentId, button) => {
  const documentItem = DOCUMENT_DATABASE.find((item) => item.id === documentId);
  if (!documentItem?.pdf_url || button?.disabled) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Đang tải...";

  try {
    const fallbackName = `${String(documentItem.title || "tai-lieu")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")}.pdf`;

    try {
      const response = await fetch(documentItem.pdf_url);
      if (!response.ok) throw new Error("Không thể tải file PDF");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = documentItem.file_name || fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (downloadError) {
      // Một số máy chủ chặn fetch do CORS. Mở file trực tiếp vẫn giúp người
      // dùng xem và tải PDF bằng nút tải xuống của trình duyệt.
      console.warn("Chuyển sang mở PDF trực tiếp:", downloadError);
      const fallbackLink = document.createElement("a");
      fallbackLink.href = documentItem.pdf_url;
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noopener noreferrer";
      fallbackLink.download = documentItem.file_name || fallbackName;
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }

    let nextDownloadCount = Number(documentItem.download_count || 0) + 1;
    const { data: newCount, error: countError } = await supabase.rpc(
      "increment_document_download",
      { p_document_id: documentId },
    );
    if (countError) {
      // File đã được tải thành công nên lỗi bộ đếm không được biến thành
      // thông báo tải thất bại cho người dùng.
      console.warn("Chưa cộng được lượt tải tài liệu:", countError);
    } else {
      nextDownloadCount = Number(newCount ?? nextDownloadCount);
    }

    documentItem.download_count = nextDownloadCount;
    const card = button.closest(".document-card");
    const countElement = card?.querySelector("[data-document-download-count]");
    if (countElement) {
      animateNumberChange(
        countElement,
        formatDocumentCount(documentItem.download_count),
      );
    }
  } catch (error) {
    console.error("Lỗi tải tài liệu:", error);
    window.showNotification(
      "Chưa tải được tài liệu",
      "Đường truyền đang gặp lỗi. Em hãy thử lại sau nhé!",
    );
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
};

window.toggleDocumentLike = async (documentId, button) => {
  if (!currentUser || button?.disabled) return;

  const documentItem = DOCUMENT_DATABASE.find((item) => item.id === documentId);
  if (!documentItem) return;

  const wasLiked = likedDocumentIds.has(documentId);
  let optimisticLikeCount = Number(documentItem.like_count || 180);
  button.disabled = true;

  try {
    if (wasLiked) {
      const { error } = await supabase
        .from("document_likes")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("document_id", documentId);
      if (error) throw error;
      likedDocumentIds.delete(documentId);
      optimisticLikeCount = Math.max(180, optimisticLikeCount - 1);
    } else {
      const { error } = await supabase.from("document_likes").insert({
        user_id: currentUser.id,
        document_id: documentId,
      });
      if (error) throw error;
      likedDocumentIds.add(documentId);
      optimisticLikeCount += 1;
    }

    // Trigger trên Supabase mới là nguồn số liệu chuẩn. Đọc lại sau mỗi lần
    // bấm giúp bộ đếm không lệch khi nhiều học sinh tương tác cùng lúc.
    const { data: refreshedDocument, error: refreshError } = await supabase
      .from("documents")
      .select("like_count")
      .eq("id", documentId)
      .single();
    documentItem.like_count = refreshError
      ? optimisticLikeCount
      : Number(refreshedDocument.like_count || 180);

    const isLiked = likedDocumentIds.has(documentId);
    button.classList.toggle("active", isLiked);
    button.setAttribute("aria-pressed", String(isLiked));
    animateNumberChange(
      button.querySelector("[data-document-like-count]"),
      formatDocumentCount(documentItem.like_count),
    );
  } catch (error) {
    console.error("Không thể cập nhật lượt tim tài liệu:", error);
    window.showNotification("Lỗi", "Chưa thể cập nhật lượt tim lúc này.");
  } finally {
    button.disabled = false;
  }
};

window.toggleDocumentSave = async (documentId, button) => {
  if (!currentUser || button?.disabled) return;

  const wasSaved = savedDocumentIds.has(documentId);
  button.disabled = true;

  try {
    if (wasSaved) {
      const { error } = await supabase
        .from("document_bookmarks")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("document_id", documentId);
      if (error) throw error;
      savedDocumentIds.delete(documentId);
    } else {
      const { error } = await supabase.from("document_bookmarks").insert({
        user_id: currentUser.id,
        document_id: documentId,
      });
      if (error) throw error;
      savedDocumentIds.add(documentId);
    }

    const isSaved = savedDocumentIds.has(documentId);
    button.classList.toggle("active", isSaved);
    button.setAttribute("aria-pressed", String(isSaved));
    if (currentDocumentFilter === "saved" && !isSaved) renderDocuments();
  } catch (error) {
    console.error("Không thể lưu tài liệu:", error);
    window.showNotification("Lỗi", "Chưa thể lưu tài liệu lúc này.");
  } finally {
    button.disabled = false;
  }
};

// ==============================================================================
// 10. QUẢN LÝ THÔNG TIN CÁ NHÂN (PROFILE & OTP EMAIL)
// ==============================================================================
window.showProfilePage = () => {
  disposeExamPdf();
  document.body.classList.remove("is-documents-view");
  document.getElementById("documents-screen")?.classList.remove("is-active-screen");
  if (!currentUser || !userDataCache)
    return window.showNotification(
      "Lỗi",
      "Vui lòng đăng nhập để xem thông tin!",
    );
  sessionStorage.setItem("thpt_current_view", "profile");
  document.body.classList.remove("is-taking-exam");
  document.title = "Thông Tin Cá Nhân - Thi Thử Online";
  const homeScreen = document.getElementById("home-screen");
  if (homeScreen) homeScreen.style.display = "none";
  const documentsScreen = document.getElementById("documents-screen");
  if (documentsScreen) documentsScreen.style.display = "none";
  document.getElementById("exam-workspace").style.display = "none";
  const menu = document.getElementById("profile-dropdown-menu");
  if (menu) menu.classList.remove("show");
  document
    .querySelectorAll(".menu-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".m-menu-item")
    .forEach((el) => el.classList.remove("active"));
  const profileScreen = document.getElementById("profile-screen");
  if (profileScreen) profileScreen.style.display = "block";
  setPublicAdsVisibility(true);

  const userFullName =
    userDataCache.full_name ||
    (currentUser.user_metadata && currentUser.user_metadata.full_name) ||
    userDataCache.username;
  syncUserIdentityUI();
  const fullnameInput = document.getElementById("prof-input-fullname");
  if (fullnameInput)
    fullnameInput.value =
      userFullName !== userDataCache.username ? userFullName : "";
  document.getElementById("prof-input-username").value =
    userDataCache.username || "";
  let emailValue = "Chưa liên kết Gmail";
  if (currentUser.email && !currentUser.email.includes("@thithu.local"))
    emailValue = currentUser.email;
  document.getElementById("prof-display-email").value = emailValue;
  document.getElementById("prof-input-phone").value = userDataCache.phone || "";
  document.getElementById("prof-input-school").value =
    userDataCache.school || "";

  let dobFormatted = "";
  if (userDataCache.dob) {
    const parts = userDataCache.dob.split("-");
    if (parts.length === 3)
      dobFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    else dobFormatted = userDataCache.dob;
  }
  document.getElementById("prof-input-dob").value = dobFormatted;

  const editableFields = [
    "prof-input-fullname",
    "prof-input-phone",
    "prof-input-school",
    "prof-input-dob",
  ];
  editableFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = true;
      el.style.backgroundColor = "";
      el.style.cursor = "not-allowed";
      el.style.color = "";
    }
  });

  const btnSave = document.querySelector(".btn-save-profile");
  if (btnSave) {
    btnSave.innerText = "Chỉnh sửa thông tin";
    btnSave.onclick = window.enableProfileEditMode;
    btnSave.style.backgroundColor = "#0ea5e9";
  }
  const btnCancel = document.getElementById("btn-cancel-profile-edit");
  if (btnCancel) btnCancel.style.display = "none";
  const btnEditEmail = document.getElementById("btn-edit-email-trigger");
  if (btnEditEmail) btnEditEmail.style.display = "none";
  window.cancelEmailEdit();
  window.updateFabVisibility();
};

window.enableProfileEditMode = () => {
  const editableFields = [
    "prof-input-fullname",
    "prof-input-phone",
    "prof-input-school",
    "prof-input-dob",
  ];
  editableFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = false;
      el.style.backgroundColor = "";
      el.style.cursor = "text";
      el.style.color = "";
    }
  });
  const btnSave = document.querySelector(".btn-save-profile");
  if (btnSave) {
    btnSave.innerText = "Lưu thay đổi";
    btnSave.onclick = window.saveProfileData;
    btnSave.style.backgroundColor = "#10b981";
  }

  let btnCancel = document.getElementById("btn-cancel-profile-edit");
  if (!btnCancel) {
    btnCancel = document.createElement("button");
    btnCancel.id = "btn-cancel-profile-edit";
    btnCancel.innerText = "Hủy";
    btnCancel.style.padding = "12px 20px";
    btnCancel.style.borderRadius = "8px";
    btnCancel.style.border = "none";
    btnCancel.style.background = "#e2e8f0";
    btnCancel.style.color = "#0f172a";
    btnCancel.style.fontWeight = "bold";
    btnCancel.style.cursor = "pointer";
    btnCancel.style.transition = "0.2s";
    btnCancel.onclick = window.showProfilePage;
    if (btnSave && btnSave.parentNode) {
      btnSave.parentNode.style.display = "flex";
      btnSave.parentNode.style.gap = "15px";
      btnSave.parentNode.appendChild(btnCancel);
    }
  }
  if (btnCancel) btnCancel.style.display = "block";
  const btnEditEmail = document.getElementById("btn-edit-email-trigger");
  if (btnEditEmail) btnEditEmail.style.display = "block";
  const fullnameInput = document.getElementById("prof-input-fullname");
  if (fullnameInput) fullnameInput.focus();
};

window.saveProfileData = async () => {
  if (!currentUser) return;
  const fullName = document.getElementById("prof-input-fullname").value.trim();
  const phone = document.getElementById("prof-input-phone").value.trim();
  const school = document.getElementById("prof-input-school").value.trim();
  const dobRaw = document.getElementById("prof-input-dob").value.trim();
  if (!fullName)
    return window.showNotification("Lỗi", "Vui lòng nhập Họ và tên của bạn!");
  if (!phone || phone.length !== 10)
    return window.showNotification(
      "Lỗi",
      "Số điện thoại bắt buộc phải có đúng 10 chữ số!",
    );
  if (!phone.startsWith("0"))
    return window.showNotification(
      "Lỗi",
      "Số điện thoại không hợp lệ (phải bắt đầu bằng số 0)!",
    );

  let dbDob = null;
  if (dobRaw) {
    dbDob = parseVietnameseDate(dobRaw);
    if (!dbDob)
      return window.showNotification("Lỗi", "Ngày sinh không hợp lệ!");
  }

  const btn = document.querySelector(".btn-save-profile");
  try {
    btn.innerText = "Đang lưu...";
    btn.disabled = true;
    btn.style.opacity = "0.7";
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    let updates = {
      phone: phone || null,
      school: school || null,
      dob: dbDob,
      full_name: fullName,
    };
    let { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", currentUser.id);
    if (error && error.message.includes("does not exist")) {
      delete updates.full_name;
      await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", currentUser.id);
    } else if (error) throw error;
    userDataCache.full_name = fullName;
    userDataCache.phone = phone;
    userDataCache.school = school;
    userDataCache.dob = dbDob;
    syncUserIdentityUI();
    window.showNotification(
      "Thành công",
      "Đã cập nhật thông tin cá nhân của bạn!",
    );
    window.showProfilePage();
  } catch (err) {
    window.showNotification(
      "Thất bại",
      "Lỗi mạng hoặc hệ thống, không thể cập nhật.",
    );
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    if (btn.innerText === "Đang lưu...") btn.innerText = "Lưu thay đổi";
  }
};

window.handleAvatarUpload = async (input) => {
  const file = input.files[0];
  if (!file) return;
  const avatarExtensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!avatarExtensions[file.type]) {
    window.showNotification(
      "Định dạng chưa hỗ trợ",
      "Em hãy chọn ảnh JPG, PNG hoặc WebP để bảo đảm an toàn và tải nhanh.",
    );
    input.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    window.showNotification("Lỗi", "Vui lòng chọn ảnh dung lượng dưới 2MB!");
    input.value = "";
    return;
  }
  const overlay = document.querySelector(".avatar-edit-overlay");
  if (overlay) {
    overlay.innerText = "Đang tải...";
    overlay.style.opacity = "1";
  }
  try {
    const fileExt = avatarExtensions[file.type];
    const fileName = `user_${currentUser.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    const avatarUrl = publicUrlData.publicUrl;
    const oldAvatarPath = getPublicStoragePath(
      userDataCache.avatar_url,
      "avatars",
    );
    let { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        avatar_url: avatarUrl,
        avatar_status: "pending",
        avatar_warning: null,
        avatar_warning_at: null,
      })
      .eq("id", currentUser.id);

    // Tương thích trong lúc dự án chưa chạy migration hậu kiểm avatar.
    if (updateError && /avatar_(status|warning)/i.test(updateError.message || "")) {
      const fallbackUpdate = await supabase
        .from("user_profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", currentUser.id);
      updateError = fallbackUpdate.error;
    }
    if (updateError) throw updateError;

    if (oldAvatarPath && oldAvatarPath !== filePath) {
      supabase.storage
        .from("avatars")
        .remove([oldAvatarPath])
        .then(({ error }) => {
          if (error) console.warn("Không thể dọn ảnh đại diện cũ:", error);
        });
    }
    userDataCache.avatar_url = avatarUrl;
    userDataCache.avatar_status = "pending";
    userDataCache.avatar_warning = "";
    userDataCache.avatar_warning_at = null;
    syncUserIdentityUI();
  } catch (error) {
    window.showNotification("Lỗi", "Tải ảnh thất bại.");
  } finally {
    if (overlay) {
      overlay.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4 16 6h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l1.5-2z"></path><circle cx="12" cy="13" r="3"></circle></svg> Thay đổi';
      overlay.style.opacity = "";
    }
    input.value = "";
  }
};

let resendTimerInterval = null;
window.enableEmailEdit = () => {
  document.getElementById("email-view-mode").style.display = "none";
  document.getElementById("email-edit-mode").style.display = "flex";
  document.getElementById("email-input-step").style.display = "flex";
  document.getElementById("otp-input-step").style.display = "none";
  document.getElementById("prof-input-email").value = "";
  document.getElementById("otp-inline-input").value = "";
  document.getElementById("otp-status-msg").style.display = "none";
  clearInterval(resendTimerInterval);
};
window.cancelEmailEdit = () => {
  document.getElementById("email-view-mode").style.display = "flex";
  document.getElementById("email-edit-mode").style.display = "none";
  clearInterval(resendTimerInterval);
  const btnSend = document.getElementById("btn-send-otp");
  if (btnSend) {
    btnSend.innerText = "Gửi mã";
    btnSend.disabled = false;
    btnSend.style.opacity = "1";
  }
};

window.requestEmailOTP = async () => {
  const newEmail = document.getElementById("prof-input-email").value.trim();
  const statusMsg = document.getElementById("otp-status-msg");
  const btnSend = document.getElementById("btn-send-otp");
  if (!newEmail) {
    statusMsg.innerText = "Vui lòng nhập Gmail!";
    statusMsg.style.color = "#ef4444";
    statusMsg.style.display = "block";
    return;
  }
  if (
    currentUser &&
    currentUser.email === newEmail &&
    !newEmail.includes("@thithu.local")
  ) {
    statusMsg.innerText = "Gmail này đang được sử dụng!";
    statusMsg.style.color = "#f59e0b";
    statusMsg.style.display = "block";
    return;
  }
  statusMsg.innerText = "⏳ Đang gửi mã OTP đến Gmail...";
  statusMsg.style.color = "#0ea5e9";
  statusMsg.style.display = "block";
  btnSend.disabled = true;
  btnSend.style.opacity = "0.5";
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    statusMsg.innerText = "Gửi thất bại. Kiểm tra lại Gmail!";
    statusMsg.style.color = "#ef4444";
    btnSend.disabled = false;
    btnSend.style.opacity = "1";
    return;
  }
  document.getElementById("email-input-step").style.display = "none";
  document.getElementById("otp-input-step").style.display = "flex";
  document.getElementById("pending-email-text").innerText = newEmail;
  document.getElementById("otp-inline-input").focus();
  statusMsg.style.color = "#10b981";
  let timeLeft = 60;
  clearInterval(resendTimerInterval);
  const updateStatusWithTimer = () => {
    if (timeLeft <= 0) {
      clearInterval(resendTimerInterval);
      statusMsg.innerHTML = `Đã gửi mã. <a href="#" onclick="window.resendEmailOTP()" style="color: #0ea5e9; text-decoration: underline; cursor: pointer;">Gửi lại mã</a>`;
    } else {
      statusMsg.innerHTML = `Đã gửi mã. Vui lòng kiểm tra hộp thư. (Gửi lại sau ${timeLeft}s)`;
    }
  };
  updateStatusWithTimer();
  resendTimerInterval = setInterval(() => {
    timeLeft--;
    updateStatusWithTimer();
  }, 1000);
};

window.resendEmailOTP = async () => {
  const newEmail = document.getElementById("prof-input-email").value.trim();
  const statusMsg = document.getElementById("otp-status-msg");
  statusMsg.innerText = "⏳ Đang gửi lại mã...";
  statusMsg.style.color = "#0ea5e9";
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    statusMsg.innerText = "Gửi thất bại. Kiểm tra lại Gmail!";
    statusMsg.style.color = "#ef4444";
    return;
  }
  let timeLeft = 60;
  clearInterval(resendTimerInterval);
  const updateStatusWithTimer = () => {
    if (timeLeft <= 0) {
      clearInterval(resendTimerInterval);
      statusMsg.innerHTML = `Đã gửi lại mã. <a href="#" onclick="window.resendEmailOTP()" style="color: #0ea5e9; text-decoration: underline; cursor: pointer;">Gửi lại lần nữa</a>`;
    } else {
      statusMsg.innerHTML = `Đã gửi lại mã. (Gửi lại sau ${timeLeft}s)`;
    }
  };
  updateStatusWithTimer();
  resendTimerInterval = setInterval(() => {
    timeLeft--;
    updateStatusWithTimer();
  }, 1000);
};

window.verifyEmailOTP = async () => {
  const token = document.getElementById("otp-inline-input").value.trim();
  const email = document.getElementById("prof-input-email").value.trim();
  const statusMsg = document.getElementById("otp-status-msg");
  if (!token || token.length < 6) {
    statusMsg.innerText = "Mã OTP phải đủ 6 số!";
    statusMsg.style.color = "#ef4444";
    statusMsg.style.display = "block";
    return;
  }
  statusMsg.innerText = "⏳ Đang xác nhận...";
  statusMsg.style.color = "#0ea5e9";
  statusMsg.style.display = "block";
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: token,
    type: "email_change",
  });
  if (error) {
    statusMsg.innerText = "Mã xác nhận sai hoặc đã hết hạn!";
    statusMsg.style.color = "#ef4444";
    return;
  }
  await supabase
    .from("user_profiles")
    .update({ email: email })
    .eq("id", currentUser.id);
  userDataCache.email = email;
  currentUser.email = email;
  document.getElementById("prof-display-email").value = email;
  statusMsg.innerText = "Hoàn thành!";
  statusMsg.style.color = "#10b981";
  setTimeout(() => {
    window.cancelEmailEdit();
    statusMsg.style.display = "none";
  }, 1500);
};

// 👉 HÀM LƯU ĐỒNG BỘ 100% (GIỮ NÉT VẼ, THỜI GIAN NGAY KHI CÓ THAY ĐỔI)
window.saveProgress = (onlyLocal = false) => {
  const isValidSession =
    userDataCache.role === "admin" ||
    userDataCache.role === "editor" ||
    userDataCache.sessionId === currentSessionId;
  if (
    !currentUser ||
    !currentExam ||
    isSubmitted ||
    isReviewMode ||
    !isValidSession
  )
    return;

  const saveEndTime = endTime || Date.now() + totalTime * 1000;

  userDataCache.activeState = {
    endTime: saveEndTime,
    answers: getAllCurrentAnswers(),
    strokes: JSON.parse(JSON.stringify(strokes)),
  };

  localStorage.setItem(
    "thpt_active_" + currentUser.id,
    JSON.stringify({
      examId: currentExam.id,
      state: userDataCache.activeState,
    }),
  );

  if (!onlyLocal) {
    const examIdAtSave = currentExam.id;
    const stateAtSave = JSON.parse(JSON.stringify(userDataCache.activeState));

    // Xếp hàng lần lượt để bản lưu cũ không ghi đè bản mới khi mạng chậm.
    progressSavePromise = progressSavePromise
      .catch(() => {})
      .then(async () => {
        const { error } = await supabase
          .from("user_profiles")
          .update({ active_exam: examIdAtSave, active_state: stateAtSave })
          .eq("id", currentUser.id);

        if (error) throw error;
      })
      .catch((error) =>
        console.warn("Không thể đồng bộ tiến độ lên máy chủ:", error),
      );
  }
};

// ==============================================================================
// 10. PHÒNG THI: TẢI ĐỀ, CHẤM ĐIỂM
// ==============================================================================
async function loadPdfToCanvas(pdfUrl, disableLoader = false) {
  if (!disableLoader) window.showLoader("Đang tải đề thi ra màn hình...");
  const scrollContent = document.getElementById("pdf-scroll-content");
  const staticLayer = document.getElementById("static-layer");
  const drawLayer = document.getElementById("draw-layer");
  const wrapper = document.getElementById("pdf-render-wrapper");
  const renderToken = ++activePdfRenderToken;

  if (pdfPageObserver) {
    pdfPageObserver.disconnect();
    pdfPageObserver = null;
  }
  if (activePdfLoadingTask) {
    try {
      await activePdfLoadingTask.destroy();
    } catch (_error) {}
    activePdfLoadingTask = null;
  }
  if (activePdfDocument) {
    try {
      await activePdfDocument.destroy();
    } catch (_error) {}
    activePdfDocument = null;
  }

  // Xóa ngay bitmap của đề trước, không chờ PDF mới tải xong.
  resetDrawingSurface(false);
  Array.from(scrollContent.children).forEach((child) => {
    if (child.id !== "draw-layer" && child.id !== "static-layer")
      child.remove();
  });

  try {
    const pdfjs = await ensurePdfJs();
    if (renderToken !== activePdfRenderToken) return;
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      disableAutoFetch: false,
      disableStream: false,
    });
    activePdfLoadingTask = loadingTask;
    const pdf = await loadingTask.promise;
    if (renderToken !== activePdfRenderToken) return;
    activePdfDocument = pdf;
    activePdfLoadingTask = null;

    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, index) => pdf.getPage(index + 1)),
    );
    if (renderToken !== activePdfRenderToken) return;

    let totalHeight = 0;
    let maxWidth = 0;
    const pageCanvases = pages.map((page, index) => {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page-canvas is-pending";
      canvas.dataset.pageIndex = String(index);
      // Chỉ giữ kích thước bố cục ở giai đoạn chờ. Nếu đặt width/height bitmap
      // cho toàn bộ trang ngay tại đây, trình duyệt có thể cấp phát hàng trăm MB
      // dù học sinh chưa cuộn tới các trang đó.
      canvas.style.setProperty(
        "--pdf-page-width",
        `${Math.ceil(viewport.width)}px`,
      );
      canvas.style.setProperty(
        "--pdf-page-height",
        `${Math.ceil(viewport.height)}px`,
      );
      canvas.style.width = "var(--pdf-page-width)";
      canvas.style.height = "var(--pdf-page-height)";
      scrollContent.insertBefore(canvas, staticLayer);
      totalHeight += viewport.height;
      if (viewport.width > maxWidth) maxWidth = viewport.width;
      return { canvas, page, viewport };
    });

    originalPdfWidth = maxWidth;
    originalPdfHeight = totalHeight;
    staticLayer.width = maxWidth;
    staticLayer.height = totalHeight;
    drawLayer.width = maxWidth;
    drawLayer.height = totalHeight;

    // Luôn vẽ lại, kể cả mảng strokes đang rỗng, để không giữ pixel cũ.
    redrawStaticCanvas();
    clearLiveDrawingLayer();

    let initZ = 1;
    if (window.innerWidth <= 1024) initZ = wrapper.clientWidth / maxWidth;
    else if (initZ > 1) initZ = 1;
    window.changeZoom(initZ, true);
    setTool("none");

    const renderPage = async ({ canvas, page, viewport }) => {
      if (
        renderToken !== activePdfRenderToken ||
        canvas.dataset.rendered === "true" ||
        canvas.dataset.rendering === "true"
      )
        return;

      canvas.dataset.rendering = "true";
      try {
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: context, viewport }).promise;
        if (renderToken !== activePdfRenderToken) return;
        canvas.dataset.rendered = "true";
        canvas.classList.remove("is-pending");
        canvas.classList.add("is-rendered");
      } catch (error) {
        if (renderToken === activePdfRenderToken)
          console.warn("Không thể dựng một trang PDF:", error);
      } finally {
        delete canvas.dataset.rendering;
      }
    };

    // Chỉ chờ trang đầu để học sinh thấy đề ngay. Những trang còn lại được
    // dựng lần lượt khi sắp đi vào vùng nhìn, tránh khóa giao diện nhiều giây.
    if (pageCanvases[0]) await renderPage(pageCanvases[0]);
    if (renderToken !== activePdfRenderToken) return;
    if (!disableLoader) window.hideLoader();

    const renderQueue = [];
    let queueRunning = false;
    const enqueuePage = (pageEntry) => {
      if (
        !pageEntry ||
        pageEntry.canvas.dataset.rendered === "true" ||
        pageEntry.canvas.dataset.queued === "true"
      )
        return;
      pageEntry.canvas.dataset.queued = "true";
      renderQueue.push(pageEntry);
      if (queueRunning) return;
      queueRunning = true;
      void (async () => {
        while (renderQueue.length && renderToken === activePdfRenderToken) {
          const nextPage = renderQueue.shift();
          delete nextPage.canvas.dataset.queued;
          await renderPage(nextPage);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        queueRunning = false;
      })();
    };

    pdfPageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pageIndex = Number(entry.target.dataset.pageIndex);
          pdfPageObserver?.unobserve(entry.target);
          enqueuePage(pageCanvases[pageIndex]);
        });
      },
      { root: wrapper, rootMargin: "700px 0px", threshold: 0.01 },
    );

    pageCanvases.slice(1).forEach(({ canvas }) =>
      pdfPageObserver.observe(canvas),
    );
    if (pageCanvases[1]) enqueuePage(pageCanvases[1]);
  } catch (error) {
    if (renderToken !== activePdfRenderToken) return;
    console.error("Không thể tải PDF:", error);
    window.showNotification(
      "Lỗi tải đề",
      "Không thể tải file PDF. Vui lòng kiểm tra lại đường dẫn file!",
    );
    if (!disableLoader) window.hideLoader();
  }
}

function requestFullScreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen)
    elem.requestFullscreen().catch((err) => console.log(err));
  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

document.addEventListener("fullscreenchange", () => {
  if (
    !document.fullscreenElement &&
    sessionStorage.getItem("thpt_in_exam") === "true"
  ) {
    window.showNotification(
      "Cảnh báo vi phạm",
      "Bạn vừa thoát khỏi chế độ làm bài toàn màn hình!\nHệ thống yêu cầu làm bài nghiêm túc. Vui lòng bấm tắt thông báo này để quay lại chế độ thi.",
    );
  }
});

window.startExam = async (eId, mode, attIdx = null) => {
  syncVisibleViewportHeight();
  clearTimeout(drawerBackdropHideTimer);
  document.body.classList.remove("is-documents-view");
  document.getElementById("documents-screen")?.classList.remove("is-active-screen");
  document.body.classList.remove("has-exam-result");
  document.getElementById("right-panel-drawer").classList.remove("open");
  document.getElementById("drawer-backdrop").classList.remove("show");
  document.getElementById("drawer-backdrop").style.display = "none";
  try {
    if (EXAM_DATABASE.length === 0) {
      window.showLoader("Đang nạp dữ liệu đề thi...");
      const { data: dbExams, error } = await supabase
        .from("exams")
        .select("id, title, category, cohort, pdf_url, views, likes, created_at")
        .order("created_at", { ascending: false });
      if (!error && dbExams)
        EXAM_DATABASE = dbExams.map((ex) => ({
          id: ex.id,
          title: ex.title,
          category: ex.category || "practise",
          cohort: ex.cohort || "2k9",
          pdfUrl: ex.pdf_url,
          answers: {},
          answersLoaded: false,
          views: ex.views || 0,
          likes: ex.likes || 0,
        }));
    }
  } catch (err) {}

  currentExam = EXAM_DATABASE.find((e) => e.id === eId);
  if (!currentExam) {
    window.showLoader("Đang tải dữ liệu đề thi...");
    try {
      const { data: dbEx, error } = await supabase
        .from("exams")
        .select("id, title, category, cohort, pdf_url, answers, views, likes")
        .eq("id", eId)
        .single();
      if (dbEx) {
        currentExam = {
          id: dbEx.id,
          title: dbEx.title,
          category: dbEx.category || "practise",
          cohort: dbEx.cohort || "2k9",
          pdfUrl: dbEx.pdf_url,
          answers: dbEx.answers || {},
          answersLoaded: true,
          views: dbEx.views || 0,
          likes: dbEx.likes || 0,
          timeMinutes: 90,
        };
        EXAM_DATABASE.push(currentExam);
      }
    } catch (e) {}
  }
  if (!currentExam) {
    window.hideLoader();
    window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi này!");
    window.showHome(true);
    return;
  }

  // Danh sách trang chủ chỉ tải dữ liệu nhẹ. Đáp án lớn chỉ được nạp khi
  // học sinh thực sự mở đề, giúp lần vào trang và lọc đề nhanh hơn rõ rệt.
  if (!currentExam.answersLoaded) {
    window.showLoader("Đang chuẩn bị đề thi...");
    try {
      const { data: examDetails, error: detailsError } = await supabase
        .from("exams")
        .select("answers, pdf_url, title, category, cohort, views, likes")
        .eq("id", eId)
        .single();
      if (detailsError) throw detailsError;
      currentExam.answers = examDetails?.answers || {};
      currentExam.pdfUrl = examDetails?.pdf_url || currentExam.pdfUrl;
      currentExam.title = examDetails?.title || currentExam.title;
      currentExam.category = examDetails?.category || currentExam.category;
      currentExam.cohort = examDetails?.cohort || currentExam.cohort;
      currentExam.views = Number(examDetails?.views || currentExam.views || 0);
      currentExam.likes = Number(examDetails?.likes || currentExam.likes || 0);
      currentExam.answersLoaded = true;
    } catch (error) {
      console.error("Không thể tải chi tiết đề thi:", error);
      window.hideLoader();
      window.showNotification(
        "Chưa mở được đề",
        "Không thể tải đáp án và dữ liệu đề lúc này. Em vui lòng thử lại.",
      );
      return;
    }
  }

  // Mỗi lần mở kết quả đều bắt đầu đúng yêu cầu: điểm thấp đến điểm cao.
  resetResultLeaderboardSort();

  if (mode === "review") {
    const historyData = userDataCache.history[eId] || [];
    const idx = attIdx !== null ? attIdx : historyData.length - 1;
    sessionStorage.setItem(
      "thpt_review_state",
      JSON.stringify({ id: eId, idx: idx }),
    );
    sessionStorage.removeItem("thpt_in_exam");
  } else {
    sessionStorage.setItem("thpt_in_exam", "true");
    sessionStorage.removeItem("thpt_review_state");
  }

  // Một lượt thi mới phải có trạng thái nộp bài hoàn toàn độc lập với lượt
  // trước. Trước đây biến đã được reset nhưng nút vẫn còn disabled và còn chữ
  // "ĐÃ NỘP BÀI", khiến học sinh không thể nộp lần làm lại.
  clearInterval(timerInterval);
  isReviewMode = mode === "review";
  isSubmitted = isReviewMode;
  isSubmitting = false;
  const submitButton = document.getElementById("btn-submit-exam");
  if (submitButton) {
    submitButton.disabled = isReviewMode;
    submitButton.removeAttribute("aria-busy");
    submitButton.innerText = isReviewMode ? "ĐÃ NỘP BÀI" : "Nộp bài";
  }
  setPublicAdsVisibility(false);
  const headerSelectors = [
    "header",
    ".header",
    ".top-navbar",
    "#header",
    ".navbar",
  ];
  headerSelectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (el) el.style.display = "none";
  });

  document.getElementById("exam-workspace").classList.add("fullscreen-active");

  if (!isReviewMode) {
    document.body.classList.add("is-taking-exam");
    document.title = `Đang làm: ${currentExam.title}`;
    const timerBox = document.getElementById("header-timer-box");
    if (timerBox) {
      if (window.innerWidth <= 1024) document.body.appendChild(timerBox);
      else {
        const controlHeader = document.getElementById("control-header");
        const submitBtn = document.getElementById("btn-submit-exam");
        if (controlHeader && submitBtn && !controlHeader.contains(timerBox))
          controlHeader.insertBefore(timerBox, submitBtn);
      }
      timerBox.style.display = "inline-flex";
    }
    if (window.innerWidth > 1024) requestFullScreen();
  } else {
    document.body.classList.remove("is-taking-exam");
    document.title = `Lịch sử: ${currentExam.title}`;
  }

  // Dọn trạng thái con trỏ và bitmap của lượt trước ngay khi đổi chế độ làm bài.
  resetDrawingSurface(false);

  if (mode === "retake" || mode === "new") {
    userDataCache.activeState = null;
    strokes = [];
  } else if (isReviewMode) {
    const historyData = userDataCache.history[eId] || [];
    const idx = attIdx !== null ? attIdx : historyData.length - 1;
    const attemptData = historyData[idx] || {};
    if (attemptData.strokes && Array.isArray(attemptData.strokes))
      strokes = JSON.parse(JSON.stringify(attemptData.strokes));
    else strokes = [];
  } else if (mode === "continue" && userDataCache.activeState) {
    if (
      userDataCache.activeState.strokes &&
      Array.isArray(userDataCache.activeState.strokes)
    )
      strokes = JSON.parse(JSON.stringify(userDataCache.activeState.strokes));
    else strokes = [];
  }

  // 👉 ĐÃ FIX: Tính toán thời gian khôi phục CHUẨN XÁC TRƯỚC KHI LƯU VÀ TẢI ĐỀ
  if (!isReviewMode) {
    if (mode === "continue" && userDataCache.activeState) {
      if (userDataCache.activeState.endTime) {
        endTime = userDataCache.activeState.endTime;
        totalTime = Math.floor((endTime - Date.now()) / 1000);
        if (totalTime <= 0) totalTime = 1;
      } else {
        totalTime =
          userDataCache.activeState.timeLeft ||
          (currentExam.timeMinutes || 90) * 60;
        endTime = Date.now() + totalTime * 1000;
      }
    } else {
      totalTime = (currentExam.timeMinutes || 90) * 60;
      endTime = Date.now() + totalTime * 1000;
    }

    // Khởi tạo bản cứu hộ trực tiếp thay vì gọi saveProgress lúc bảng đáp án
    // của lượt trước vẫn còn trong DOM. Làm mới luôn bắt đầu rỗng; chỉ chế độ
    // Tiếp tục mới được mang đáp án và nét vẽ đang làm dở sang.
    userDataCache.activeExam = eId;
    const continuingState =
      mode === "continue" && userDataCache.activeState
        ? userDataCache.activeState
        : null;
    userDataCache.activeState = {
      endTime,
      answers: continuingState
        ? JSON.parse(JSON.stringify(continuingState.answers || {}))
        : {},
      strokes: continuingState
        ? JSON.parse(JSON.stringify(strokes))
        : [],
    };
    if (currentUser) {
      localStorage.setItem(
        "thpt_active_" + currentUser.id,
        JSON.stringify({
          examId: eId,
          state: userDataCache.activeState,
        }),
      );
    }

    // Đẩy ngầm lên mạng
    if (currentUser) {
      const activeStateAtStart = JSON.parse(
        JSON.stringify(userDataCache.activeState),
      );
      supabase
        .from("user_profiles")
        .update({
          active_exam: eId,
          active_state: activeStateAtStart,
        })
        .eq("id", currentUser.id)
        .then();
    }
  }

  document.getElementById("home-screen").style.display = "none";
  const documentsScreen = document.getElementById("documents-screen");
  if (documentsScreen) documentsScreen.style.display = "none";
  document.getElementById("exam-workspace").style.display = "flex";
  document.getElementById("header-user-info").style.display = "none";
  document.getElementById("hamburger-btn").style.display = "none";
  const examNameTitle = document.getElementById("current-exam-name");
  if (examNameTitle) examNameTitle.style.display = "none";
  const btnExit = document.getElementById("btn-exit-exam");
  if (btnExit) btnExit.style.display = "none";
  window.hideLoader();

  if (isReviewMode) {
    document.getElementById("summary-screen").style.display = "block";
    document.getElementById("sheets-container").style.display = "none";
    document.getElementById("control-header").style.display = "none";
    const historyData = userDataCache.history[eId] || [];
    const idx = attIdx !== null ? attIdx : historyData.length - 1;
    if (historyData[idx]) {
      fillAnswers(historyData[idx].answers);
      runGradingLogic(historyData[idx].answers, idx + 1);
    }
    const toolbar = document.getElementById("toolbar-wrapper");
    if (toolbar) toolbar.style.display = "none";
    const drawLayer = document.getElementById("draw-layer");
    if (drawLayer) drawLayer.style.pointerEvents = "none";
    document.getElementById("zoom-controls").style.display = "flex";
    const panel = document.getElementById("right-panel-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (panel) panel.classList.add("open");
    if (backdrop) {
      backdrop.style.display = "block";
      backdrop.classList.add("show");
    }
    window.updateFabVisibility();
    loadPdfToCanvas(currentExam.pdfUrl, true).catch((e) => {
      console.error(e);
    });
  } else {
    document.getElementById("summary-screen").style.display = "none";
    document.getElementById("sheets-container").style.display = "block";
    document.getElementById("control-header").style.display = "flex";

    window.initAnswerSheets();

    if (mode === "continue" && userDataCache.activeState) {
      fillAnswers(userDataCache.activeState.answers || {});
    }

    await loadPdfToCanvas(currentExam.pdfUrl, false);

    document.getElementById("toolbar-wrapper").style.display = "block";
    document.getElementById("zoom-controls").style.display = "flex";
    document.getElementById("toolbar-wrapper").classList.remove("hidden");
    document
      .getElementById("pdf-render-wrapper")
      .classList.remove("toolbar-closed");
    const drawLayer = document.getElementById("draw-layer");
    if (drawLayer) {
      drawLayer.style.pointerEvents =
        activeTool === "none" || activeTool === "pan" ? "none" : "auto";
    }

    startTimer();
    window.updateFabVisibility();
  }
};

const DEFAULT_EXAM_PARTS = [
  { key: "P1", title: "Phần 1", description: "Trắc nghiệm nhiều phương án", questionCount: 12 },
  { key: "P2", title: "Phần 2", description: "Trắc nghiệm đúng / sai", questionCount: 4 },
  { key: "P3", title: "Phần 3", description: "Trả lời ngắn", questionCount: 6 },
];

function getExamPartConfig(exam = currentExam) {
  const answers = exam?.answers || exam?.keys || {};
  const savedParts = Array.isArray(answers?._config?.parts)
    ? answers._config.parts
    : [];

  return DEFAULT_EXAM_PARTS.map((fallback) => {
    const saved = savedParts.find((part) => part?.key === fallback.key) || {};
    const requestedCount = Number(saved.questionCount);
    return {
      ...fallback,
      title: String(saved.title || fallback.title).trim().slice(0, 40),
      description: String(saved.description || fallback.description)
        .trim()
        .slice(0, 90),
      questionCount: Number.isInteger(requestedCount)
        ? Math.max(0, Math.min(60, requestedCount))
        : fallback.questionCount,
    };
  });
}

window.initAnswerSheets = () => {
  const container = document.getElementById("sheets-container");
  container.innerHTML = "";
  const [part1, part2, part3] = getExamPartConfig();
  let htmlContent = "";
  htmlContent += `<div class="section-title">${escapeHtml(part1.title.toUpperCase())} · ${escapeHtml(part1.description.toUpperCase())} (${part1.questionCount} CÂU)</div><div class="mcq-grid">`;
  for (let i = 1; i <= part1.questionCount; i++) {
    htmlContent += `<div class="q-compact-row"><div class="q-compact-num">Câu ${i}</div><div class="mcq-options compact">`;
    ["A", "B", "C", "D"].forEach((option) => {
      htmlContent += `<label class="mcq-label"><input type="radio" name="ans_P1_${i}" value="${option}"><span class="mcq-box round">${option}</span></label>`;
    });
    htmlContent += `</div><div class="result-feedback" id="feedback_P1_${i}"></div></div>`;
  }
  htmlContent += `</div><div class="section-title">${escapeHtml(part2.title.toUpperCase())} · ${escapeHtml(part2.description.toUpperCase())} (${part2.questionCount} CÂU)</div><div class="tf-grid-compact">`;
  for (let i = 1; i <= part2.questionCount; i++) {
    htmlContent += `<div class="q-compact-row tf-block"><div class="q-compact-num" style="width:100%; margin-bottom:5px;">Câu ${i}</div><div class="tf-items">`;
    ["a", "b", "c", "d"].forEach((subQ) => {
      htmlContent += `<div class="tf-item-row"><span class="tf-item-label">${subQ})</span><div><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="T"><span class="tf-box small true-box">Đ</span></label><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="F"><span class="tf-box small false-box">S</span></label></div></div>`;
    });
    htmlContent += `</div><div class="result-feedback" id="feedback_P2_${i}"></div></div>`;
  }
  htmlContent += `</div><div class="section-title">${escapeHtml(part3.title.toUpperCase())} · ${escapeHtml(part3.description.toUpperCase())} (${part3.questionCount} CÂU)</div><div class="short-grid">`;
  for (let i = 1; i <= part3.questionCount; i++) {
    htmlContent += `<div class="q-compact-row short-block"><div class="q-compact-num">Câu ${i}</div><input type="text" id="ans_P3_${i}" class="short-answer-input compact" placeholder="Nhập Đ.Án" autocomplete="off"><div class="result-feedback" id="feedback_P3_${i}"></div></div>`;
  }
  htmlContent += `</div>`;
  container.innerHTML = htmlContent;
};

// Lưu bản cứu hộ ngay khi học sinh đổi đáp án, không phải chờ chu kỳ 5 giây.
let answerInputSaveTimer = null;
document.getElementById("sheets-container")?.addEventListener("input", () => {
  clearTimeout(answerInputSaveTimer);
  answerInputSaveTimer = setTimeout(() => window.saveProgress(true), 250);
});

document.getElementById("sheets-container")?.addEventListener("change", () => {
  window.saveProgress(true);
});

window.viewDetailedAnswers = () => {
  if (!currentExam) {
    window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi hiện tại!");
    return;
  }
  let attemptIdx = 0;
  const reviewStateStr = sessionStorage.getItem("thpt_review_state");
  if (reviewStateStr) {
    const reviewState = JSON.parse(reviewStateStr);
    attemptIdx = reviewState.idx;
  } else {
    const historyData = userDataCache.history[currentExam.id] || [];
    attemptIdx = historyData.length > 0 ? historyData.length - 1 : 0;
  }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  window.location.href = `solution.html?examId=${currentExam.id}&attempt=${attemptIdx}`;
};

window.backToSummary = () => {
  document.getElementById("sheets-container").style.display = "none";
  document.getElementById("btn-back-summary").style.display = "none";
  document.getElementById("summary-screen").style.display = "block";
};

function getAllCurrentAnswers() {
  const answerSheet = document.getElementById("sheets-container");
  const answers = {};

  if (!answerSheet) return answers;

  answerSheet
    .querySelectorAll('input[type="radio"]:checked')
    .forEach((input) => {
      if (/^ans_P[12]_/.test(input.name)) answers[input.name] = input.value;
    });

  answerSheet
    .querySelectorAll('input[type="text"][id^="ans_P3_"]')
    .forEach((input) => {
      const value = input.value.trim();
      if (value !== "") answers[input.id] = value;
    });

  return answers;
}

function fillAnswers(answers) {
  const answerSheet = document.getElementById("sheets-container");
  if (!answerSheet || !answers) return;

  Object.entries(answers).forEach(([key, value]) => {
    const safeValue = CSS.escape(String(value));
    const radio = answerSheet.querySelector(
      `input[name="${CSS.escape(key)}"][value="${safeValue}"]`,
    );
    const text = answerSheet.querySelector(`#${CSS.escape(key)}`);

    if (radio) radio.checked = true;
    if (text && text.matches('input[type="text"][id^="ans_P3_"]'))
      text.value = value;
  });
}
function updateTimerDisplay() {
  let m = Math.floor(totalTime / 60)
    .toString()
    .padStart(2, "0");
  let s = (totalTime % 60).toString().padStart(2, "0");
  const timerEl = document.getElementById("global-timer");
  if (timerEl) timerEl.innerText = `${m}:${s}`;
}

function startTimer() {
  clearInterval(timerInterval);

  // Vì endTime đã được chốt từ lúc vào thi (startExam), ta chỉ việc chạy tiếp
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    let remaining = Math.floor((endTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      totalTime = 0;
      updateTimerDisplay();
      window.showNotification(
        "Hết giờ!",
        "Đã hết thời gian làm bài! Hệ thống tự động thu bài và chấm điểm.",
      );
      window.submitAndGrade();
      return;
    }
    totalTime = remaining;
    updateTimerDisplay();
    if (remaining % 5 === 0) window.saveProgress(false);
  }, 1000);
}

window.submitAndGrade = async () => {
  if (isSubmitting || isSubmitted || !currentUser || !currentExam) return;

  isSubmitting = true;
  clearInterval(timerInterval);

  const submitButton = document.getElementById("btn-submit-exam");
  const originalSubmitText = submitButton?.innerText || "Nộp bài";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerText = "ĐANG LƯU BÀI...";
  }

  const answers = getAllCurrentAnswers();
  const score = runGradingLogic(answers, null, false);
  const examId = currentExam.id;
  const submittedAt = new Date();
  const allowedDurationSeconds = (currentExam.timeMinutes || 90) * 60;
  const remainingDurationSeconds = Math.max(
    0,
    Math.floor((endTime - submittedAt.getTime()) / 1000),
  );
  const durationSeconds = Math.max(
    1,
    Math.min(
      allowedDurationSeconds,
      allowedDurationSeconds - remainingDurationSeconds,
    ),
  );
  const submittedAtText =
    submittedAt.toLocaleDateString("vi-VN") +
    " " +
    submittedAt.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  try {
    // Đợi các lần autosave trước đó kết thúc rồi mới ghi kết quả cuối cùng.
    await progressSavePromise.catch(() => {});

    const { data: latestProfile, error: readError } = await supabase
      .from("user_profiles")
      .select("history, session_id")
      .eq("id", currentUser.id)
      .single();

    if (readError) throw readError;

    const isPrivileged =
      userDataCache.role === "admin" || userDataCache.role === "editor";
    if (
      !isPrivileged &&
      latestProfile?.session_id &&
      latestProfile.session_id !== currentSessionId
    ) {
      throw new Error(
        "Phiên đăng nhập đã thay đổi. Em hãy đăng nhập lại trước khi nộp bài.",
      );
    }

    const latestHistory = parseJsonObject(
      latestProfile?.history || userDataCache.history,
    );
    if (!Array.isArray(latestHistory[examId])) latestHistory[examId] = [];

    latestHistory[examId].push({
      score,
      answers,
      date: submittedAtText,
      submitted_at: submittedAt.toISOString(),
      duration_seconds: durationSeconds,
      strokes: JSON.parse(JSON.stringify(strokes)),
    });

    const { error: saveError } = await supabase
      .from("user_profiles")
      .update({
        history: latestHistory,
        active_exam: null,
        active_state: null,
      })
      .eq("id", currentUser.id);

    if (saveError) throw saveError;

    // Bảng xếp hạng là dữ liệu bổ sung; lỗi tại đây không được làm mất bài thi.
    try {
      const { error: rankingSaveError } = await supabase.rpc(
        "record_exam_attempt",
        {
          p_exam_id: String(examId),
          p_score: score,
          p_duration_seconds: durationSeconds,
        },
      );
      if (rankingSaveError) throw rankingSaveError;
    } catch (rankingError) {
      console.warn(
        "Bài đã lưu nhưng chưa ghi được vào bảng xếp hạng:",
        rankingError,
      );
    }

    // Chỉ xóa bản cứu hộ và chuyển sang màn hình kết quả sau khi Supabase xác nhận lưu thành công.
    localStorage.removeItem("thpt_active_" + currentUser.id);
    sessionStorage.removeItem("thpt_in_exam");

    userDataCache.history = latestHistory;
    userDataCache.activeExam = null;
    userDataCache.activeState = null;

    const attemptIndex = latestHistory[examId].length - 1;
    sessionStorage.setItem(
      "thpt_review_state",
      JSON.stringify({ id: examId, idx: attemptIndex }),
    );

    isSubmitted = true;
    isReviewMode = true;
    setTool("none");
    runGradingLogic(answers);

    document.body.classList.remove("is-taking-exam");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    const toolbar = document.getElementById("toolbar-wrapper");
    if (toolbar) toolbar.style.display = "none";

    const drawLayer = document.getElementById("draw-layer");
    if (drawLayer) drawLayer.style.pointerEvents = "none";

    const panel = document.getElementById("right-panel-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    if (panel) panel.classList.add("open");
    if (backdrop) {
      backdrop.style.display = "block";
      setTimeout(() => backdrop.classList.add("show"), 10);
    }

    window.updateFabVisibility();
  } catch (error) {
    console.error("Không thể nộp bài:", error);
    window.showNotification(
      "Chưa nộp được bài",
      error?.message ||
        "Mạng hoặc máy chủ đang lỗi. Bài làm vẫn được giữ trên máy, em hãy thử nộp lại.",
    );

    // Khởi động lại đồng hồ vì bài chưa được máy chủ ghi nhận.
    if (endTime > Date.now()) startTimer();
  } finally {
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = isSubmitted;
      submitButton.innerText = isSubmitted ? "ĐÃ NỘP BÀI" : originalSubmitText;
    }
  }

  if (!isSubmitted) return;

  recentlyInteracted.add(`view_${examId}`);
  setTimeout(() => {
    recentlyInteracted.delete(`view_${examId}`);
  }, 8000);

  try {
    const ex = EXAM_DATABASE.find((e) => e.id === examId);
    if (ex) {
      ex.views = (ex.views || 0) + 1;
      const viewEl = document.getElementById(`view-count-${examId}`);
      if (viewEl) animateNumberChange(viewEl, ex.views);
    }
    await supabase.rpc("increment_view", { exam_id_param: examId });
  } catch (e) {
    console.error("Lỗi cập nhật lượt làm:", e);
  }
};

function runGradingLogic(ans, attempt = null, shouldRender = true) {
  let rawScore = 0;
  let p1_correct = 0;
  let p2_score = 0;
  let p3_correct = 0;
  const keys = currentExam.answers || currentExam.keys || {};
  const [part1, part2, part3] = getExamPartConfig();
  for (let i = 1; i <= part1.questionCount; i++) {
    let correctAns = null;
    if (keys.P1 && keys.P1[i])
      correctAns = typeof keys.P1[i] === "object" ? keys.P1[i].ans : keys.P1[i];
    const isCorrect = ans[`ans_P1_${i}`] === correctAns;
    if (isCorrect) p1_correct++;
  }
  rawScore += p1_correct * 0.25;
  for (let i = 1; i <= part2.questionCount; i++) {
    let opts = 0;
    const kv = keys.P2 && keys.P2[i];

    // Không tự bịa đáp án khi Admin chưa nhập đủ dữ liệu.
    if (
      kv &&
      ["a", "b", "c", "d"].every(
        (option) => kv[option] === "T" || kv[option] === "F",
      )
    ) {
      ["a", "b", "c", "d"].forEach((option) => {
        if (ans[`ans_P2_${i}${option}`] === kv[option]) opts++;
      });
    }

    const points =
      opts === 1
        ? 0.1
        : opts === 2
          ? 0.25
          : opts === 3
            ? 0.5
            : opts === 4
              ? 1
              : 0;
    p2_score += points;
  }
  rawScore += p2_score;
  for (let i = 1; i <= part3.questionCount; i++) {
    let correctAns = null;
    if (keys.P3 && keys.P3[i])
      correctAns = typeof keys.P3[i] === "object" ? keys.P3[i].ans : keys.P3[i];
    const normalizedCorrectAnswer = String(correctAns ?? "").trim();
    const hasCorrectAnswer = normalizedCorrectAnswer !== "";
    const isCorrect =
      hasCorrectAnswer &&
      String(ans[`ans_P3_${i}`] ?? "").trim() === normalizedCorrectAnswer;
    if (isCorrect) p3_correct++;
  }
  rawScore += p3_correct * 0.5;
  const maximumRawScore =
    part1.questionCount * 0.25 +
    part2.questionCount +
    part3.questionCount * 0.5;
  const totalScore = maximumRawScore > 0
    ? Math.round((rawScore / maximumRawScore) * 1000) / 100
    : 0;

  if (!shouldRender) return totalScore;

  document.body.classList.add("has-exam-result");
  document.getElementById("control-header").style.display = "none";
  document.getElementById("header-timer-box").style.display = "none";
  const toolbar = document.getElementById("toolbar-wrapper");
  if (toolbar) toolbar.style.display = "none";
  document.querySelectorAll("#sheets-container input").forEach((e) => {
    e.disabled = true;
  });
  const resultTitle = document.getElementById("result-exam-title");
  if (resultTitle) resultTitle.textContent = currentExam?.title || "Tổng kết bài làm";
  document.getElementById("final-score-text").innerText = totalScore.toFixed(2);
  const scoreRing = document.querySelector(".result-score-ring");
  if (scoreRing) {
    const scorePercent = Math.max(0, Math.min(100, totalScore * 10));
    const scoreColor =
      totalScore >= 8
        ? "#10b981"
        : totalScore >= 5
          ? "#2563eb"
          : totalScore >= 3
            ? "#f59e0b"
            : "#ef4444";
    scoreRing.style.setProperty("--result-score-progress", `${scorePercent}%`);
    scoreRing.style.setProperty("--result-score-color", scoreColor);
  }
  document.getElementById("summary-desc").innerText = attempt
    ? `Lần ${attempt}`
    : "Kết quả gần nhất";
  document.getElementById("summary-stats").innerHTML =
    `<div class="stat-row"><span>${escapeHtml(part1.title)}:</span> <strong>${p1_correct}/${part1.questionCount} câu đúng</strong></div><div class="stat-row"><span>${escapeHtml(part2.title)}:</span> <strong>${p2_score.toFixed(2)}/${part2.questionCount.toFixed(2)} điểm thô</strong></div><div class="stat-row"><span>${escapeHtml(part3.title)}:</span> <strong>${p3_correct}/${part3.questionCount} câu đúng</strong></div>`;
  const currentExamHistory = userDataCache.history?.[currentExam.id] || [];
  const resultAttempt = attempt
    ? currentExamHistory[attempt - 1] || {}
    : currentExamHistory[currentExamHistory.length - 1] || {};
  renderResultAttemptMeta(resultAttempt);
  document.getElementById("sheets-container").style.display = "none";
  document.getElementById("summary-screen").style.display = "block";
  return totalScore;
}

window.showHistory = (eId) => {
  const historyData = userDataCache.history[eId] || [];
  const ex = EXAM_DATABASE.find((e) => e.id === eId);
  const modal = document.getElementById("custom-modal");
  const listContainer = document.getElementById("modal-history-list");
  const toolbar = document.getElementById("modal-history-toolbar");
  const footer = document.getElementById("modal-history-footer");
  const count = document.getElementById("modal-history-count");
  const search = document.getElementById("modal-history-search");
  modal.classList.add("history-mode");
  document.getElementById("modal-title").innerText =
    `Lịch sử: ${ex?.title || eId}`;
  document.getElementById("modal-message").style.display = "none";
  document.getElementById("modal-action-buttons").style.display = "none";
  if (toolbar) toolbar.style.display = "block";
  if (footer) footer.style.display = "flex";
  listContainer.style.display = "block";
  const rows = historyData
    .map((attempt, index) => ({ attempt, index }))
    .reverse();
  listContainer.innerHTML = rows.length
    ? rows
        .map(({ attempt, index }) => {
          const durationText = Number.isFinite(Number(attempt.duration_seconds))
            ? formatExamDuration(attempt.duration_seconds, true)
            : "Chưa ghi thời gian";
          const searchable = `lần ${index + 1} ${attempt.date || ""} ${durationText}`.toLowerCase();
          return `<div class="history-item" data-history-search="${escapeHtml(searchable)}">
            <div class="history-info">
              <span class="h-attempt">Lần ${index + 1}</span>
              <span class="h-date">${escapeHtml(attempt.date || "Không rõ thời gian")}</span>
              <span class="h-duration">${escapeHtml(durationText)}</span>
            </div>
            <div class="history-result">
              <span class="h-score">${Number(attempt.score || 0).toFixed(2)}<small>/10</small></span>
              <button type="button" class="btn-review-sm" data-history-attempt="${index}">Xem đáp án</button>
            </div>
          </div>`;
        })
        .join("")
    : `<div class="history-empty">Chưa có lần làm bài nào.</div>`;

  if (count) count.textContent = `${historyData.length} lần làm bài`;
  if (search) {
    search.value = "";
    search.oninput = () => {
      const keyword = search.value.trim().toLowerCase();
      let visible = 0;
      listContainer.querySelectorAll(".history-item").forEach((row) => {
        const match = !keyword || row.dataset.historySearch.includes(keyword);
        row.hidden = !match;
        if (match) visible += 1;
      });
      if (count) count.textContent = `${visible}/${historyData.length} lần làm bài`;
    };
  }

  listContainer.onclick = (event) => {
    const reviewButton = event.target.closest("[data-history-attempt]");
    if (!reviewButton) return;
    const attemptIndex = Number(reviewButton.dataset.historyAttempt);
    window.closeModal();
    window.location.href = `solution.html?examId=${encodeURIComponent(eId)}&attempt=${attemptIndex}`;
  };

  modal.style.display = "flex";
  clearTimeout(customModalHideTimer);
  requestAnimationFrame(() => {
    modal.classList.add("active");
  });
};

// ==============================================================================
// 12. HỆ THỐNG POPUP MODAL VÀ XÓA CANVAS
// ==============================================================================
window.openModal = (action) => {
  const modal = document.getElementById("custom-modal");
  const title = document.getElementById("modal-title");
  const msg = document.getElementById("modal-message");
  const confirmBtn = document.getElementById("modal-confirm-btn");
  const cancelBtn = document.querySelector(
    "#modal-action-buttons .btn-cancel",
  );
  modal.classList.remove("history-mode");
  document.getElementById("modal-history-list").style.display = "none";
  const historyToolbar = document.getElementById("modal-history-toolbar");
  const historyFooter = document.getElementById("modal-history-footer");
  if (historyToolbar) historyToolbar.style.display = "none";
  if (historyFooter) historyFooter.style.display = "none";
  msg.style.display = "block";
  document.getElementById("modal-action-buttons").style.display = "flex";
  cancelBtn.style.display = "block";

  if (action === "exit") {
    if (isSubmitted || isReviewMode) {
      window.goHome();
      return;
    }
    title.innerText = "Thoát";
    msg.innerText =
      "Hệ thống sẽ lưu lại quá trình làm bài. Bạn có chắc chắn muốn thoát?";
    confirmBtn.className = "btn-confirm danger";
    confirmBtn.innerText = "Thoát";
    pendingAction = window.goHome;
  } else if (action === "submit") {
    title.innerText = "Nộp bài";
    msg.innerText = "Bạn đã chắc chắn hoàn thành và muốn nộp bài?";
    confirmBtn.className = "btn-confirm";
    confirmBtn.innerText = "Nộp";
    pendingAction = window.submitAndGrade;
  } else if (action === "clear_canvas") {
    title.innerText = "Xóa Tất Cả";
    msg.innerText = "Bạn chắc chắn muốn xóa toàn bộ nét vẽ trên màn hình?";
    confirmBtn.className = "btn-confirm danger";
    confirmBtn.innerText = "Xóa sạch";
    pendingAction = () => {
      resetDrawingSurface(true);
      window.saveProgress(true);
    };
  } else if (action === "kickout") {
    isKickedOut = true;
    title.innerText = "Cảnh báo bảo mật";
    msg.innerText =
      "Tài khoản của bạn vừa được đăng nhập trên một thiết bị hoặc trình duyệt khác! Phiên làm việc này sẽ bị đóng để bảo vệ tài khoản.";
    confirmBtn.className = "btn-confirm danger";
    confirmBtn.innerText = "Đăng xuất & Tải lại";
    cancelBtn.style.display = "none";
    pendingAction = window.handleLogout;
  }
  clearTimeout(customModalHideTimer);
  modal.style.display = "flex";
  requestAnimationFrame(() => {
    modal.classList.add("active");
  });
};

window.confirmAction = () => {
  if (pendingAction) pendingAction();
  window.closeModal();
};

// ==============================================================================
// 13. ZOOM, VẼ PDF (DRAW LAYER) VÀ TƯƠNG TÁC CHẠM (TOUCH)
// ==============================================================================
let currentZoom = 1;
window.changeZoom = (amount, isAbsolute = false) => {
  if (!originalPdfWidth) return;
  if (isAbsolute) currentZoom = amount;
  else currentZoom += amount;

  const wrapper = document.getElementById("pdf-render-wrapper");
  let minZoom = 0.2;
  if (wrapper && window.innerWidth <= 1024)
    minZoom = wrapper.clientWidth / originalPdfWidth;
  if (currentZoom < minZoom) currentZoom = minZoom;
  if (currentZoom > 5.0) currentZoom = 5.0;

  const scaledWidth = originalPdfWidth * currentZoom;
  const scrollContent = document.getElementById("pdf-scroll-content");
  if (scrollContent) scrollContent.style.transform = `scale(${currentZoom})`;

  const container = document.getElementById("pdf-zoom-container");
  if (wrapper && container) {
    // Điện thoại thật có thể làm tròn kích thước canvas khác số đo PDF. Đo
    // chính nội dung đã bố trí để vùng cuộn không kết thúc sớm và chém mất
    // phần cuối đề như khi chỉ dùng originalPdfHeight.
    const layoutHeight = scrollContent
      ? Math.max(scrollContent.scrollHeight, scrollContent.offsetHeight)
      : originalPdfHeight;
    const visualHeight = scrollContent
      ? scrollContent.getBoundingClientRect().height
      : 0;
    const scaledHeight = Math.max(
      originalPdfHeight * currentZoom,
      layoutHeight * currentZoom,
      visualHeight,
    );
    container.style.width = scaledWidth + "px";
    container.style.height = Math.ceil(scaledHeight) + 2 + "px";
    if (scaledWidth < wrapper.clientWidth)
      container.style.marginLeft =
        (wrapper.clientWidth - scaledWidth) / 2 + "px";
    else
      container.style.marginLeft = window.innerWidth <= 1024 ? "0px" : "20px";
  }
  const zoomText = document.getElementById("zoom-text");
  if (zoomText) zoomText.innerText = Math.round(currentZoom * 100) + "%";
};

window.addEventListener("resize", () => {
  if (
    document.getElementById("exam-workspace").style.display === "flex" &&
    originalPdfWidth
  ) {
    const wrapper = document.getElementById("pdf-render-wrapper");
    let newZ = 1;
    if (window.innerWidth <= 1024)
      newZ = wrapper.clientWidth / originalPdfWidth;
    else if (newZ > 1) newZ = 1;
    window.changeZoom(newZ, true);
  } else if (document.getElementById("home-screen").style.display === "block") {
    document.getElementById("hamburger-btn").style.display =
      window.innerWidth <= 1024 ? "block" : "none";
    document.getElementById("header-user-info").style.display =
      window.innerWidth <= 1024 ? "none" : "flex";
  }
  if (window.innerWidth > 1024) {
    const mobileMenu = document.getElementById("mobile-dropdown");
    if (mobileMenu) mobileMenu.classList.remove("show");
  }
  window.updateFabVisibility();
});

document.addEventListener(
  "wheel",
  function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      if (document.getElementById("exam-workspace").style.display === "flex") {
        if (e.deltaY < 0) window.changeZoom(0.05);
        else window.changeZoom(-0.05);
      }
    }
  },
  { passive: false },
);

const pdfWrapper = document.getElementById("pdf-render-wrapper");
let initDist = 0;
let initZoom = 1;
let pinchCenter = null;
pdfWrapper.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length === 2) {
      initDist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY,
      );
      initZoom = currentZoom;
      const rect = pdfWrapper.getBoundingClientRect();
      pinchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
    }
  },
  { passive: false },
);

pdfWrapper.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const scale =
        Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY,
        ) / initDist;
      let newZoom = initZoom * scale;
      let minZoom = 0.2;
      if (window.innerWidth <= 1024)
        minZoom = pdfWrapper.clientWidth / originalPdfWidth;
      if (newZoom < minZoom) newZoom = minZoom;
      if (newZoom > 5.0) newZoom = 5.0;
      const ratio = newZoom / currentZoom;
      if (ratio !== 1) {
        const contentX = pdfWrapper.scrollLeft + pinchCenter.x;
        const contentY = pdfWrapper.scrollTop + pinchCenter.y;
        window.changeZoom(newZoom, true);
        pdfWrapper.scrollLeft = contentX * ratio - pinchCenter.x;
        pdfWrapper.scrollTop = contentY * ratio - pinchCenter.y;
      }
    }
  },
  { passive: false },
);

const staticLayer = document.getElementById("static-layer");
const staticCtx = staticLayer.getContext("2d", { desynchronized: true });
const drawLayer = document.getElementById("draw-layer");
const drawCtx = drawLayer.getContext("2d", { desynchronized: true });
let strokes = [];
let currentStroke = null;
let isDrawing = false;
let activeTool = "none";
let brushColor = "#0f172a";
let brushSize = 3;
let activeDrawingPointerId = null;
let drawingFrameId = null;
let nextCurvePointIndex = 1;
let drawingSaveTimer = null;

function setTool(tool) {
  if (tool === "none" || activeTool === tool) {
    finishActiveStroke(false);
    activeTool = "none";
    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.remove("active", "eraser-active"));
    drawLayer.style.pointerEvents = "none";
    document.getElementById("pdf-render-wrapper").style.cursor = "default";
    document.getElementById("color-palette").style.opacity = "0.3";
    document.getElementById("color-palette").style.pointerEvents = "none";
    return;
  }
  activeTool = tool;
  document
    .querySelectorAll(".tool-btn")
    .forEach((b) => b.classList.remove("active", "eraser-active"));
  if (tool === "pan") {
    const toolPan = document.getElementById("tool-pan");
    if (toolPan) toolPan.classList.add("active");
    drawLayer.style.pointerEvents = "none";
    document.getElementById("pdf-render-wrapper").style.cursor = "grab";
    document.getElementById("color-palette").style.opacity = "0.3";
    document.getElementById("color-palette").style.pointerEvents = "none";
  } else {
    drawLayer.style.pointerEvents = "auto";
    document.getElementById("color-palette").style.opacity = "1";
    document.getElementById("color-palette").style.pointerEvents = "auto";
    if (tool === "pen") {
      const toolPen = document.getElementById("tool-pen");
      if (toolPen) toolPen.classList.add("active");
      brushSize = 3;
      const sizeInp = document.getElementById("brush-size");
      if (sizeInp) sizeInp.value = 3;
    } else if (tool === "highlighter") {
      const toolHighlighter = document.getElementById("tool-highlighter");
      if (toolHighlighter) toolHighlighter.classList.add("active");
      brushSize = 15;
      const sizeInp = document.getElementById("brush-size");
      if (sizeInp) sizeInp.value = 15;
    } else if (tool === "eraser") {
      const toolEraser = document.getElementById("tool-eraser");
      if (toolEraser) toolEraser.classList.add("eraser-active");
      brushSize = 25;
      const sizeInp = document.getElementById("brush-size");
      if (sizeInp) sizeInp.value = 25;
      document.getElementById("color-palette").style.opacity = "0.3";
      document.getElementById("color-palette").style.pointerEvents = "none";
    }
    updateBrushStyle();
  }
}

document
  .getElementById("tool-pen")
  ?.addEventListener("click", () => setTool("pen"));
document
  .getElementById("tool-highlighter")
  ?.addEventListener("click", () => setTool("highlighter"));
document
  .getElementById("tool-eraser")
  ?.addEventListener("click", () => setTool("eraser"));
document
  .getElementById("tool-pan")
  ?.addEventListener("click", () => setTool("pan"));
window.toggleToolbar = () => {
  document.getElementById("toolbar-wrapper").classList.toggle("hidden");
  document
    .getElementById("pdf-render-wrapper")
    .classList.toggle("toolbar-closed");
};
function updateBrushStyle() {
  if (activeTool === "none" || activeTool === "pan") return;
  if (activeTool === "eraser") {
    const s = Math.max(15, brushSize * 1.5);
    const svg = btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="white" fill-opacity="0.5" stroke="black" stroke-width="2"/></svg>`,
    );
    drawLayer.style.cursor = `url('data:image/svg+xml;base64,${svg}') ${s / 2} ${s / 2}, auto`;
  } else drawLayer.style.cursor = "crosshair";
}
document.getElementById("brush-size")?.addEventListener("input", (e) => {
  brushSize = parseInt(e.target.value);
  updateBrushStyle();
});
document.querySelectorAll(".color-swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    if (["eraser", "pan", "none"].includes(activeTool)) setTool("pen");
    document
      .querySelectorAll(".color-swatch")
      .forEach((s) => s.classList.remove("active"));
    swatch.classList.add("active");
    brushColor = swatch.dataset.color;
    updateBrushStyle();
  });
});

function drawSingleStroke(ctx, stroke) {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0)
    return;

  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = stroke.size;
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  } else if (stroke.tool === "highlighter") {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.42;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  const points = stroke.points;

  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index++) {
      const endPoint = midpoint(points[index], points[index + 1]);
      ctx.quadraticCurveTo(
        points[index].x,
        points[index].y,
        endPoint.x,
        endPoint.y,
      );
    }
    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  }

  ctx.restore();
}

function redrawStaticCanvas() {
  staticCtx.clearRect(0, 0, staticLayer.width, staticLayer.height);
  strokes.forEach((s) => drawSingleStroke(staticCtx, s));
}

function clearLiveDrawingLayer() {
  drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height);
}

function midpoint(firstPoint, secondPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  };
}

function getDrawCoords(event) {
  const rect = drawLayer.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / currentZoom,
    y: (event.clientY - rect.top) / currentZoom,
  };
}

function configureLiveContext(ctx, stroke) {
  ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.globalAlpha = stroke.tool === "highlighter" ? 0.42 : 1;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
}

function drawLiveDot(ctx, stroke, point) {
  ctx.save();
  configureLiveContext(ctx, stroke);
  ctx.beginPath();
  ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLiveCurve(ctx, stroke, startPoint, controlPoint, endPoint) {
  ctx.save();
  configureLiveContext(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.quadraticCurveTo(
    controlPoint.x,
    controlPoint.y,
    endPoint.x,
    endPoint.y,
  );
  ctx.stroke();
  ctx.restore();
}

function renderPendingStroke() {
  drawingFrameId = null;
  if (!isDrawing || !currentStroke) return;

  const points = currentStroke.points;
  const targetContext =
    currentStroke.tool === "eraser" ? staticCtx : drawCtx;

  while (nextCurvePointIndex < points.length - 1) {
    const controlPoint = points[nextCurvePointIndex];
    const endPoint = midpoint(controlPoint, points[nextCurvePointIndex + 1]);
    const startPoint =
      nextCurvePointIndex === 1
        ? points[0]
        : midpoint(points[nextCurvePointIndex - 1], controlPoint);

    drawLiveCurve(
      targetContext,
      currentStroke,
      startPoint,
      controlPoint,
      endPoint,
    );
    nextCurvePointIndex += 1;
  }
}

function scheduleStrokeRender() {
  if (drawingFrameId !== null) return;
  drawingFrameId = requestAnimationFrame(renderPendingStroke);
}

function appendPointerPoint(event) {
  if (!currentStroke) return;
  const point = getDrawCoords(event);
  const previousPoint = currentStroke.points[currentStroke.points.length - 1];
  const minimumDistance = Math.max(0.35, 0.5 / currentZoom);

  if (
    Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) <
    minimumDistance
  )
    return;

  currentStroke.points.push(point);
}

function scheduleDrawingSave() {
  clearTimeout(drawingSaveTimer);
  drawingSaveTimer = setTimeout(() => window.saveProgress(true), 120);
}

function resetDrawingSurface(clearStrokeHistory = false) {
  if (drawingFrameId !== null) cancelAnimationFrame(drawingFrameId);
  drawingFrameId = null;
  clearTimeout(drawingSaveTimer);
  drawingSaveTimer = null;

  if (
    activeDrawingPointerId !== null &&
    drawLayer.hasPointerCapture?.(activeDrawingPointerId)
  ) {
    try {
      drawLayer.releasePointerCapture(activeDrawingPointerId);
    } catch (error) {}
  }

  isDrawing = false;
  currentStroke = null;
  activeDrawingPointerId = null;
  nextCurvePointIndex = 1;

  clearLiveDrawingLayer();
  staticCtx.clearRect(0, 0, staticLayer.width, staticLayer.height);
  if (clearStrokeHistory) strokes = [];
}

function beginDraw(event) {
  if (isReviewMode || activeTool === "none" || activeTool === "pan") return;
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (isDrawing) return;

  event.preventDefault();
  isDrawing = true;
  activeDrawingPointerId = event.pointerId;
  nextCurvePointIndex = 1;
  currentStroke = {
    tool: activeTool,
    color: brushColor,
    size: brushSize,
    points: [getDrawCoords(event)],
  };

  try {
    drawLayer.setPointerCapture(event.pointerId);
  } catch (error) {}

  const targetContext = activeTool === "eraser" ? staticCtx : drawCtx;
  drawLiveDot(targetContext, currentStroke, currentStroke.points[0]);
}

function strokeDraw(event) {
  if (
    !isDrawing ||
    event.pointerId !== activeDrawingPointerId ||
    isReviewMode ||
    activeTool === "none" ||
    activeTool === "pan"
  )
    return;

  event.preventDefault();
  const pointerEvents = event.getCoalescedEvents
    ? event.getCoalescedEvents()
    : [event];
  pointerEvents.forEach(appendPointerPoint);
  scheduleStrokeRender();
}

function finishActiveStroke(shouldSave = true, event = null) {
  if (!isDrawing) return;

  if (event && event.pointerId !== activeDrawingPointerId) return;
  if (event) {
    const pointerEvents = event.getCoalescedEvents
      ? event.getCoalescedEvents()
      : [event];
    pointerEvents.forEach(appendPointerPoint);
  }

  if (drawingFrameId !== null) cancelAnimationFrame(drawingFrameId);
  drawingFrameId = null;
  renderPendingStroke();

  const completedStroke = currentStroke;
  const points = completedStroke.points;
  const targetContext =
    completedStroke.tool === "eraser" ? staticCtx : drawCtx;

  if (points.length === 2) {
    drawLiveCurve(
      targetContext,
      completedStroke,
      points[0],
      points[0],
      points[1],
    );
  } else if (points.length >= 3) {
    const lastPoint = points[points.length - 1];
    const startPoint = midpoint(points[points.length - 2], lastPoint);
    drawLiveCurve(
      targetContext,
      completedStroke,
      startPoint,
      lastPoint,
      lastPoint,
    );
  }

  isDrawing = false;
  strokes.push(completedStroke);
  if (completedStroke.tool !== "eraser") {
    drawSingleStroke(staticCtx, completedStroke);
    clearLiveDrawingLayer();
  }

  if (
    activeDrawingPointerId !== null &&
    drawLayer.hasPointerCapture?.(activeDrawingPointerId)
  ) {
    try {
      drawLayer.releasePointerCapture(activeDrawingPointerId);
    } catch (error) {}
  }

  currentStroke = null;
  activeDrawingPointerId = null;
  nextCurvePointIndex = 1;
  if (shouldSave) scheduleDrawingSave();
}

drawLayer.addEventListener("pointerdown", beginDraw, { passive: false });
drawLayer.addEventListener("pointermove", strokeDraw, { passive: false });
window.addEventListener("pointerup", (event) =>
  finishActiveStroke(true, event),
);
window.addEventListener("pointercancel", (event) =>
  finishActiveStroke(true, event),
);
document.getElementById("btn-undo")?.addEventListener("click", () => {
  finishActiveStroke(false);
  if (strokes.length > 0) {
    strokes.pop();
    redrawStaticCanvas();
    clearLiveDrawingLayer();
    scheduleDrawingSave();
  }
});
document
  .getElementById("btn-clear-canvas")
  ?.addEventListener("click", () => window.openModal("clear_canvas"));

// ==============================================================================
// 14. XỬ LÝ CLICK RA NGOÀI VÀ SWIPE TO DISMISS
// ==============================================================================
document.addEventListener("click", (event) => {
  const container = document.getElementById("user-dropdown-container");
  const menu = document.getElementById("profile-dropdown-menu");
  if (container && !container.contains(event.target)) {
    if (menu) menu.classList.remove("show");
    container.classList.remove("open");
  }
  const mobileMenu = document.getElementById("mobile-dropdown");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  if (mobileMenu && mobileMenu.classList.contains("show")) {
    if (
      !mobileMenu.contains(event.target) &&
      hamburgerBtn &&
      !hamburgerBtn.contains(event.target)
    )
      mobileMenu.classList.remove("show");
  }
  // Modal và drawer đã tự xử lý backdrop trên chính phần tử của chúng; không
  // gọi lại ở cấp document để tránh một cú chạm bị xử lý hai lần.
});

window.handleBackdropClick = (e, modalId) => {
  if (
    e.target === e.currentTarget ||
    e.target.classList.contains("modal-overlay")
  ) {
    if (modalId === "notification-modal") window.closeNotificationModal();
    if (modalId === "custom-modal" && !isKickedOut) window.closeModal();
    if (modalId === "profile-modal") window.closeProfileModal();
    if (modalId === "drawer-backdrop") window.toggleMobileSheet();
  }
};

let sheetStartY = 0;
let sheetCurrentY = 0;
let isSheetDragging = false;
let activeDrawer = null;
let activeBackdrop = null;
let drawerHeight = 0;
document.addEventListener(
  "touchstart",
  (e) => {
    const handle = e.target.closest("#drawer-handle-zone");
    if (!handle) return;
    const drawer = document.getElementById("right-panel-drawer");
    if (!drawer || !drawer.classList.contains("open")) return;
    isSheetDragging = true;
    sheetStartY = e.touches[0].clientY;
    sheetCurrentY = sheetStartY;
    activeDrawer = drawer;
    activeBackdrop = document.getElementById("drawer-backdrop");
    drawerHeight = activeDrawer.getBoundingClientRect().height;
    activeDrawer.style.transition = "none";
    if (activeBackdrop) activeBackdrop.style.transition = "none";
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!isSheetDragging || !activeDrawer) return;
    sheetCurrentY = e.touches[0].clientY;
    let deltaY = sheetCurrentY - sheetStartY;
    if (deltaY < 0) {
      deltaY = 0;
    }
    activeDrawer.style.transform = `translateY(${deltaY}px)`;
    if (activeBackdrop && deltaY >= 0) {
      let opacityProgress = 1 - deltaY / (drawerHeight * 0.15);
      opacityProgress = Math.max(0, Math.min(1, opacityProgress));
      activeBackdrop.style.opacity = opacityProgress;
    }
    if (e.cancelable && deltaY > 0) e.preventDefault();
  },
  { passive: false },
);

document.addEventListener("touchend", (e) => {
  if (!isSheetDragging || !activeDrawer) return;
  isSheetDragging = false;
  let deltaY = sheetCurrentY - sheetStartY;
  if (deltaY > drawerHeight * 0.35) {
    activeDrawer.style.transition =
      "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.4s";
    if (activeBackdrop) activeBackdrop.style.transition = "opacity 0.3s ease";
    window.toggleMobileSheet();
    setTimeout(() => {
      if (activeDrawer) activeDrawer.style.transform = "";
      if (activeBackdrop) activeBackdrop.style.opacity = "";
    }, 400);
  } else {
    activeDrawer.style.transition =
      "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)";
    if (activeBackdrop) activeBackdrop.style.transition = "opacity 0.4s ease";
    activeDrawer.style.transform = "translateY(0)";
    if (activeBackdrop) activeBackdrop.style.opacity = "1";
    setTimeout(() => {
      if (activeDrawer && activeDrawer.classList.contains("open")) {
        activeDrawer.style.transition = "";
        activeDrawer.style.transform = "";
      }
      if (
        activeBackdrop &&
        document.getElementById("drawer-backdrop").classList.contains("show")
      ) {
        activeBackdrop.style.transition = "";
        activeBackdrop.style.opacity = "";
      }
    }, 400);
  }
  activeDrawer = null;
  activeBackdrop = null;
});

// ==============================================================================
// 👉 BẮT SỰ KIỆN CỨU DỮ LIỆU KHẨN CẤP TRƯỚC KHI F5 / TẮT WEB
// ==============================================================================
window.addEventListener("beforeunload", () => {
  if (
    document.body.classList.contains("is-taking-exam") &&
    !isSubmitted &&
    !isReviewMode
  ) {
    window.saveProgress(true);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (
      document.body.classList.contains("is-taking-exam") &&
      !isSubmitted &&
      !isReviewMode
    ) {
      window.saveProgress(true);
    }
  }
});

window.goHome = () => {
  // Nút Thoát hứa giữ tiến độ: chụp đáp án/nét vẽ trước khi dọn phòng thi.
  if (currentExam && !isSubmitted && !isReviewMode) {
    window.saveProgress(false);
  }
  sessionStorage.removeItem("thpt_in_exam");
  sessionStorage.removeItem("thpt_review_state");
  clearInterval(timerInterval);
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  const panel = document.getElementById("right-panel-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (panel) {
    panel.classList.remove("open");
  }
  if (backdrop) {
    clearTimeout(drawerBackdropHideTimer);
    backdrop.classList.remove("show");
    drawerBackdropHideTimer = setTimeout(() => {
      if (!backdrop.classList.contains("show"))
        backdrop.style.display = "none";
    }, 300);
  }
  window.showHome(true);
};

document.addEventListener("DOMContentLoaded", () => {
  // Chỉ giữ những tab đã có màn hình thật; không tự mở tab đang phát triển.
  const savedTab = sessionStorage.getItem("thpt_current_tab");
  if (!["luyenthi", "tailieu"].includes(savedTab)) {
    sessionStorage.setItem("thpt_current_tab", "luyenthi");
  }
});

// Auto khôi phục Fullscreen khi học sinh click chuột
document.addEventListener("click", () => {
  if (
    document.body.classList.contains("is-taking-exam") &&
    !document.fullscreenElement
  ) {
    if (window.innerWidth > 1024) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    }
  }
});

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==============================================================================
// 1. TỰ ĐỘNG CHÈN CSS (GIAO DIỆN & HIỆU ỨNG MƯỢT MÀ)
// ==============================================================================
const style = document.createElement('style');
style.innerHTML = `

    #profile-screen {
        height: calc(100vh - 60px) !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        padding-bottom: 60px !important;
    }

    .num-slide-up { 
        display: inline-block; 
        animation: popNumber 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
    }
    @keyframes popNumber { 
        0% { transform: scale(0.5); opacity: 0; color: #0284c7; } 
        100% { transform: scale(1); opacity: 1; color: inherit; } 
    }

    .mcq-box, .tf-box, .submit-btn, .btn-play, .btn-more-pro, .zoom-btn, .btn-header {
        transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        will-change: transform;
    }
    .mcq-label:active .mcq-box, .tf-label:active .tf-box {
        transform: scale(0.85) !important;
        transition: transform 0.1s ease-out !important;
    }
    .submit-btn:active, .btn-play:active, .btn-more-pro:active, .zoom-btn:active, .btn-header:active {
        transform: scale(0.92) !important;
        transition: transform 0.1s ease-out !important;
    }
    
    .prof-icon { vertical-align: middle; margin-right: 5px; }
    
    .correct-text { font-weight: 600; color: #0f172a; font-size: 13px; }
    .correct-text .ans-highlight { color: #16a34a; font-weight: 800; }
    .correct-text .exp-text-block { color: #0284c7; font-weight: 600; margin-top: 4px; display: block; }
    
    [data-theme="dark"] .correct-text { color: #f8fafc !important; }
    [data-theme="dark"] .correct-text .ans-highlight { color: #4ade80 !important; }
    [data-theme="dark"] .correct-text .exp-text-block { color: #38bdf8 !important; }

    #exam-workspace.fullscreen-active { 
        position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        height: 100vh !important; width: 100vw !important; z-index: 9999; background: #e2e8f0;
    }
    [data-theme="dark"] #exam-workspace.fullscreen-active { background: #0f172a; }

    /* 👉 Giao diện Đồng hồ thông minh */
    body.is-taking-exam #header-timer-box {
        background: rgba(254, 242, 242, 0.95) !important; border: 1.5px solid #ef4444 !important; padding: 6px 16px !important; backdrop-filter: blur(5px);
        border-radius: 8px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25) !important;
    }
    
    body.is-taking-exam #header-timer-box::before { content: '⏱️'; font-size: 16px; }
    body.is-taking-exam #header-timer-box span:first-child { color: #dc2626 !important; font-size: 12px !important; font-weight: 800 !important; letter-spacing: 0.5px !important; }
    body.is-taking-exam #header-timer-box .time-left { color: #dc2626 !important; font-size: 18px !important; font-weight: 900 !important; font-family: 'Courier New', Courier, monospace !important; }
    
    [data-theme="dark"] body.is-taking-exam #header-timer-box { background: rgba(239, 68, 68, 0.85) !important; border-color: #ef4444 !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25) !important; }
    [data-theme="dark"] body.is-taking-exam #header-timer-box span:first-child, [data-theme="dark"] body.is-taking-exam #header-timer-box .time-left { color: #f87171 !important; }
    body:not(.is-taking-exam) #header-timer-box { display: none !important; }

    @media (min-width: 1025px) {
        body.is-taking-exam #header-timer-box { position: static !important; margin: 0 15px 0 auto !important; transform: none !important; }
    }
    
    @media (max-width: 1024px) {
        body.is-taking-exam #header-timer-box { position: fixed !important; top: 15px !important; right: 15px !important; z-index: 99998 !important; left: auto !important; margin: 0 !important; transform: none !important; }
    }

    /* Mobile Styles */
    @media (max-width: 1024px) {
        #hamburger-btn { display: block !important; }
        #header-user-info { display: none !important; }

        #pdf-render-wrapper {
            position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            height: auto !important; overflow: auto !important; 
            padding: 0 0 30px 0 !important; margin: 0 auto !important; box-sizing: border-box !important;
        }
        #pdf-zoom-container { margin: 0 !important; display: block !important; }
        #pdf-scroll-content { transform-origin: top left !important; }
        .pdf-page-canvas { width: auto !important; max-width: none !important; height: auto !important; margin: 0 0 5px 0 !important; box-shadow: none !important; border-radius: 0 !important; display: block !important; }
        #toolbar-wrapper, #zoom-controls, #static-layer, #draw-layer { display: none !important; }
        
        #mobile-dropdown {
            display: flex !important; visibility: hidden !important; opacity: 0 !important; transform: translateY(-15px) scale(0.98) !important; pointer-events: none !important;
            transition: visibility 0.25s, opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; animation: none !important;
            position: absolute !important; top: 60px !important; left: 0 !important; width: 100% !important; background: #ffffff !important; border-top: 1px solid #e2e8f0 !important; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important; border-radius: 0 0 16px 16px !important; padding: 15px 20px 20px 20px !important; flex-direction: column !important; gap: 15px !important; z-index: 999 !important; box-sizing: border-box !important;
        }
        [data-theme="dark"] #mobile-dropdown { background: #1e293b !important; border-color: #334155 !important; box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important; }
        #mobile-dropdown.show { visibility: visible !important; opacity: 1 !important; transform: translateY(0) scale(1) !important; pointer-events: auto !important; }

        .mobile-fab-answer {
            position: fixed !important; bottom: 25px !important; right: 20px !important; left: auto !important; transform: none !important;
            width: 56px !important; height: 56px !important; border-radius: 50% !important; border: 2px solid rgba(255,255,255,0.2) !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important; z-index: 100005 !important; display: flex !important; align-items: center !important; justify-content: center !important; 
            opacity: 0 !important; visibility: hidden !important; transform: scale(0) !important;
            transition: visibility 0.4s, opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease !important; cursor: pointer; color: white !important; will-change: transform, opacity;
        }
        .mobile-fab-answer.show { visibility: visible !important; opacity: 0.95 !important; transform: scale(1) !important; }
        .mobile-fab-answer:active { transform: scale(0.85) !important; transition: transform 0.1s ease-out !important; }
        
        #right-panel-drawer {
            position: fixed !important; top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important; margin: 0 !important;  
            width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; height: 85vh !important; max-height: 85vh !important;
            background: #ffffff !important; z-index: 100000 !important; transform: translateY(120%); visibility: hidden;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.4s; border-radius: 24px 24px 0 0 !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.2) !important; display: flex !important; flex-direction: column !important; border: none !important;
        }
        [data-theme="dark"] #right-panel-drawer { background: #1e293b !important; box-shadow: 0 -10px 40px rgba(0,0,0,0.6) !important; }
        #right-panel-drawer.open { transform: translateY(0); visibility: visible; }
        
        #drawer-handle-zone {
            width: 100%; height: 45px; flex-shrink: 0; display: flex; justify-content: center; align-items: center; cursor: grab; background: transparent; touch-action: none; z-index: 100001; position: relative;
        }
        #drawer-handle-zone:active { cursor: grabbing; }
        #drawer-handle-zone::after { content: ''; display: block; width: 50px; height: 6px; background: #cbd5e1; border-radius: 10px; }
        [data-theme="dark"] #drawer-handle-zone::after { background: #475569; }
        
        .btn-close-panel { display: none !important; }
        #current-exam-name { display: none !important; }
        #control-header { position: absolute !important; bottom: 15px !important; left: 0; right: 0; background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 20px !important; justify-content: center !important; z-index: 10 !important; }
        #btn-submit-exam { width: 100% !important; padding: 14px !important; font-size: 16px !important; border-radius: 12px !important; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important; display: block !important; }
        
        #sheets-container, #summary-screen {
            flex: 1; overflow-y: auto !important; overflow-x: hidden !important; padding: 20px 20px 80px 20px !important; 
            width: 100% !important; box-sizing: border-box !important; user-select: auto; -webkit-user-select: auto; touch-action: pan-y !important;
        }
        
        #drawer-backdrop {
            position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100dvh !important;
            background: rgba(15, 23, 42, 0.6) !important; backdrop-filter: blur(3px) !important; -webkit-backdrop-filter: blur(3px) !important;
            z-index: 99999 !important; opacity: 0; transition: opacity 0.4s ease; display: none;
        }
        #drawer-backdrop.show { display: block !important; opacity: 1; }
    }
`;
document.head.appendChild(style);

// ==============================================================================
// 2. KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE VÀ DATA ĐỀ THI
// ==============================================================================
const supabaseUrl = 'https://foujvxpzsilshacrpslu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWp2eHB6c2lsc2hhY3Jwc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzYyMzQsImV4cCI6MjEwMjAxMjIzNH0.K8_zJZjKkmU-_WdaXowkM7dLhVBP5GpMRPAsbiiDLb4';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { storageKey: 'thpt_student_auth_token', autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let EXAM_DATABASE = [];

// ==============================================================================
// 3. BIẾN QUẢN LÝ TOÀN CỤC
// ==============================================================================
let currentUser = null; let currentExam = null; let totalTime = 0; let endTime = 0; let timerInterval = null;
let isSubmitted = false; let isReviewMode = false; let pendingAction = null; let userDataCache = { history: {}, activeExam: null, activeState: null };
let isInitialLoad = true; let isKickedOut = false; let originalPdfWidth = 0; let originalPdfHeight = 0;
let currentCategoryFilter = 'all'; let currentCohortFilter = '2k9'; let currentSearchQuery = ''; let isAuthenticating = false;
let realtimeSyncInterval = null; let recentlyInteracted = new Set(); let isExamsMergedWithDB = false;

let currentSessionId = localStorage.getItem('thpt_stu_session_id');
if (!currentSessionId) { currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5); localStorage.setItem('thpt_stu_session_id', currentSessionId); }
function parseJsonArray(val) { if (Array.isArray(val)) return val; if (typeof val === 'string') { try { let parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch(e) {} } return []; }
function parseJsonObj(val) { if (val && typeof val === 'object' && !Array.isArray(val)) return val; if (typeof val === 'string') { try { let parsed = JSON.parse(val); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed; } catch(e) {} } return {}; }

// ==============================================================================
// 4. TIỆN ÍCH GIAO DIỆN CHUNG
// ==============================================================================
window.initDrawerHandle = () => { const drawer = document.getElementById('right-panel-drawer'); if (drawer && !document.getElementById('drawer-handle-zone')) { const handle = document.createElement('div'); handle.id = 'drawer-handle-zone'; drawer.insertBefore(handle, drawer.firstChild); } };
window.updateFabVisibility = () => {
    let fab = document.getElementById('mobile-fab-answer');
    if (!fab) { fab = document.createElement('div'); fab.id = 'mobile-fab-answer'; fab.className = 'mobile-fab-answer'; fab.onclick = (e) => { e.stopPropagation(); window.toggleMobileSheet(); }; document.body.appendChild(fab); }
    fab.style.display = ''; if (window.innerWidth > 1024) { fab.classList.remove('show'); return; }
    const workspace = document.getElementById('exam-workspace'); const isWorkspaceVisible = workspace && (workspace.style.display === 'flex' || workspace.classList.contains('fullscreen-active'));
    if (isWorkspaceVisible) {
        fab.classList.add('show');
        if (isReviewMode || isSubmitted) { fab.style.background = 'linear-gradient(135deg, #10b981, #047857)'; fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`; } 
        else { fab.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)'; fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`; }
    } else { fab.classList.remove('show'); }
};
window.initDrawerHandle(); window.updateFabVisibility();

window.showLoader = (text = "Đang tải...") => { const loaderText = document.getElementById('loader-text'); if (loaderText) loaderText.innerText = text; const loader = document.getElementById('global-loader'); if (loader) { loader.style.display = 'flex'; loader.style.opacity = '1'; } };
window.hideLoader = () => { const loader = document.getElementById('global-loader'); if (!loader || loader.style.display === 'none') return; loader.style.transition = 'opacity 0.3s ease'; loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; loader.style.opacity = '1'; }, 300); };
window.showNotification = (title, message) => { const notifModal = document.getElementById('notification-modal'); if (!notifModal) return; document.getElementById('notif-title').innerText = title || "Thông báo"; document.getElementById('notif-message').innerText = message || ""; notifModal.style.display = 'flex'; requestAnimationFrame(() => notifModal.classList.add('active')); };
window.closeNotificationModal = () => { const notifModal = document.getElementById('notification-modal'); if (!notifModal) return; if (sessionStorage.getItem('thpt_in_exam') === 'true' && !document.fullscreenElement) { requestFullScreen(); } notifModal.classList.remove('active'); setTimeout(() => notifModal.style.display = 'none', 300); };
window.closeModal = () => { if (isKickedOut) return; const modal = document.getElementById('custom-modal'); if (modal) { modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 300); } };
window.closeProfileModal = () => { const profileModal = document.getElementById('profile-modal'); if (profileModal) { profileModal.classList.remove('active'); setTimeout(() => profileModal.style.display = 'none', 300); } };

// ==============================================================================
// 5. THEO DÕI PHIÊN ĐĂNG NHẬP & BẢO MẬT (AUTO-SAVE)
// ==============================================================================
let initialLagTimeout = setTimeout(() => { if (isInitialLoad) { window.hideLoader(); document.getElementById('auth-screen').style.display = 'flex'; document.getElementById('login-form').classList.add('active'); } }, 1500);
const hasLocalSession = localStorage.getItem('thpt_student_auth_token');
if (!hasLocalSession) { clearTimeout(initialLagTimeout); window.hideLoader(); document.getElementById('auth-screen').style.display = 'flex'; document.getElementById('login-form').classList.add('active'); }

supabase.auth.onAuthStateChange(async (event, session) => {
    clearTimeout(initialLagTimeout); 
    if (session) {
        currentUser = session.user;
        if (isAuthenticating) return;
        try {
            let { data, error } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id).maybeSingle(); 
            if (!data) { 
                const fallbackUsername = currentUser.email ? currentUser.email.split('@')[0] : 'user_' + Date.now().toString().slice(-4); 
                const newProfile = { id: currentUser.id, username: fallbackUsername, email: currentUser.email || fallbackUsername + '@thithu.local', history: {}, active_exam: null, active_state: null, session_id: currentSessionId, role: 'student' }; 
                await supabase.from('user_profiles').insert([newProfile]); 
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
                    role: data.role,
                    liked_exams: data.liked_exams || [],
                    bookmarked_exams: data.bookmarked_exams || []
                };
                
                // Đồng bộ Két sắt Tim xuống máy (Chống Ảo ảnh hiển thị)
                localStorage.setItem('thpt_liked_' + currentUser.id, JSON.stringify(userDataCache.liked_exams));
                localStorage.setItem('thpt_bookmarked_' + currentUser.id, JSON.stringify(userDataCache.bookmarked_exams));
                
                // Hồi sinh dữ liệu từ LocalStorage (Cứu nét vẽ & thời gian)
                const localActiveStr = localStorage.getItem('thpt_active_' + currentUser.id);
                if (localActiveStr) {
                    try {
                        const localActive = JSON.parse(localActiveStr);
                        if (localActive.state && localActive.state.endTime > Date.now()) {
                            userDataCache.activeExam = localActive.examId;
                            userDataCache.activeState = localActive.state;
                        } else { 
                            localStorage.removeItem('thpt_active_' + currentUser.id); 
                        }
                    } catch(e) {}
                }

                if (sessionStorage.getItem('just_logged_in') === 'true') { 
                    sessionStorage.removeItem('just_logged_in'); 
                    await supabase.from('user_profiles').update({ session_id: currentSessionId }).eq('id', currentUser.id); 
                    userDataCache.sessionId = currentSessionId; 
                } 
                else if (userDataCache.role !== 'admin' && userDataCache.role !== 'editor') { 
                    if (userDataCache.sessionId && currentSessionId && userDataCache.sessionId !== currentSessionId) { 
                        window.hideLoader(); clearInterval(timerInterval); window.openModal('kickout'); return; 
                    } 
                }
                
                const initialLetter = (userDataCache.username || 'U').charAt(0).toUpperCase(); 
                document.getElementById('user-avatar-initial').innerText = initialLetter; 
                document.getElementById('menu-avatar-initial').innerText = initialLetter; 
                document.getElementById('display-username').innerText = userDataCache.username;
                const mobileUsernameEl = document.getElementById('display-username-mobile'); 
                if (mobileUsernameEl) mobileUsernameEl.innerText = userDataCache.username; 
                document.getElementById('menu-display-username').innerText = userDataCache.username;
                let displayEmail = currentUser.email || 'Chưa cập nhật'; 
                if (displayEmail.includes('@thithu.local')) displayEmail = 'Tài khoản không dùng Gmail'; 
                document.getElementById('menu-display-email').innerText = displayEmail;

               if (isInitialLoad) {
                    isInitialLoad = false; 
                    window.hideLoader(); 
                    document.getElementById('auth-screen').style.display = 'none';
                    
                    // Thu thập tín hiệu từ trang Đáp Án gửi về
                    const urlParams = new URLSearchParams(window.location.search);
                    const action = urlParams.get('action');
                    const urlExamId = urlParams.get('examId');
                    const urlAttempt = urlParams.get('attempt');

                    const rState = JSON.parse(sessionStorage.getItem('thpt_review_state') || 'null');
                    
                    // 👉 ĐÃ FIX: Nhận diện lệnh quay về và khôi phục toàn bộ Bảng điểm + Nét vẽ
                    if (action === 'review' && urlExamId && userDataCache.history[urlExamId]) {
                        window.history.replaceState({}, document.title, window.location.pathname); // Xóa URL thừa đi cho đẹp
                        window.startExam(urlExamId, 'review', parseInt(urlAttempt, 10));
                    }
                    else if (rState && userDataCache.history[rState.id]) { 
                        window.startExam(rState.id, 'review', rState.idx); 
                    }
                    // Tự động lôi cổ học sinh vào lại phòng thi nếu đang làm dở
                    else if (userDataCache.activeExam && userDataCache.activeState && userDataCache.activeState.endTime > Date.now()) { 
                        window.startExam(userDataCache.activeExam, 'continue'); 
                    }
                    else { 
                        const lastView = sessionStorage.getItem('thpt_current_view'); 
                        if (lastView === 'profile') window.showProfilePage(); 
                        else window.showHome(); 
                    }
                }
            } else { await supabase.auth.signOut(); window.hideLoader(); document.getElementById('auth-screen').style.display = 'flex'; document.getElementById('login-form').classList.add('active'); }
        } catch (err) { window.hideLoader(); document.getElementById('auth-screen').style.display = 'flex'; document.getElementById('login-form').classList.add('active'); }
    } else {
        isInitialLoad = true; currentUser = null; window.hideLoader(); document.getElementById('auth-screen').style.display = 'flex'; document.getElementById('login-form').classList.add('active');
        document.getElementById('header-user-info').style.display = 'none'; document.getElementById('hamburger-btn').style.display = 'none';
    }
});

// ==============================================================================
// 6. XỬ LÝ AUTH (LOGIN, REGISTER, QUÊN MẬT KHẨU)
// ==============================================================================
window.formatDOB = (input) => { let v = input.value.replace(/\D/g, ''); if (v.length >= 3 && v.length <= 4) v = v.slice(0, 2) + '/' + v.slice(2); else if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4, 8); input.value = v; };
window.togglePassword = (id, el) => { const i = document.getElementById(id); if (i.type === "password") { i.type = "text"; el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; } else { i.type = "password"; el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`; } };
window.checkEnter = (e, type) => { if (e.key === 'Enter') { if (type === 'login') window.handleLogin(); else if (type === 'register') window.handleRegister(); else if (type === 'forgot') window.handleForgot(); } };

window.toggleAuth = (type) => {
    document.getElementById('login-form').classList.remove('active'); document.getElementById('register-form').classList.remove('active'); document.getElementById('forgot-form').classList.remove('active');
    document.getElementById('login-error').style.display = 'none'; document.getElementById('reg-error').style.display = 'none'; document.getElementById('reg-success').style.display = 'none'; document.getElementById('forgot-error').style.display = 'none';
    if (type === 'login') document.getElementById('login-form').classList.add('active'); else if (type === 'register') document.getElementById('register-form').classList.add('active'); else if (type === 'forgot') document.getElementById('forgot-form').classList.add('active');
};

window.handleForgot = async () => {
    const mail = document.getElementById('forgot-email').value.trim(); const e = document.getElementById('forgot-error'); const btn = document.getElementById('btn-forgot'); e.style.display = 'none';
    if (!mail) { e.innerText = "Vui lòng nhập Gmail của bạn!"; e.style.display = "block"; return; }
    btn.innerText = "ĐANG GỬI LINK..."; btn.style.opacity = "0.7"; btn.disabled = true;
    try { const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin + window.location.pathname.replace('index.html', '') + 'reset.html' }); if (error) throw error; window.showNotification("Thành công!", "Link đã được gửi đến Gmail."); window.toggleAuth('login'); } catch (err) { e.innerText = "Gmail chưa đăng ký hoặc lỗi hệ thống!"; e.style.display = "block"; } finally { btn.innerText = "GỬI LINK ĐẶT LẠI MK"; btn.style.opacity = "1"; btn.disabled = false; }
};

window.handleRegister = async () => {
    const fullName = document.getElementById('reg-fullname').value.trim(), u = document.getElementById('reg-user').value.trim(), email = document.getElementById('reg-email').value.trim(), phone = document.getElementById('reg-phone').value.trim(), dobRaw = document.getElementById('reg-dob').value.trim(), school = document.getElementById('reg-school').value.trim(), p = document.getElementById('reg-pass').value, c = document.getElementById('reg-pass-confirm').value;
    const e = document.getElementById('reg-error'); const s = document.getElementById('reg-success'); e.style.display = 'none'; s.style.display = 'none';
    if (!u || !dobRaw || !p || !c || !fullName) { e.innerText = "Vui lòng điền đầy đủ các thông tin bắt buộc (*)!"; e.style.display = "block"; return; }
    if (fullName.toLowerCase() === u.toLowerCase()) { e.innerText = "Họ và tên không được giống hệt Tên đăng nhập!"; e.style.display = "block"; return; }
    if (dobRaw.length !== 10) { e.innerText = "Ngày sinh phải đúng định dạng (VD: 15/08/2009)!"; e.style.display = "block"; return; }
    const parts = dobRaw.split('/'), day = parseInt(parts[0], 10), month = parseInt(parts[1], 10), year = parseInt(parts[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) { e.innerText = "Ngày sinh không hợp lệ!"; e.style.display = "block"; return; }
    const dbDob = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (p !== c) { e.innerText = "Mật khẩu xác nhận không khớp!"; e.style.display = "block"; return; }

    try {
        isAuthenticating = true; window.showLoader("Đang tạo tài khoản...");
        const { data: existingUser } = await supabase.from('user_profiles').select('id').eq('username', u);
        if (existingUser && existingUser.length > 0) { window.hideLoader(); isAuthenticating = false; e.innerText = "Tên đăng nhập đã có người sử dụng!"; e.style.display = "block"; return; }
        
        currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5); localStorage.setItem('thpt_stu_session_id', currentSessionId);
        let finalEmail = email || (u.toLowerCase() + "@thithu.local");
        const { data: authData, error: authErr } = await supabase.auth.signUp({ email: finalEmail, password: p, options: { data: { full_name: fullName, username: u } } });
        if (authErr) throw authErr; 
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) { window.hideLoader(); isAuthenticating = false; e.innerText = "Gmail này đã được đăng ký!"; e.style.display = "block"; return; }
        if (authData.user) { await supabase.from('user_profiles').insert([{ id: authData.user.id, username: u, email: finalEmail, phone: phone || null, dob: dbDob, school: school || null, history: {}, active_exam: null, active_state: null, session_id: currentSessionId, role: 'student' }]); }
        sessionStorage.setItem('just_logged_in', 'true'); window.hideLoader(); s.innerText = "Đăng ký thành công! Đang tự động đăng nhập..."; s.style.display = "block"; setTimeout(() => { isAuthenticating = false; window.location.reload(); }, 1200);
    } catch(err) { window.hideLoader(); isAuthenticating = false; e.innerText = "Lỗi đăng ký, vui lòng thử lại!"; e.style.display = "block"; }
};

window.handleLogin = async () => {
    const u = document.getElementById('login-user').value.trim(), p = document.getElementById('login-pass').value, e = document.getElementById('login-error'); e.style.display = 'none';
    if (!u || !p) { e.innerText = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!"; e.style.display = "block"; return; }
    try {
        isAuthenticating = true; window.showLoader("Đang đăng nhập...");
        let loginSuccess = false; let finalUserId = null; let guessEmail = u.includes('@') ? u : (u.toLowerCase() + "@thithu.local");
        const { data: auth1, error: err1 } = await supabase.auth.signInWithPassword({ email: guessEmail, password: p });
        if (!err1 && auth1.user) { loginSuccess = true; finalUserId = auth1.user.id; } 
        else if (!u.includes('@')) {
            const { data: userProfile } = await supabase.from('user_profiles').select('email, id').eq('username', u).maybeSingle();
            if (userProfile && userProfile.email) { const { data: auth2, error: err2 } = await supabase.auth.signInWithPassword({ email: userProfile.email, password: p }); if (!err2 && auth2.user) { loginSuccess = true; finalUserId = auth2.user.id; } }
        }
        if (!loginSuccess || !finalUserId) { window.hideLoader(); isAuthenticating = false; e.innerText = "Tài khoản hoặc mật khẩu không chính xác!"; e.style.display = "block"; return; }
        sessionStorage.setItem('just_logged_in', 'true'); currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5); localStorage.setItem('thpt_stu_session_id', currentSessionId);
        await supabase.from('user_profiles').update({ session_id: currentSessionId }).eq('id', finalUserId);
        window.hideLoader(); setTimeout(() => { isAuthenticating = false; window.location.reload(); }, 500);
    } catch(err) { window.hideLoader(); isAuthenticating = false; e.innerText = "Lỗi kết nối mạng, vui lòng thử lại!"; e.style.display = "block"; }
};

window.handleLogout = async () => { 
    window.showLoader("Đang đăng xuất..."); 
    sessionStorage.removeItem('thpt_in_exam');
    sessionStorage.removeItem('thpt_review_state');
    sessionStorage.removeItem('thpt_current_view');
    await supabase.auth.signOut(); 
    location.reload(); 
};

// ==============================================================================
// 7. MENU & ĐIỀU HƯỚNG GIAO DIỆN
// ==============================================================================
const savedTheme = localStorage.getItem('thpt_theme') || 'light';
if (savedTheme === 'dark') document.body.setAttribute('data-theme', 'dark');

function updateThemeUI(theme) {
    const isDark = (theme === 'dark');
    const iconD = document.getElementById('theme-icon-desktop'); const textD = document.getElementById('theme-text-desktop');
    const iconM = document.getElementById('theme-icon-mobile'); const textM = document.getElementById('theme-text-mobile');
    if (iconD) iconD.innerText = isDark ? '☀️' : '🌙'; if (textD) textD.innerText = isDark ? 'Chế độ sáng' : 'Chế độ tối';
    if (iconM) iconM.innerText = isDark ? '☀️' : '🌙'; if (textM) textM.innerText = isDark ? 'Chế độ sáng' : 'Chế độ tối';
}

document.addEventListener('DOMContentLoaded', () => { updateThemeUI(savedTheme); window.initDrawerHandle(); window.updateFabVisibility(); });
window.toggleTheme = () => { const currentTheme = document.body.getAttribute('data-theme'); const newTheme = currentTheme === 'dark' ? 'light' : 'dark'; if (newTheme === 'dark') document.body.setAttribute('data-theme', 'dark'); else document.body.removeAttribute('data-theme'); localStorage.setItem('thpt_theme', newTheme); updateThemeUI(newTheme); };
window.switchTab = (tabId, element) => { document.getElementById('mobile-dropdown').classList.remove('show'); if (tabId === 'luyenthi') { document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active')); document.querySelectorAll('.m-menu-item').forEach(el => el.classList.remove('active')); const desktopBtn = document.querySelector(`.menu-item[onclick*="${tabId}"]`); const mobileBtn = document.querySelector(`.m-menu-item[onclick*="${tabId}"]`); if (desktopBtn) desktopBtn.classList.add('active'); if (mobileBtn) mobileBtn.classList.add('active'); window.showHome(); } else { window.showNotification("Thông báo", "Tính năng đang được đội ngũ kỹ thuật xây dựng và sẽ sớm ra mắt!"); } };
window.handleLogoClick = () => { if (!isSubmitted && !isReviewMode && currentExam) window.openModal('exit'); else window.switchTab('luyenthi'); };
window.toggleUserMenu = (event) => { if (event) event.stopPropagation(); const menu = document.getElementById('profile-dropdown-menu'); const container = document.getElementById('user-dropdown-container'); if (menu) menu.classList.toggle('show'); if (container) container.classList.toggle('open'); };
window.openProfileModal = () => { window.showProfilePage(); };
window.toggleMobileMenu = () => { document.getElementById('mobile-dropdown').classList.toggle('show'); };
window.toggleMobileSheet = (e) => { if (e) e.stopPropagation(); const panel = document.getElementById('right-panel-drawer'); const backdrop = document.getElementById('drawer-backdrop'); if (panel) { panel.style.transition = ''; panel.style.transform = ''; } if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; } if (panel && panel.classList.contains('open')) { panel.classList.remove('open'); if (backdrop) { backdrop.classList.remove('show'); setTimeout(() => { backdrop.style.display = 'none'; }, 300); } } else if (panel) { panel.classList.add('open'); if (backdrop) { backdrop.style.display = 'block'; setTimeout(() => backdrop.classList.add('show'), 10); } } window.updateFabVisibility(); };

// ==============================================================================
// 8. TẢI ĐỀ THI LÊN GIAO DIỆN TRANG CHỦ & TÌM KIẾM
// ==============================================================================
window.handleCohort = (cohort, btnEl) => { currentCohortFilter = cohort; document.querySelectorAll('.cohort-btn').forEach(b => b.classList.remove('active')); btnEl.classList.add('active'); document.getElementById('main-page-title').innerText = `Kho Đề Thi & Ôn Luyện ${cohort.toUpperCase()}`; renderHome(); };
window.handleFilterExam = (category, btnEl) => { currentCategoryFilter = category; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); if (btnEl) btnEl.classList.add('active'); renderHome(); };
window.handleSearchExam = () => { currentSearchQuery = document.getElementById('search-exam-input').value.trim().toLowerCase(); renderHome(); };

window.showHome = (force = false) => {
    if (!force && userDataCache.activeExam && sessionStorage.getItem('thpt_in_exam') === 'true') { window.startExam(userDataCache.activeExam, 'continue'); return; }
    
    sessionStorage.setItem('thpt_current_view', 'home');
    sessionStorage.setItem('thpt_current_tab', 'luyenthi'); // 👉 ĐÃ FIX: Reset bộ nhớ Tab để chống kẹt Popup thông báo
    
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    isReviewMode = false; isSubmitted = false; document.body.classList.remove('is-taking-exam'); document.title = "Trang Chủ - Hệ Thống Thi Thử THPT Quốc Gia"; 
    const headerSelectors = ['header', '.header', '.top-navbar', '#header', '.navbar']; headerSelectors.forEach(selector => { const el = document.querySelector(selector); if (el) { el.style.display = ''; } });
    document.getElementById('exam-workspace').classList.remove('fullscreen-active'); document.getElementById('header-timer-box').style.display = 'none'; document.getElementById('header-user-info').style.display = window.innerWidth <= 1024 ? 'none' : 'flex'; document.getElementById('hamburger-btn').style.display = window.innerWidth <= 1024 ? 'block' : 'none'; document.getElementById('home-screen').style.display = 'block'; document.getElementById('exam-workspace').style.display = 'none';
    const profileScreen = document.getElementById('profile-screen'); if (profileScreen) profileScreen.style.display = 'none';
    document.querySelectorAll('.ad-banner-side').forEach(el => el.style.display = ''); window.updateFabVisibility(); currentExam = null; renderHome();
};

function animateNumberChange(element, newValue) { 
    if (element.innerText == newValue) return; 
    element.classList.remove('num-slide-up'); void element.offsetWidth; element.innerText = newValue; element.classList.add('num-slide-up'); 
}

function startRealtimeSync() {
    if (realtimeSyncInterval) clearInterval(realtimeSyncInterval);
    realtimeSyncInterval = setInterval(async () => {
        if (document.getElementById('home-screen').style.display === 'none') return;
        try {
            const { data } = await supabase.from('exams').select('id, views, likes');
            if (data) {
                data.forEach(ex => {
                    const localEx = EXAM_DATABASE.find(e => e.id === ex.id);
                    if (localEx) { 
                        if (!recentlyInteracted.has(`view_${ex.id}`) && localEx.views !== ex.views) { localEx.views = ex.views || 0; const viewEl = document.getElementById(`view-count-${ex.id}`); if (viewEl) animateNumberChange(viewEl, localEx.views); }
                        if (!recentlyInteracted.has(`like_${ex.id}`) && localEx.likes !== ex.likes) { localEx.likes = ex.likes || 0; const likeEl = document.getElementById(`like-val-${ex.id}`); if (likeEl) animateNumberChange(likeEl, localEx.likes); }
                    }
                });
            }
        } catch (e) { }
    }, 5000);
}

window.renderHome = async () => {
    const listEl = document.getElementById('exam-list'); if (!listEl) return;
    if (!isExamsMergedWithDB) {
        isExamsMergedWithDB = true; 
        try {
            const { data: dbExams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
            if (!error && dbExams) {
                dbExams.forEach(dbEx => {
                    const local = EXAM_DATABASE.find(e => e.id === dbEx.id);
                    if (local) { local.views = dbEx.views; local.likes = dbEx.likes; local.answers = dbEx.answers || local.keys; } 
                    else { EXAM_DATABASE.unshift({ id: dbEx.id, title: dbEx.title, category: dbEx.category || 'practise', cohort: dbEx.cohort || '2k9', pdfUrl: dbEx.pdf_url, answers: dbEx.answers || {}, timeMinutes: 90, views: dbEx.views || 0, likes: dbEx.likes || 0 }); }
                });
            }
            startRealtimeSync(); 
        } catch (err) { }
    }

    const uid = currentUser ? currentUser.id : 'guest';
    let bookmarkedExams = JSON.parse(localStorage.getItem('thpt_bookmarked_' + uid) || '[]'); 
    let likedExams = JSON.parse(localStorage.getItem('thpt_liked_' + uid) || '[]');

    const filteredExams = EXAM_DATABASE.filter(ex => {
        const isBookmarked = bookmarkedExams.includes(ex.id); const matchesCohort = (ex.cohort === currentCohortFilter); const matchesSearch = ex.title.toLowerCase().includes(currentSearchQuery);
        if (currentCategoryFilter === 'bookmarked') return isBookmarked && matchesCohort && matchesSearch;
        const matchesCat = (currentCategoryFilter === 'all' || ex.category === currentCategoryFilter); return matchesCohort && matchesCat && matchesSearch;
    });

    if (filteredExams.length === 0) { 
        if (currentCategoryFilter === 'bookmarked') listEl.innerHTML = `<div class="empty-state">Bạn chưa lưu đề thi nào.</div>`; 
        else listEl.innerHTML = `<div class="empty-state">Chưa có đề thi nào. Hệ thống đang cập nhật thêm...</div>`; return; 
    }

    listEl.innerHTML = '';
    filteredExams.forEach(ex => {
        let historyData = userDataCache.history[ex.id] || []; let hasDoneExam = historyData.length > 0; let badgeHtml = "";
        let playIcon = `<svg class="prof-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        let actionsHtml = `<button class="btn-play primary" onclick="window.startExam('${ex.id}', 'new')">${playIcon} <span style="margin-left:5px;">Làm bài</span></button>`;
        if (hasDoneExam) {
            const lastAttempt = historyData[historyData.length - 1]; badgeHtml = `<div class="exam-status-inline success">Đã làm ${historyData.length} lần • ${lastAttempt.score.toFixed(2)}đ</div>`;
            actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'retake')">Làm lại</button> <button class="btn-play secondary" onclick="window.showHistory('${ex.id}')">Lịch sử</button>`;
        } else if (userDataCache.activeExam === ex.id) {
            badgeHtml = `<div class="exam-status-inline warning">Đang làm dở...</div>`; actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'continue')">Tiếp tục</button>`;
        }
        
        let catLabel = ex.category === 'so' ? 'Sở GD&ĐT' : ex.category === 'chuyen' ? 'Trường Chuyên' : 'Luyện tập'; let year = ex.cohort === '2k8' ? '2026' : '2027'; 
        let isLiked = likedExams.includes(ex.id); let isBookmarked = bookmarkedExams.includes(ex.id); let totalViews = ex.views || 0; let totalLikes = ex.likes || 0;
        
        let eyeSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        let heartSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${isLiked ? '#ef4444' : 'none'}" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        let bookmarkSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

        listEl.innerHTML += `
            <div class="exam-card-pro no-cover">
                <div class="exam-info-box">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div class="exam-meta-pro" style="margin-bottom: 0;">${catLabel} • Khóa ${year}</div>${badgeHtml}
                    </div>
                    <h3 class="exam-title-pro">${ex.title}</h3>
                    
                    <div class="exam-stats-pro notranslate" translate="no" style="display: flex; align-items: center; gap: 20px; font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 6px;"> ${eyeSvg} <span style="display: inline-flex; align-items: center; gap: 4px;"><span id="view-count-${ex.id}">${totalViews}</span> lượt</span> </div>
                        <div id="like-btn-wrap-${ex.id}" style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${isLiked ? '#ef4444' : 'inherit'}; user-select: none;" onclick="window.toggleLike('${ex.id}', this)" class="like-btn-hover ${isLiked ? 'liked' : ''}"> ${heartSvg} <span id="like-val-${ex.id}">${totalLikes}</span> </div>
                    </div>
                    
                    <div class="exam-actions-pro" style="margin-top: auto;">
                        ${actionsHtml}
                        <button id="bookmark-btn-${ex.id}" class="btn-more-pro ${isBookmarked ? 'active' : ''}" style="display:flex; align-items:center; justify-content:center;" onclick="window.toggleBookmark('${ex.id}', this)">${bookmarkSvg}</button>
                    </div>
                </div>
            </div>
        `;
    });
};

window.toggleBookmark = (examId, btn) => {
    const uid = currentUser ? currentUser.id : 'guest';
    let bookmarkedExams = JSON.parse(localStorage.getItem('thpt_bookmarked_' + uid) || '[]'); 
    let isBookmarked = bookmarkedExams.includes(examId);
    
    if (isBookmarked) { 
        bookmarkedExams = bookmarkedExams.filter(id => id !== examId); 
        if(btn) { btn.classList.remove('active'); btn.querySelector('svg').setAttribute('fill', 'none'); } 
    } else { 
        bookmarkedExams.push(examId); 
        if(btn) { btn.classList.add('active'); btn.querySelector('svg').setAttribute('fill', 'currentColor'); } 
    }
    
    localStorage.setItem('thpt_bookmarked_' + uid, JSON.stringify(bookmarkedExams)); 
    if (userDataCache) userDataCache.bookmarked_exams = bookmarkedExams;
    
    if (currentUser) { supabase.from('user_profiles').update({ bookmarked_exams: bookmarkedExams }).eq('id', uid).then(); }
    if (currentCategoryFilter === 'bookmarked') { renderHome(); }
};

window.toggleLike = async (examId, element) => {
    const uid = currentUser ? currentUser.id : 'guest';
    const isAdmin = userDataCache && (userDataCache.role === 'admin' || userDataCache.role === 'editor');
    let historyData = (userDataCache && userDataCache.history) ? (userDataCache.history[examId] || []) : [];
    
    if (!isAdmin && historyData.length === 0) { 
        window.showNotification("Chưa thể thả tim", "Bạn phải hoàn thành bài thi này ít nhất 1 lần mới có thể thả tim nhé!"); 
        return; 
    }
    
    recentlyInteracted.add(`like_${examId}`); setTimeout(() => { recentlyInteracted.delete(`like_${examId}`); }, 8000);
    
    let likedExams = JSON.parse(localStorage.getItem('thpt_liked_' + uid) || '[]'); 
    let isLiked = likedExams.includes(examId); let delta = 0;
    
    if (element) { element.classList.add('animating'); setTimeout(() => { element.classList.remove('animating'); }, 400); }
    
    if (isLiked) { 
        likedExams = likedExams.filter(id => id !== examId); delta = -1; 
        element.classList.remove('liked'); element.style.color = 'inherit'; element.querySelector('svg').setAttribute('fill', 'none'); 
    } else { 
        likedExams.push(examId); delta = 1; 
        element.classList.add('liked'); element.style.color = '#ef4444'; element.querySelector('svg').setAttribute('fill', '#ef4444'); 
    }
    
    localStorage.setItem('thpt_liked_' + uid, JSON.stringify(likedExams));
    if (userDataCache) userDataCache.liked_exams = likedExams;
    
    const ex = EXAM_DATABASE.find(e => e.id === examId);
    if (ex) { ex.likes = (ex.likes || 0) + delta; if (ex.likes < 0) ex.likes = 0; const valEl = document.getElementById(`like-val-${examId}`); if (valEl) { animateNumberChange(valEl, ex.likes); } }
    
    try { 
        if (currentUser) { await supabase.from('user_profiles').update({ liked_exams: likedExams }).eq('id', uid); } 
        await supabase.rpc('increment_like', { exam_id_param: examId, delta: delta }); 
    } catch (err) { }
};

// ==============================================================================
// 9. QUẢN LÝ THÔNG TIN CÁ NHÂN (PROFILE & OTP EMAIL)
// ==============================================================================
window.showProfilePage = () => {
    if (!currentUser || !userDataCache) return window.showNotification("Lỗi", "Vui lòng đăng nhập để xem thông tin!");
    sessionStorage.setItem('thpt_current_view', 'profile');
    const homeScreen = document.getElementById('home-screen'); if (homeScreen) homeScreen.style.display = 'none';
    document.getElementById('exam-workspace').style.display = 'none';
    const menu = document.getElementById('profile-dropdown-menu'); if (menu) menu.classList.remove('show');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active')); document.querySelectorAll('.m-menu-item').forEach(el => el.classList.remove('active'));
    const profileScreen = document.getElementById('profile-screen'); if (profileScreen) profileScreen.style.display = 'block';

    const userFullName = userDataCache.full_name || (currentUser.user_metadata && currentUser.user_metadata.full_name) || userDataCache.username;
    const profAvatar = document.getElementById('prof-page-avatar');
    if (userDataCache.avatar_url) { profAvatar.innerText = ""; profAvatar.style.backgroundImage = `url('${userDataCache.avatar_url}')`; profAvatar.style.backgroundSize = "cover"; profAvatar.style.backgroundPosition = "center"; profAvatar.style.color = "transparent"; } 
    else { let shortName = userFullName; const nameParts = userFullName.trim().split(/\s+/); if (nameParts.length >= 2) shortName = nameParts.slice(-2).join(' '); profAvatar.innerText = (shortName || 'U').charAt(0).toUpperCase(); profAvatar.style.backgroundImage = "none"; profAvatar.style.color = ""; }

    document.getElementById('prof-page-name').innerText = userFullName;
    const fullnameInput = document.getElementById('prof-input-fullname'); if (fullnameInput) fullnameInput.value = (userFullName !== userDataCache.username) ? userFullName : '';
    document.getElementById('prof-input-username').value = userDataCache.username || '';
    let emailValue = 'Chưa liên kết Gmail'; if (currentUser.email && !currentUser.email.includes('@thithu.local')) emailValue = currentUser.email;
    document.getElementById('prof-display-email').value = emailValue;
    document.getElementById('prof-input-phone').value = userDataCache.phone || ''; document.getElementById('prof-input-school').value = userDataCache.school || '';
    
    let dobFormatted = '';
    if (userDataCache.dob) { const parts = userDataCache.dob.split('-'); if (parts.length === 3) dobFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`; else dobFormatted = userDataCache.dob; }
    document.getElementById('prof-input-dob').value = dobFormatted;

    const editableFields = ['prof-input-fullname', 'prof-input-phone', 'prof-input-school', 'prof-input-dob'];
    editableFields.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = true; el.style.backgroundColor = ''; el.style.cursor = 'not-allowed'; el.style.color = ''; } });

    const btnSave = document.querySelector('.btn-save-profile'); if (btnSave) { btnSave.innerText = "Chỉnh sửa thông tin"; btnSave.onclick = window.enableProfileEditMode; btnSave.style.backgroundColor = "#0ea5e9"; }
    const btnCancel = document.getElementById('btn-cancel-profile-edit'); if (btnCancel) btnCancel.style.display = 'none';
    const btnEditEmail = document.getElementById('btn-edit-email-trigger'); if (btnEditEmail) btnEditEmail.style.display = 'none';
    window.cancelEmailEdit(); window.updateFabVisibility();
};

window.enableProfileEditMode = () => {
    const editableFields = ['prof-input-fullname', 'prof-input-phone', 'prof-input-school', 'prof-input-dob'];
    editableFields.forEach(id => { const el = document.getElementById(id); if (el) { el.disabled = false; el.style.backgroundColor = ''; el.style.cursor = 'text'; el.style.color = ''; } });
    const btnSave = document.querySelector('.btn-save-profile'); if (btnSave) { btnSave.innerText = "Lưu thay đổi"; btnSave.onclick = window.saveProfileData; btnSave.style.backgroundColor = "#10b981"; }

    let btnCancel = document.getElementById('btn-cancel-profile-edit');
    if (!btnCancel) { btnCancel = document.createElement('button'); btnCancel.id = 'btn-cancel-profile-edit'; btnCancel.innerText = 'Hủy'; btnCancel.style.padding = '12px 20px'; btnCancel.style.borderRadius = '8px'; btnCancel.style.border = 'none'; btnCancel.style.background = '#e2e8f0'; btnCancel.style.color = '#0f172a'; btnCancel.style.fontWeight = 'bold'; btnCancel.style.cursor = 'pointer'; btnCancel.style.transition = '0.2s'; btnCancel.onclick = window.showProfilePage; if (btnSave && btnSave.parentNode) { btnSave.parentNode.style.display = 'flex'; btnSave.parentNode.style.gap = '15px'; btnSave.parentNode.appendChild(btnCancel); } }
    if (btnCancel) btnCancel.style.display = 'block';
    const btnEditEmail = document.getElementById('btn-edit-email-trigger'); if (btnEditEmail) btnEditEmail.style.display = 'block';
    const fullnameInput = document.getElementById('prof-input-fullname'); if (fullnameInput) fullnameInput.focus();
};

window.saveProfileData = async () => {
    if (!currentUser) return;
    const fullName = document.getElementById('prof-input-fullname').value.trim(); const phone = document.getElementById('prof-input-phone').value.trim(); const school = document.getElementById('prof-input-school').value.trim(); const dobRaw = document.getElementById('prof-input-dob').value.trim();
    if (!fullName) return window.showNotification("Lỗi", "Vui lòng nhập Họ và tên của bạn!");
    if (!phone || phone.length !== 10) return window.showNotification("Lỗi", "Số điện thoại bắt buộc phải có đúng 10 chữ số!");
    if (!phone.startsWith('0')) return window.showNotification("Lỗi", "Số điện thoại không hợp lệ (phải bắt đầu bằng số 0)!");

    let dbDob = null; if (dobRaw) { if (dobRaw.length !== 10) return window.showNotification("Lỗi", "Ngày sinh phải đúng định dạng!"); const parts = dobRaw.split('/'); dbDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; }

    const btn = document.querySelector('.btn-save-profile');
    try {
        btn.innerText = "Đang lưu..."; btn.disabled = true; btn.style.opacity = "0.7"; await supabase.auth.updateUser({ data: { full_name: fullName } });
        let updates = { phone: phone || null, school: school || null, dob: dbDob, full_name: fullName };
        let { error } = await supabase.from('user_profiles').update(updates).eq('id', currentUser.id);
        if (error && error.message.includes('does not exist')) { delete updates.full_name; await supabase.from('user_profiles').update(updates).eq('id', currentUser.id); } else if (error) throw error;
        userDataCache.full_name = fullName; userDataCache.phone = phone; userDataCache.school = school; userDataCache.dob = dbDob; document.getElementById('prof-page-name').innerText = fullName;
        let shortName = fullName; const parts = fullName.trim().split(/\s+/); if (parts.length >= 2) shortName = parts.slice(-2).join(' ');
        document.getElementById('display-username').innerText = shortName; const mobileUsernameEl = document.getElementById('display-username-mobile'); if (mobileUsernameEl) mobileUsernameEl.innerText = shortName; document.getElementById('menu-display-username').innerText = fullName;
        window.showNotification("Thành công", "Đã cập nhật thông tin cá nhân của bạn!"); window.showProfilePage();
    } catch (err) { window.showNotification("Thất bại", "Lỗi mạng hoặc hệ thống, không thể cập nhật."); } finally { btn.disabled = false; btn.style.opacity = "1"; if (btn.innerText === "Đang lưu...") btn.innerText = "Lưu thay đổi"; }
};

window.handleAvatarUpload = async (input) => {
    const file = input.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { window.showNotification("Lỗi", "Vui lòng chọn ảnh dung lượng dưới 2MB!"); input.value = ""; return; }
    const overlay = document.querySelector('.avatar-edit-overlay'); if (overlay) { overlay.innerText = "Đang tải..."; overlay.style.opacity = "1"; }
    try {
        const fileExt = file.name.split('.').pop(); const fileName = `user_${currentUser.id}_${Date.now()}.${fileExt}`; const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true }); if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath); const avatarUrl = publicUrlData.publicUrl;
        const { error: updateError } = await supabase.from('user_profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id); if (updateError) throw updateError;
        userDataCache.avatar_url = avatarUrl; const avatarEls = ['prof-page-avatar', 'user-avatar-initial', 'menu-avatar-initial'];
        avatarEls.forEach(id => { const el = document.getElementById(id); if (el) { el.innerText = ""; el.style.backgroundImage = `url('${avatarUrl}')`; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.style.color = "transparent"; } });
        window.showNotification("Thành công", "Đã cập nhật ảnh đại diện!");
    } catch (error) { window.showNotification("Lỗi", "Tải ảnh thất bại."); } finally { if (overlay) { overlay.innerText = "📷 Thay đổi"; overlay.style.opacity = ""; } input.value = ""; }
};

let resendTimerInterval = null;
window.enableEmailEdit = () => { document.getElementById('email-view-mode').style.display = 'none'; document.getElementById('email-edit-mode').style.display = 'flex'; document.getElementById('email-input-step').style.display = 'flex'; document.getElementById('otp-input-step').style.display = 'none'; document.getElementById('prof-input-email').value = ''; document.getElementById('otp-inline-input').value = ''; document.getElementById('otp-status-msg').style.display = 'none'; clearInterval(resendTimerInterval); };
window.cancelEmailEdit = () => { document.getElementById('email-view-mode').style.display = 'flex'; document.getElementById('email-edit-mode').style.display = 'none'; clearInterval(resendTimerInterval); const btnSend = document.getElementById('btn-send-otp'); if (btnSend) { btnSend.innerText = "Gửi mã"; btnSend.disabled = false; btnSend.style.opacity = '1'; } };

window.requestEmailOTP = async () => {
    const newEmail = document.getElementById('prof-input-email').value.trim(); const statusMsg = document.getElementById('otp-status-msg'); const btnSend = document.getElementById('btn-send-otp');
    if (!newEmail) { statusMsg.innerText = "❌ Vui lòng nhập Gmail!"; statusMsg.style.color = "#ef4444"; statusMsg.style.display = "block"; return; }
    if (currentUser && currentUser.email === newEmail && !newEmail.includes('@thithu.local')) { statusMsg.innerText = "⚠️ Gmail này đang được sử dụng!"; statusMsg.style.color = "#f59e0b"; statusMsg.style.display = "block"; return; }
    statusMsg.innerText = "⏳ Đang gửi mã OTP đến Gmail..."; statusMsg.style.color = "#0ea5e9"; statusMsg.style.display = "block"; btnSend.disabled = true; btnSend.style.opacity = '0.5';
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { statusMsg.innerText = "❌ Gửi thất bại. Kiểm tra lại Gmail!"; statusMsg.style.color = "#ef4444"; btnSend.disabled = false; btnSend.style.opacity = '1'; return; }
    document.getElementById('email-input-step').style.display = 'none'; document.getElementById('otp-input-step').style.display = 'flex'; document.getElementById('pending-email-text').innerText = newEmail; document.getElementById('otp-inline-input').focus(); statusMsg.style.color = "#10b981";
    let timeLeft = 60; clearInterval(resendTimerInterval);
    const updateStatusWithTimer = () => { if (timeLeft <= 0) { clearInterval(resendTimerInterval); statusMsg.innerHTML = `✅ Đã gửi mã! <a href="#" onclick="window.resendEmailOTP()" style="color: #0ea5e9; text-decoration: underline; cursor: pointer;">Gửi lại mã</a>`; } else { statusMsg.innerHTML = `✅ Đã gửi mã! Vui lòng kiểm tra hộp thư. (Gửi lại sau ${timeLeft}s)`; } };
    updateStatusWithTimer(); resendTimerInterval = setInterval(() => { timeLeft--; updateStatusWithTimer(); }, 1000);
};

window.resendEmailOTP = async () => {
    const newEmail = document.getElementById('prof-input-email').value.trim(); const statusMsg = document.getElementById('otp-status-msg'); statusMsg.innerText = "⏳ Đang gửi lại mã..."; statusMsg.style.color = "#0ea5e9";
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { statusMsg.innerText = "❌ Gửi thất bại. Kiểm tra lại Gmail!"; statusMsg.style.color = "#ef4444"; return; }
    let timeLeft = 60; clearInterval(resendTimerInterval);
    const updateStatusWithTimer = () => { if (timeLeft <= 0) { clearInterval(resendTimerInterval); statusMsg.innerHTML = `✅ Đã gửi lại mã! <a href="#" onclick="window.resendEmailOTP()" style="color: #0ea5e9; text-decoration: underline; cursor: pointer;">Gửi lại lần nữa</a>`; } else { statusMsg.innerHTML = `✅ Đã gửi lại mã! (Gửi lại sau ${timeLeft}s)`; } };
    updateStatusWithTimer(); resendTimerInterval = setInterval(() => { timeLeft--; updateStatusWithTimer(); }, 1000);
};

window.verifyEmailOTP = async () => {
    const token = document.getElementById('otp-inline-input').value.trim(); const email = document.getElementById('prof-input-email').value.trim(); const statusMsg = document.getElementById('otp-status-msg');
    if (!token || token.length < 6) { statusMsg.innerText = "❌ Mã OTP phải đủ 6 số!"; statusMsg.style.color = "#ef4444"; statusMsg.style.display = "block"; return; }
    statusMsg.innerText = "⏳ Đang xác nhận..."; statusMsg.style.color = "#0ea5e9"; statusMsg.style.display = "block";
    const { data, error } = await supabase.auth.verifyOtp({ email: email, token: token, type: 'email_change' });
    if (error) { statusMsg.innerText = "❌ Mã xác nhận sai hoặc đã hết hạn!"; statusMsg.style.color = "#ef4444"; return; }
    await supabase.from('user_profiles').update({ email: email }).eq('id', currentUser.id); userDataCache.email = email; currentUser.email = email; document.getElementById('prof-display-email').value = email; 
    statusMsg.innerText = "✅ Hoàn thành!"; statusMsg.style.color = "#10b981"; setTimeout(() => { window.cancelEmailEdit(); statusMsg.style.display = 'none'; }, 1500);
};


// 👉 HÀM LƯU ĐỒNG BỘ 100% (GIỮ NÉT VẼ, THỜI GIAN NGAY KHI CÓ THAY ĐỔI)
window.saveProgress = (onlyLocal = false) => {
    const isValidSession = (userDataCache.role === 'admin' || userDataCache.role === 'editor') || (userDataCache.sessionId === currentSessionId);
    if (!currentUser || !currentExam || isSubmitted || isReviewMode || !isValidSession) return;
    
    const saveEndTime = endTime || (Date.now() + totalTime * 1000);
    
    userDataCache.activeState = { 
        endTime: saveEndTime, 
        answers: getAllCurrentAnswers(), 
        strokes: JSON.parse(JSON.stringify(strokes)) 
    };
    
    localStorage.setItem('thpt_active_' + currentUser.id, JSON.stringify({ 
        examId: currentExam.id, 
        state: userDataCache.activeState 
    }));
    
    if (!onlyLocal) {
        supabase.from('user_profiles')
            .update({ active_exam: currentExam.id, active_state: userDataCache.activeState })
            .eq('id', currentUser.id)
            .then(() => {}); 
    }
};

// ==============================================================================
// 10. PHÒNG THI: TẢI ĐỀ, CHẤM ĐIỂM
// ==============================================================================
async function loadPdfToCanvas(pdfUrl, disableLoader = false) {
    if (!disableLoader) window.showLoader("Đang tải đề thi ra màn hình...");
    const scrollContent = document.getElementById('pdf-scroll-content'); const staticLayer = document.getElementById('static-layer'); const drawLayer = document.getElementById('draw-layer');
    Array.from(scrollContent.children).forEach(child => { if (child.id !== 'draw-layer' && child.id !== 'static-layer') child.remove(); });
    
    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl); const pdf = await loadingTask.promise;
        let totalHeight = 0; let maxWidth = 0;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum); const viewport = page.getViewport({ scale: 1.5 }); const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas'; canvas.width = viewport.width; canvas.height = viewport.height;
            const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            scrollContent.insertBefore(canvas, staticLayer); totalHeight += viewport.height; if (viewport.width > maxWidth) maxWidth = viewport.width;
        }
        originalPdfWidth = maxWidth; originalPdfHeight = totalHeight; staticLayer.width = maxWidth; staticLayer.height = totalHeight; drawLayer.width = maxWidth; drawLayer.height = totalHeight;
        
        if (strokes && strokes.length > 0) redrawStaticCanvas(); 
        
        if (!disableLoader) window.hideLoader();
        let initZ = 1; const wrapper = document.getElementById('pdf-render-wrapper');
        if (window.innerWidth <= 1024) initZ = wrapper.clientWidth / maxWidth; else if (initZ > 1) initZ = 1;
        window.changeZoom(initZ, true); setTool('none');
    } catch (error) { 
        window.showNotification("Lỗi tải đề", "Không thể tải file PDF. Vui lòng kiểm tra lại đường dẫn file!"); if (!disableLoader) window.hideLoader(); 
    }
}

function requestFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err)); else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && sessionStorage.getItem('thpt_in_exam') === 'true') { window.showNotification("Cảnh báo vi phạm", "Bạn vừa thoát khỏi chế độ làm bài toàn màn hình!\nHệ thống yêu cầu làm bài nghiêm túc. Vui lòng bấm tắt thông báo này để quay lại chế độ thi."); }
});

window.startExam = async (eId, mode, attIdx = null) => {
    document.getElementById('right-panel-drawer').classList.remove('open'); document.getElementById('drawer-backdrop').classList.remove('show'); document.getElementById('drawer-backdrop').style.display = 'none';
    try {
        if (EXAM_DATABASE.length === 0) {
            window.showLoader("Đang nạp dữ liệu đề thi...");
            const { data: dbExams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
            if (!error && dbExams) EXAM_DATABASE = dbExams.map(ex => ({ id: ex.id, title: ex.title, category: ex.category || 'practise', cohort: ex.cohort || '2k9', pdfUrl: ex.pdf_url, answers: ex.answers || {}, views: ex.views || 0, likes: ex.likes || 0 }));
        }
    } catch (err) { }

    currentExam = EXAM_DATABASE.find(e => e.id === eId);
    if (!currentExam) { 
        window.showLoader("Đang tải dữ liệu đề thi...");
        try {
            const { data: dbEx, error } = await supabase.from('exams').select('*').eq('id', eId).single();
            if (dbEx) { currentExam = { id: dbEx.id, title: dbEx.title, category: dbEx.category || 'practise', cohort: dbEx.cohort || '2k9', pdfUrl: dbEx.pdf_url, answers: dbEx.answers || {}, views: dbEx.views || 0, likes: dbEx.likes || 0, timeMinutes: 90 }; EXAM_DATABASE.push(currentExam); }
        } catch(e) {}
    }
    if (!currentExam) { window.hideLoader(); window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi này!"); window.showHome(true); return; }

    if (mode === 'review') { const historyData = userDataCache.history[eId] || []; const idx = attIdx !== null ? attIdx : (historyData.length - 1); sessionStorage.setItem('thpt_review_state', JSON.stringify({id: eId, idx: idx})); sessionStorage.removeItem('thpt_in_exam'); } 
    else { sessionStorage.setItem('thpt_in_exam', 'true'); sessionStorage.removeItem('thpt_review_state'); }

    isReviewMode = (mode === 'review'); isSubmitted = isReviewMode;
    document.querySelectorAll('.ad-banner-side').forEach(el => el.style.display = 'none'); const popupAd = document.getElementById('corner-ad'); if (popupAd) popupAd.style.display = 'none';
    const headerSelectors = ['header', '.header', '.top-navbar', '#header', '.navbar']; headerSelectors.forEach(selector => { const el = document.querySelector(selector); if (el) el.style.display = 'none'; });
    
    document.getElementById('exam-workspace').classList.add('fullscreen-active');
    
    if (!isReviewMode) {
        document.body.classList.add('is-taking-exam'); document.title = `Đang làm: ${currentExam.title}`; 
        const timerBox = document.getElementById('header-timer-box');
        if (timerBox) {
            if (window.innerWidth <= 1024) document.body.appendChild(timerBox); 
            else { const controlHeader = document.getElementById('control-header'); const submitBtn = document.getElementById('btn-submit-exam'); if (controlHeader && submitBtn && !controlHeader.contains(timerBox)) controlHeader.insertBefore(timerBox, submitBtn); }
            timerBox.style.display = 'inline-flex';
        }
        if (window.innerWidth > 1024) requestFullScreen();
    } else { document.body.classList.remove('is-taking-exam'); document.title = `Lịch sử: ${currentExam.title}`; }

    if (mode === 'retake' || mode === 'new') { 
        userDataCache.activeState = null; strokes = []; 
    } 
    else if (isReviewMode) { 
        const historyData = userDataCache.history[eId] || []; const idx = attIdx !== null ? attIdx : (historyData.length - 1); const attemptData = historyData[idx] || {}; 
        if (attemptData.strokes && Array.isArray(attemptData.strokes)) strokes = JSON.parse(JSON.stringify(attemptData.strokes)); else strokes = []; 
    } 
    else if (mode === 'continue' && userDataCache.activeState) { 
        if (userDataCache.activeState.strokes && Array.isArray(userDataCache.activeState.strokes)) strokes = JSON.parse(JSON.stringify(userDataCache.activeState.strokes)); else strokes = []; 
    }
    
    // 👉 ĐÃ FIX: Tính toán thời gian khôi phục CHUẨN XÁC TRƯỚC KHI LƯU VÀ TẢI ĐỀ
    if (!isReviewMode) {
        if (mode === 'continue' && userDataCache.activeState) { 
            if (userDataCache.activeState.endTime) {
                endTime = userDataCache.activeState.endTime;
                totalTime = Math.floor((endTime - Date.now()) / 1000);
                if (totalTime <= 0) totalTime = 1; 
            } else {
                totalTime = userDataCache.activeState.timeLeft || ((currentExam.timeMinutes || 90) * 60);
                endTime = Date.now() + totalTime * 1000;
            }
        } else {
            totalTime = (currentExam.timeMinutes || 90) * 60;
            endTime = Date.now() + totalTime * 1000;
        }

        // Lưu vào ổ cứng để khóa vị trí ngay lập tức
        userDataCache.activeExam = eId; 
        window.saveProgress(true); 
        
        // Đẩy ngầm lên mạng
        if (currentUser) {
            supabase.from('user_profiles').update({ active_exam: eId }).eq('id', currentUser.id).then();
        }
    }
    
    document.getElementById('home-screen').style.display = 'none'; document.getElementById('exam-workspace').style.display = 'flex'; document.getElementById('header-user-info').style.display = 'none'; document.getElementById('hamburger-btn').style.display = 'none';
    const examNameTitle = document.getElementById('current-exam-name'); if (examNameTitle) examNameTitle.style.display = 'none';
    const btnExit = document.getElementById('btn-exit-exam'); if (btnExit) btnExit.style.display = 'none';
    window.hideLoader(); 

    if (isReviewMode) {
        document.getElementById('summary-screen').style.display = 'block'; document.getElementById('sheets-container').style.display = 'none'; document.getElementById('control-header').style.display = 'none';
        const historyData = userDataCache.history[eId] || []; const idx = attIdx !== null ? attIdx : (historyData.length - 1);
        if (historyData[idx]) { fillAnswers(historyData[idx].answers); runGradingLogic(historyData[idx].answers, idx + 1); }
        const toolbar = document.getElementById('toolbar-wrapper'); if (toolbar) toolbar.style.display = 'none';
        const drawLayer = document.getElementById('draw-layer'); if (drawLayer) drawLayer.style.pointerEvents = 'none';
        document.getElementById('zoom-controls').style.display = 'flex';
        const panel = document.getElementById('right-panel-drawer'); const backdrop = document.getElementById('drawer-backdrop');
        if (panel) panel.classList.add('open'); if (backdrop) { backdrop.style.display = 'block'; backdrop.classList.add('show'); }
        window.updateFabVisibility(); loadPdfToCanvas(currentExam.pdfUrl, true).catch(e => { console.error(e); });
    } else {
        document.getElementById('summary-screen').style.display = 'none'; document.getElementById('sheets-container').style.display = 'block'; document.getElementById('control-header').style.display = 'flex';
        
        window.initAnswerSheets(); 
        
        if (mode === 'continue' && userDataCache.activeState) { fillAnswers(userDataCache.activeState.answers || {}); }

        await loadPdfToCanvas(currentExam.pdfUrl, false); 
        
        document.getElementById('toolbar-wrapper').style.display = 'block'; document.getElementById('zoom-controls').style.display = 'flex'; document.getElementById('toolbar-wrapper').classList.remove('hidden'); document.getElementById('pdf-render-wrapper').classList.remove('toolbar-closed');
        const drawLayer = document.getElementById('draw-layer'); if (drawLayer) drawLayer.style.pointerEvents = 'auto';
        
        startTimer(); window.updateFabVisibility();
    }
};

window.initAnswerSheets = () => {
    const container = document.getElementById('sheets-container'); container.innerHTML = ''; let htmlContent = '';
    htmlContent += `<div class="section-title">PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</div><div class="mcq-grid">`;
    for(let i = 1; i <= 12; i++) {
        htmlContent += `<div class="q-compact-row"><div class="q-compact-num">Câu ${i}</div><div class="mcq-options compact">`;
        ['A', 'B', 'C', 'D'].forEach(option => { htmlContent += `<label class="mcq-label"><input type="radio" name="ans_P1_${i}" value="${option}"><span class="mcq-box round">${option}</span></label>`; });
        htmlContent += `</div><div class="result-feedback" id="feedback_P1_${i}"></div></div>`;
    }
    htmlContent += `</div><div class="section-title">PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI</div><div class="tf-grid-compact">`;
    for(let i = 1; i <= 4; i++) {
        htmlContent += `<div class="q-compact-row tf-block"><div class="q-compact-num" style="width:100%; margin-bottom:5px;">Câu ${i}</div><div class="tf-items">`;
        ['a', 'b', 'c', 'd'].forEach(subQ => { htmlContent += `<div class="tf-item-row"><span class="tf-item-label">${subQ})</span><div><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="T"><span class="tf-box small true-box">Đ</span></label><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="F"><span class="tf-box small false-box">S</span></label></div></div>`; });
        htmlContent += `</div><div class="result-feedback" id="feedback_P2_${i}"></div></div>`;
    }
    htmlContent += `</div><div class="section-title">PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</div><div class="short-grid">`;
    for(let i = 1; i <= 6; i++) { htmlContent += `<div class="q-compact-row short-block"><div class="q-compact-num">Câu ${i}</div><input type="text" id="ans_P3_${i}" class="short-answer-input compact" placeholder="Nhập Đ.Án" autocomplete="off"><div class="result-feedback" id="feedback_P3_${i}"></div></div>`; }
    htmlContent += `</div>`; container.innerHTML = htmlContent;
};

window.viewDetailedAnswers = () => {
    if (!currentExam) { window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi hiện tại!"); return; }
    let attemptIdx = 0; const reviewStateStr = sessionStorage.getItem('thpt_review_state');
    if (reviewStateStr) { const reviewState = JSON.parse(reviewStateStr); attemptIdx = reviewState.idx; } else { const historyData = userDataCache.history[currentExam.id] || []; attemptIdx = historyData.length > 0 ? (historyData.length - 1) : 0; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); 
    window.location.href = `solution.html?examId=${currentExam.id}&attempt=${attemptIdx}`;
};

window.backToSummary = () => { document.getElementById('sheets-container').style.display = 'none'; document.getElementById('btn-back-summary').style.display = 'none'; document.getElementById('summary-screen').style.display = 'block'; };

function getAllCurrentAnswers() { const ans = {}; document.querySelectorAll('input[type="radio"]:checked').forEach(el => { ans[el.name] = el.value; }); document.querySelectorAll('input[type="text"]').forEach(el => { if (el.value.trim() !== '') ans[el.id] = el.value.trim(); }); return ans; }
function fillAnswers(ans) { for (const key in ans) { const radio = document.querySelector(`input[name="${key}"][value="${ans[key]}"]`); const text = document.getElementById(key); if (radio) radio.checked = true; if (text) text.value = ans[key]; } }
function updateTimerDisplay() { let m = Math.floor(totalTime / 60).toString().padStart(2, '0'); let s = (totalTime % 60).toString().padStart(2, '0'); const timerEl = document.getElementById('global-timer'); if (timerEl) timerEl.innerText = `${m}:${s}`; }

function startTimer() {
    clearInterval(timerInterval); 
    
    // Vì endTime đã được chốt từ lúc vào thi (startExam), ta chỉ việc chạy tiếp
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        let remaining = Math.floor((endTime - Date.now()) / 1000);
        if (remaining <= 0) { 
            clearInterval(timerInterval); totalTime = 0; updateTimerDisplay(); 
            window.showNotification("Hết giờ!", "Đã hết thời gian làm bài! Hệ thống tự động thu bài và chấm điểm."); 
            window.submitAndGrade(); 
            return; 
        }
        totalTime = remaining; updateTimerDisplay();
        if (remaining % 5 === 0) window.saveProgress(false); 
    }, 1000);
}

window.submitAndGrade = async () => {
    if (currentUser) localStorage.removeItem('thpt_active_' + currentUser.id);
    
    sessionStorage.removeItem('thpt_in_exam'); clearInterval(timerInterval); isSubmitted = true; isReviewMode = true; setTool('none'); 
    document.body.classList.remove('is-taking-exam'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); 
    
    const toolbar = document.getElementById('toolbar-wrapper'); if (toolbar) toolbar.style.display = 'none';
    const drawLayer = document.getElementById('draw-layer'); if (drawLayer) drawLayer.style.pointerEvents = 'none';
    const panel = document.getElementById('right-panel-drawer'); const backdrop = document.getElementById('drawer-backdrop');
    if (panel) panel.classList.add('open'); if (backdrop) { backdrop.style.display = 'block'; setTimeout(() => backdrop.classList.add('show'), 10); }
    window.updateFabVisibility();
    
    const ans = getAllCurrentAnswers(); const score = runGradingLogic(ans); const id = currentExam.id; 
    const d = new Date(); const ds = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    
    try {
        const { data: latestProfile } = await supabase.from('user_profiles').select('history').eq('id', currentUser.id).single();
        let latestHist = latestProfile && latestProfile.history ? parseJsonObj(latestProfile.history) : userDataCache.history;
        if (!latestHist[id]) latestHist[id] = [];
        latestHist[id].push({ score: score, answers: ans, date: ds, strokes: JSON.parse(JSON.stringify(strokes)) });
        await supabase.from('user_profiles').update({ history: latestHist, active_exam: null, active_state: null }).eq('id', currentUser.id);
        userDataCache.history = latestHist; sessionStorage.setItem('thpt_review_state', JSON.stringify({id: id, idx: latestHist[id].length - 1}));
    } catch(e) { console.error(e); }

    userDataCache.activeExam = null; userDataCache.activeState = null;
    recentlyInteracted.add(`view_${id}`); setTimeout(() => { recentlyInteracted.delete(`view_${id}`); }, 8000);
    
    try { 
        const ex = EXAM_DATABASE.find(e => e.id === id); 
        if (ex) { ex.views = (ex.views || 0) + 1; const viewEl = document.getElementById(`view-count-${id}`); if (viewEl) animateNumberChange(viewEl, ex.views); } 
        await supabase.rpc('increment_view', { exam_id_param: id });
    } catch (e) { console.error("Lỗi cập nhật lượt làm:", e); }
};

function runGradingLogic(ans, attempt = null) {
    document.getElementById('control-header').style.display = 'none'; document.getElementById('header-timer-box').style.display = 'none';
    const toolbar = document.getElementById('toolbar-wrapper'); if (toolbar) toolbar.style.display = 'none';
    
    let totalScore = 0; let p1_correct = 0; let p2_score = 0; let p3_correct = 0; const keys = currentExam.answers || currentExam.keys || {}; 
    for (let i = 1; i <= 12; i++) { let correctAns = null; if (keys.P1 && keys.P1[i]) correctAns = typeof keys.P1[i] === 'object' ? keys.P1[i].ans : keys.P1[i]; const isCorrect = ans[`ans_P1_${i}`] === correctAns; if (isCorrect) p1_correct++; } totalScore += p1_correct * 0.25;
    for (let i = 1; i <= 4; i++) { let opts = 0; const kv = (keys.P2 && keys.P2[i]) || { a:'T', b:'F', c:'T', d:'F' }; ['a', 'b', 'c', 'd'].forEach(o => { if (ans[`ans_P2_${i}${o}`] === kv[o]) opts++; }); let pts = opts === 1 ? 0.1 : opts === 2 ? 0.25 : opts === 3 ? 0.5 : opts === 4 ? 1 : 0; p2_score += pts; } totalScore += p2_score;
    for (let i = 1; i <= 6; i++) { let correctAns = null; if (keys.P3 && keys.P3[i]) correctAns = typeof keys.P3[i] === 'object' ? keys.P3[i].ans : keys.P3[i]; const isCorrect = (ans[`ans_P3_${i}`] || '').trim() === String(correctAns || ''); if (isCorrect) p3_correct++; } totalScore += p3_correct * 0.5;
    
    document.querySelectorAll('#sheets-container input').forEach(e => { e.disabled = true; });
    document.getElementById('final-score-text').innerText = totalScore.toFixed(2); document.getElementById('summary-desc').innerText = attempt ? `Lần ${attempt}` : "Kết quả gần nhất";
    document.getElementById('summary-stats').innerHTML = `<div class="stat-row"><span>Phần I (Trắc nghiệm):</span> <strong>${p1_correct}/12 (+${(p1_correct * 0.25).toFixed(2)})</strong></div><div class="stat-row"><span>Phần II (Đúng/Sai):</span> <strong>(+${p2_score.toFixed(2)})</strong></div><div class="stat-row"><span>Phần III (Điền khuyết):</span> <strong>${p3_correct}/6 (+${(p3_correct * 0.5).toFixed(2)})</strong></div>`;
    document.getElementById('sheets-container').style.display = 'none'; document.getElementById('summary-screen').style.display = 'block';
    return totalScore;
}

window.showHistory = (eId) => {
    const historyData = userDataCache.history[eId] || []; const ex = EXAM_DATABASE.find(e => e.id === eId);
    const modal = document.getElementById('custom-modal'); const listContainer = document.getElementById('modal-history-list');
    document.getElementById('modal-title').innerText = `Lịch sử: ${ex.title}`; document.getElementById('modal-message').style.display = 'none'; document.getElementById('modal-action-buttons').style.display = 'none';
    listContainer.style.display = 'block'; listContainer.innerHTML = '';
    for (let i = historyData.length - 1; i >= 0; i--) {
        const a = historyData[i];
        listContainer.innerHTML += `<div class="history-item"><div class="history-info"><span class="h-attempt">Lần ${i + 1}</span><span class="h-date">${a.date}</span></div><div style="display:flex; align-items:center; gap:15px;"><span class="h-score">${a.score.toFixed(2)}</span><button class="btn-review-sm" onclick="window.closeModal(); window.location.href='solution.html?examId=${eId}&attempt=${i}'">Xem</button></div></div>`;
    }
    listContainer.innerHTML += `<button class="btn-cancel" style="width:100%; margin-top:10px;" onclick="window.closeModal()">Đóng</button>`;
    modal.style.display = 'flex'; requestAnimationFrame(() => { modal.classList.add('active'); });
};

// ==============================================================================
// 12. HỆ THỐNG POPUP MODAL VÀ XÓA CANVAS
// ==============================================================================
window.openModal = (action) => {
    const modal = document.getElementById('custom-modal'); const title = document.getElementById('modal-title'); const msg = document.getElementById('modal-message'); 
    const confirmBtn = document.getElementById('modal-confirm-btn'); const cancelBtn = document.querySelector('#custom-modal .btn-cancel');
    document.getElementById('modal-history-list').style.display = 'none'; msg.style.display = 'block'; document.getElementById('modal-action-buttons').style.display = 'flex'; cancelBtn.style.display = 'block';
    
    if (action === 'exit') {
        if(isSubmitted || isReviewMode) { window.goHome(); return; }
        title.innerText = "Thoát"; msg.innerText = "Hệ thống sẽ lưu lại quá trình làm bài. Bạn có chắc chắn muốn thoát?";
        confirmBtn.className = "btn-confirm danger"; confirmBtn.innerText = "Thoát"; pendingAction = window.goHome;
    } else if (action === 'submit') {
        title.innerText = "Nộp bài"; msg.innerText = "Bạn đã chắc chắn hoàn thành và muốn nộp bài?";
        confirmBtn.className = "btn-confirm"; confirmBtn.innerText = "Nộp"; pendingAction = window.submitAndGrade;
    } else if (action === 'clear_canvas') {
        title.innerText = "Xóa Tất Cả"; msg.innerText = "Bạn chắc chắn muốn xóa toàn bộ nét vẽ trên màn hình?";
        confirmBtn.className = "btn-confirm danger"; confirmBtn.innerText = "Xóa sạch"; pendingAction = () => { strokes = []; redrawStaticCanvas(); window.saveProgress(true); };
    } else if (action === 'kickout') {
        isKickedOut = true; title.innerText = "Cảnh báo bảo mật"; msg.innerText = "Tài khoản của bạn vừa được đăng nhập trên một thiết bị hoặc trình duyệt khác! Phiên làm việc này sẽ bị đóng để bảo vệ tài khoản.";
        confirmBtn.className = "btn-confirm danger"; confirmBtn.innerText = "Đăng xuất & Tải lại"; cancelBtn.style.display = 'none'; pendingAction = window.handleLogout;
    }
    modal.style.display = 'flex'; requestAnimationFrame(() => { modal.classList.add('active'); });
};

window.confirmAction = () => { if (pendingAction) pendingAction(); window.closeModal(); };

// ==============================================================================
// 13. ZOOM, VẼ PDF (DRAW LAYER) VÀ TƯƠNG TÁC CHẠM (TOUCH)
// ==============================================================================
let currentZoom = 1;
window.changeZoom = (amount, isAbsolute = false) => {
    if (!originalPdfWidth) return;
    if (isAbsolute) currentZoom = amount; else currentZoom += amount; 
    
    const wrapper = document.getElementById('pdf-render-wrapper');
    let minZoom = 0.2; if (wrapper && window.innerWidth <= 1024) minZoom = wrapper.clientWidth / originalPdfWidth;
    if (currentZoom < minZoom) currentZoom = minZoom; if (currentZoom > 5.0) currentZoom = 5.0;
    
    const scaledWidth = originalPdfWidth * currentZoom; const scaledHeight = originalPdfHeight * currentZoom;
    const scrollContent = document.getElementById('pdf-scroll-content'); if (scrollContent) scrollContent.style.transform = `scale(${currentZoom})`; 
    
    const container = document.getElementById('pdf-zoom-container'); 
    if (wrapper && container) { 
        container.style.width = scaledWidth + 'px'; container.style.height = scaledHeight + 'px'; 
        if (scaledWidth < wrapper.clientWidth) container.style.marginLeft = ((wrapper.clientWidth - scaledWidth) / 2) + 'px'; 
        else container.style.marginLeft = window.innerWidth <= 1024 ? '0px' : '20px'; 
    }
    const zoomText = document.getElementById('zoom-text'); if (zoomText) zoomText.innerText = Math.round(currentZoom * 100) + '%'; 
};

window.addEventListener('resize', () => {
    if (document.getElementById('exam-workspace').style.display === 'flex' && originalPdfWidth) { 
        const wrapper = document.getElementById('pdf-render-wrapper'); let newZ = 1;
        if (window.innerWidth <= 1024) newZ = wrapper.clientWidth / originalPdfWidth; else if (newZ > 1) newZ = 1;
        window.changeZoom(newZ, true); 
    } else if (document.getElementById('home-screen').style.display === 'block') { 
        document.getElementById('hamburger-btn').style.display = window.innerWidth <= 1024 ? 'block' : 'none'; 
        document.getElementById('header-user-info').style.display = window.innerWidth <= 1024 ? 'none' : 'flex'; 
    }
    if (window.innerWidth > 1024) { const mobileMenu = document.getElementById('mobile-dropdown'); if (mobileMenu) mobileMenu.classList.remove('show'); }
    window.updateFabVisibility();
});

document.addEventListener('wheel', function(e) { if (e.ctrlKey || e.metaKey || e.altKey) { e.preventDefault(); if (document.getElementById('exam-workspace').style.display === 'flex') { if (e.deltaY < 0) window.changeZoom(0.05); else window.changeZoom(-0.05); } } }, { passive: false });

const pdfWrapper = document.getElementById('pdf-render-wrapper'); let initDist = 0; let initZoom = 1; let pinchCenter = null;
pdfWrapper.addEventListener('touchstart', (e) => { 
    if (e.touches.length === 2) { 
        initDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY); initZoom = currentZoom; 
        const rect = pdfWrapper.getBoundingClientRect(); pinchCenter = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top }; 
    } 
}, { passive: false });

pdfWrapper.addEventListener('touchmove', (e) => { 
    if (e.touches.length === 2) { 
        e.preventDefault(); const scale = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY) / initDist; let newZoom = initZoom * scale; 
        let minZoom = 0.2; if (window.innerWidth <= 1024) minZoom = pdfWrapper.clientWidth / originalPdfWidth;
        if (newZoom < minZoom) newZoom = minZoom; if (newZoom > 5.0) newZoom = 5.0; 
        const ratio = newZoom / currentZoom; 
        if (ratio !== 1) { const contentX = pdfWrapper.scrollLeft + pinchCenter.x; const contentY = pdfWrapper.scrollTop + pinchCenter.y; window.changeZoom(newZoom, true); pdfWrapper.scrollLeft = contentX * ratio - pinchCenter.x; pdfWrapper.scrollTop = contentY * ratio - pinchCenter.y; } 
    } 
}, { passive: false });

const staticLayer = document.getElementById('static-layer'); const staticCtx = staticLayer.getContext('2d', { desynchronized: true });
const drawLayer = document.getElementById('draw-layer'); const drawCtx = drawLayer.getContext('2d', { desynchronized: true });
let strokes = []; let currentStroke = null; let isDrawing = false; let activeTool = 'none'; let brushColor = '#0f172a'; let brushSize = 3;

function setTool(tool) {
    if (activeTool === tool) { activeTool = 'none'; document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'eraser-active')); drawLayer.style.pointerEvents = 'none'; document.getElementById('pdf-render-wrapper').style.cursor = 'default'; document.getElementById('color-palette').style.opacity = '0.3'; document.getElementById('color-palette').style.pointerEvents = 'none'; return; }
    activeTool = tool; document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'eraser-active'));
    if (tool === 'pan') { const toolPan = document.getElementById('tool-pan'); if (toolPan) toolPan.classList.add('active'); drawLayer.style.pointerEvents = 'none'; document.getElementById('pdf-render-wrapper').style.cursor = 'grab'; document.getElementById('color-palette').style.opacity = '0.3'; document.getElementById('color-palette').style.pointerEvents = 'none'; } 
    else { 
        drawLayer.style.pointerEvents = 'auto'; document.getElementById('color-palette').style.opacity = '1'; document.getElementById('color-palette').style.pointerEvents = 'auto'; 
        if (tool === 'pen') { const toolPen = document.getElementById('tool-pen'); if (toolPen) toolPen.classList.add('active'); brushSize = 3; const sizeInp = document.getElementById('brush-size'); if (sizeInp) sizeInp.value = 3; } 
        else if (tool === 'highlighter') { const toolHighlighter = document.getElementById('tool-highlighter'); if (toolHighlighter) toolHighlighter.classList.add('active'); brushSize = 15; const sizeInp = document.getElementById('brush-size'); if (sizeInp) sizeInp.value = 15; } 
        else if (tool === 'eraser') { const toolEraser = document.getElementById('tool-eraser'); if (toolEraser) toolEraser.classList.add('eraser-active'); brushSize = 25; const sizeInp = document.getElementById('brush-size'); if (sizeInp) sizeInp.value = 25; document.getElementById('color-palette').style.opacity = '0.3'; document.getElementById('color-palette').style.pointerEvents = 'none'; } 
        updateBrushStyle(); 
    }
}

document.getElementById('tool-pen')?.addEventListener('click', () => setTool('pen')); document.getElementById('tool-highlighter')?.addEventListener('click', () => setTool('highlighter')); document.getElementById('tool-eraser')?.addEventListener('click', () => setTool('eraser')); document.getElementById('tool-pan')?.addEventListener('click', () => setTool('pan'));
window.toggleToolbar = () => { document.getElementById('toolbar-wrapper').classList.toggle('hidden'); document.getElementById('pdf-render-wrapper').classList.toggle('toolbar-closed'); };
function updateBrushStyle() { if (activeTool === 'none' || activeTool === 'pan') return; if (activeTool === 'eraser') { const s = Math.max(15, brushSize * 1.5); const svg = btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="white" fill-opacity="0.5" stroke="black" stroke-width="2"/></svg>`); drawLayer.style.cursor = `url('data:image/svg+xml;base64,${svg}') ${s/2} ${s/2}, auto`; } else drawLayer.style.cursor = 'crosshair'; }
document.getElementById('brush-size')?.addEventListener('input', (e) => { brushSize = parseInt(e.target.value); updateBrushStyle(); });
document.querySelectorAll('.color-swatch').forEach(swatch => { swatch.addEventListener('click', () => { if (['eraser','pan','none'].includes(activeTool)) setTool('pen'); document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active')); swatch.classList.add('active'); brushColor = swatch.dataset.color; updateBrushStyle(); }); });

function drawSingleStroke(ctx, stroke) {
    ctx.beginPath(); ctx.lineWidth = stroke.size;
    if (stroke.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; } else if (stroke.tool === 'highlighter') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; } else { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
    ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.color;
    if (stroke.points.length > 0) { if (stroke.points.length < 3) { if (stroke.tool === 'eraser') { ctx.fillRect(stroke.points[0].x - stroke.size/2, stroke.points[0].y - stroke.size/2, stroke.size, stroke.size); } else { ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2); ctx.fill(); } } else { ctx.moveTo(stroke.points[0].x, stroke.points[0].y); for (let i = 1; i < stroke.points.length - 2; i++) { const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2; const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2; ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc); } ctx.quadraticCurveTo(stroke.points[stroke.points.length - 2].x, stroke.points[stroke.points.length - 2].y, stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y); ctx.stroke(); } }
}

function redrawStaticCanvas() { staticCtx.clearRect(0, 0, staticLayer.width, staticLayer.height); strokes.forEach(s => drawSingleStroke(staticCtx, s)); }
function getDrawCoords(e) { const rect = drawLayer.getBoundingClientRect(); return { x: ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / currentZoom, y: ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / currentZoom }; }
function beginDraw(e) { if (isReviewMode || activeTool === 'none' || activeTool === 'pan') return; e.preventDefault(); isDrawing = true; currentStroke = { tool: activeTool, color: brushColor, size: brushSize, points: [getDrawCoords(e)] }; if (activeTool === 'eraser') drawSingleStroke(staticCtx, currentStroke); else drawSingleStroke(drawCtx, currentStroke); }
function strokeDraw(e) { if (!isDrawing || isReviewMode || activeTool === 'none' || activeTool === 'pan') return; e.preventDefault(); currentStroke.points.push(getDrawCoords(e)); if (activeTool === 'eraser') { const p1 = currentStroke.points[currentStroke.points.length - 2]; const p2 = currentStroke.points[currentStroke.points.length - 1]; staticCtx.beginPath(); staticCtx.globalCompositeOperation = 'destination-out'; staticCtx.lineWidth = brushSize; staticCtx.lineCap = 'square'; staticCtx.lineJoin = 'miter'; staticCtx.moveTo(p1.x, p1.y); staticCtx.lineTo(p2.x, p2.y); staticCtx.stroke(); } else { drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height); drawSingleStroke(drawCtx, currentStroke); } }

function endDraw() { 
    if (!isDrawing) return; 
    isDrawing = false; 
    strokes.push(currentStroke); 
    if (activeTool !== 'eraser') { drawSingleStroke(staticCtx, currentStroke); drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height); } 
    currentStroke = null; 
    window.saveProgress(true); 
}

drawLayer.addEventListener('mousedown', beginDraw); drawLayer.addEventListener('mousemove', strokeDraw); window.addEventListener('mouseup', endDraw); 
drawLayer.addEventListener('touchstart', (e) => { if (e.touches.length === 1 && activeTool !== 'none') beginDraw(e); }, { passive: false }); 
drawLayer.addEventListener('touchmove', (e) => { if (e.touches.length === 1 && activeTool !== 'none') strokeDraw(e); }, { passive: false }); window.addEventListener('touchend', endDraw);
document.getElementById('btn-undo')?.addEventListener('click', () => { if (strokes.length > 0) { strokes.pop(); redrawStaticCanvas(); window.saveProgress(true); } }); 
document.getElementById('btn-clear-canvas')?.addEventListener('click', () => window.openModal('clear_canvas'));

// ==============================================================================
// 14. XỬ LÝ CLICK RA NGOÀI VÀ SWIPE TO DISMISS
// ==============================================================================
document.addEventListener('click', (event) => {
    const container = document.getElementById('user-dropdown-container'); const menu = document.getElementById('profile-dropdown-menu');
    if (container && !container.contains(event.target)) { if (menu) menu.classList.remove('show'); container.classList.remove('open'); } 
    const mobileMenu = document.getElementById('mobile-dropdown'); const hamburgerBtn = document.getElementById('hamburger-btn');
    if (mobileMenu && mobileMenu.classList.contains('show')) { if (!mobileMenu.contains(event.target) && hamburgerBtn && !hamburgerBtn.contains(event.target)) mobileMenu.classList.remove('show'); }
    if (event.target.classList.contains('modal-overlay') || event.target.id === 'drawer-backdrop') window.handleBackdropClick(event, event.target.id);
});

window.handleBackdropClick = (e, modalId) => { 
    if (e.target === e.currentTarget || e.target.classList.contains('modal-overlay')) { 
        if (modalId === 'notification-modal') window.closeNotificationModal(); 
        if (modalId === 'custom-modal' && !isKickedOut) window.closeModal(); 
        if (modalId === 'profile-modal') window.closeProfileModal();
        if (modalId === 'drawer-backdrop') window.toggleMobileSheet(); 
    } 
};

let sheetStartY = 0; let sheetCurrentY = 0; let isSheetDragging = false; let activeDrawer = null; let activeBackdrop = null; let drawerHeight = 0;
document.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('#drawer-handle-zone'); if (!handle) return; 
    const drawer = document.getElementById('right-panel-drawer'); if (!drawer || !drawer.classList.contains('open')) return;
    isSheetDragging = true; sheetStartY = e.touches[0].clientY; sheetCurrentY = sheetStartY;
    activeDrawer = drawer; activeBackdrop = document.getElementById('drawer-backdrop'); drawerHeight = activeDrawer.getBoundingClientRect().height;
    activeDrawer.style.transition = 'none'; if (activeBackdrop) activeBackdrop.style.transition = 'none';
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!isSheetDragging || !activeDrawer) return;
    sheetCurrentY = e.touches[0].clientY; let deltaY = sheetCurrentY - sheetStartY;
    if (deltaY < 0) { deltaY = 0; }
    activeDrawer.style.transform = `translateY(${deltaY}px)`;
    if (activeBackdrop && deltaY >= 0) { let opacityProgress = 1 - (deltaY / (drawerHeight * 0.15)); opacityProgress = Math.max(0, Math.min(1, opacityProgress)); activeBackdrop.style.opacity = opacityProgress; }
    if (e.cancelable && deltaY > 0) e.preventDefault(); 
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isSheetDragging || !activeDrawer) return;
    isSheetDragging = false; let deltaY = sheetCurrentY - sheetStartY;
    if (deltaY > drawerHeight * 0.35) {
        activeDrawer.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.4s'; 
        if (activeBackdrop) activeBackdrop.style.transition = 'opacity 0.3s ease';
        window.toggleMobileSheet();
        setTimeout(() => { if (activeDrawer) activeDrawer.style.transform = ''; if (activeBackdrop) activeBackdrop.style.opacity = ''; }, 400);
    } else {
        activeDrawer.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'; 
        if (activeBackdrop) activeBackdrop.style.transition = 'opacity 0.4s ease';
        activeDrawer.style.transform = 'translateY(0)'; if (activeBackdrop) activeBackdrop.style.opacity = '1';
        setTimeout(() => { if (activeDrawer && activeDrawer.classList.contains('open')) { activeDrawer.style.transition = ''; activeDrawer.style.transform = ''; } if (activeBackdrop && document.getElementById('drawer-backdrop').classList.contains('show')) { activeBackdrop.style.transition = ''; activeBackdrop.style.opacity = ''; } }, 400);
    }
    activeDrawer = null; activeBackdrop = null;
});

// ==============================================================================
// 👉 BẮT SỰ KIỆN CỨU DỮ LIỆU KHẨN CẤP TRƯỚC KHI F5 / TẮT WEB
// ==============================================================================
window.addEventListener('beforeunload', () => {
    if (document.body.classList.contains('is-taking-exam') && !isSubmitted && !isReviewMode) {
        window.saveProgress(true);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (document.body.classList.contains('is-taking-exam') && !isSubmitted && !isReviewMode) {
            window.saveProgress(true);
        }
    }
});

window.goHome = () => {
    sessionStorage.removeItem('thpt_in_exam'); sessionStorage.removeItem('thpt_review_state'); clearInterval(timerInterval); 
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    const panel = document.getElementById('right-panel-drawer'); const backdrop = document.getElementById('drawer-backdrop');
    if (panel) { panel.classList.remove('open'); }
    if (backdrop) { backdrop.classList.remove('show'); setTimeout(() => { backdrop.style.display = 'none'; }, 300); }
    window.showHome(true);
};

const originalSwitchTab = window.switchTab;
window.switchTab = (tabId, element) => {
    originalSwitchTab(tabId, element);
    sessionStorage.setItem('thpt_current_tab', tabId);
};

document.addEventListener('DOMContentLoaded', () => {
    const savedTab = sessionStorage.getItem('thpt_current_tab');
    if (savedTab && savedTab !== 'luyenthi') {
        const btn = document.querySelector(`.menu-item[onclick*="${savedTab}"]`);
        if (btn) window.switchTab(savedTab, btn);
    }
});

// Auto khôi phục Fullscreen khi học sinh click chuột
document.addEventListener('click', () => {
    if (document.body.classList.contains('is-taking-exam') && !document.fullscreenElement) {
        if (window.innerWidth > 1024) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) elem.requestFullscreen().catch(()=>{}); 
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); 
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        }
    }
});

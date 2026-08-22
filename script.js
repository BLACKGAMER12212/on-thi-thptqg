import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==============================================================================
// 1. TỰ ĐỘNG CHÈN CSS (HIỆU ỨNG NẢY SỐ, GIAO DIỆN ĐỒNG HỒ & MOBILE ENGINE)
// ==============================================================================
const style = document.createElement('style');
style.innerHTML = `
    .num-slide-up { 
        display: inline-block; 
        animation: slideUpNum 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
    }

    @keyframes slideUpNum { 
        0% { transform: translateY(10px); opacity: 0; color: #0284c7; } 
        100% { transform: translateY(0); opacity: 1; color: inherit; } 
    }
    
    .prof-icon { 
        vertical-align: middle; 
        margin-right: 5px; 
        display: inline-block; 
    }
    
    .correct-text { 
        font-weight: 600; 
        color: #0f172a; 
        font-size: 13px; 
    }

    .correct-text .ans-highlight { 
        color: #16a34a; 
        font-weight: 800; 
    }

    .correct-text .exp-text-block { 
        color: #0284c7; 
        font-weight: 600; 
        margin-top: 4px; 
        display: block; 
    }
    
    [data-theme="dark"] .correct-text { color: #f8fafc !important; }
    [data-theme="dark"] .correct-text .ans-highlight { color: #4ade80 !important; }
    [data-theme="dark"] .correct-text .exp-text-block { color: #38bdf8 !important; }

    #exam-workspace.fullscreen-active { 
        height: 100vh !important; 
        z-index: 9999; 
    }

    /* Giao diện Đồng hồ (Mặc định cho Desktop - Máy tính) */
    body.is-taking-exam #header-timer-box {
        position: relative !important; 
        top: auto !important; 
        left: auto !important; 
        transform: none !important;
        background: #fef2f2 !important; 
        border: 1.5px solid #ef4444 !important; 
        padding: 6px 16px !important;
        border-radius: 8px !important; 
        display: inline-flex !important; 
        align-items: center !important;
        justify-content: center !important; 
        gap: 8px !important; 
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15) !important;
        margin-right: 15px; 
    }

    body.is-taking-exam #header-timer-box::before { 
        content: '⏱️'; 
        font-size: 16px; 
    }

    body.is-taking-exam #header-timer-box span:first-child { 
        color: #dc2626 !important; 
        font-size: 12px !important; 
        font-weight: 800 !important; 
        letter-spacing: 0.5px !important; 
    }

    body.is-taking-exam #header-timer-box .time-left { 
        color: #dc2626 !important; 
        font-size: 18px !important; 
        font-weight: 900 !important; 
        font-family: 'Courier New', Courier, monospace !important; 
    }
    
    [data-theme="dark"] body.is-taking-exam #header-timer-box { 
        background: rgba(239, 68, 68, 0.15) !important; 
        border-color: #ef4444 !important; 
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25) !important; 
    }

    [data-theme="dark"] body.is-taking-exam #header-timer-box span:first-child,
    [data-theme="dark"] body.is-taking-exam #header-timer-box .time-left { 
        color: #f87171 !important; 
    }

    body:not(.is-taking-exam) #header-timer-box { 
        display: none !important; 
    }


    /* ==========================================================
       🚀 TỐI ƯU CỰC ĐỈNH CHO ĐIỆN THOẠI & TABLET (MOBILE UX ENGINE)
       ========================================================== */
    @media (max-width: 1024px) {
        
        #exam-workspace {
            display: block !important; 
            padding: 0 !important;
            width: 100% !important; 
            background: #ffffff !important; 
        }

        [data-theme="dark"] #exam-workspace {
            background: #0f172a !important; 
        }
        
        /* ĐÃ FIX: CHỐNG CẮT ĐỀ VÀ BỎ KHOẢNG TRẮNG DƯ THỪA (100dvh) */
        #pdf-render-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            height: 100dvh !important; 
            overflow-y: auto !important;
            overflow-x: hidden !important; 
            padding: 0 !important;
            margin: 0 auto !important;
            background: #ffffff !important; 
            box-sizing: border-box !important;
        }

        [data-theme="dark"] #pdf-render-wrapper {
            background: #0f172a !important; 
        }

        #pdf-zoom-container {
            width: 100% !important; 
            margin: 0 !important;
            display: block !important; 
        }

        #pdf-scroll-content {
            transform-origin: top left !important; 
        }

        .pdf-page-canvas {
            width: auto !important;
            max-width: none !important;
            height: auto !important; 
            margin: 0 0 5px 0 !important;
            box-shadow: none !important; 
            border-radius: 0 !important;
            display: block !important;
        }

        /* Ẩn thanh vẽ Note trên Mobile để vuốt PDF mượt hơn */
        #toolbar-wrapper, #zoom-controls, #static-layer, #draw-layer {
            display: none !important;
        }

        /* ẨN VĨNH VIỄN CÁI NÚT ĐIỀN ĐÁP ÁN CŨ Ở GÓC TRÁI DƯỚI */
        button[onclick*="toggleMobileSheet"]:not(#mobile-fab-answer),
        .btn-mobile-answer, #btn-open-sheet {
            display: none !important;
        }

        /* 👉 NÚT ĐIỀN ĐÁP ÁN NỔI (FAB) - LUÔN Ở TRÊN CÙNG (100005) */
        .mobile-fab-answer {
            position: fixed !important;
            bottom: 25px !important;
            right: 20px !important;
            left: auto !important;
            transform: none !important;
            
            width: 56px !important;
            height: 56px !important;
            border-radius: 50% !important;
            border: 2px solid rgba(255,255,255,0.2) !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            
            z-index: 100005 !important; /* Đè lên tất cả kể cả bảng đáp án */
            
            display: none; 
            align-items: center !important;
            justify-content: center !important;
            
            opacity: 0.9 !important; 
            transition: opacity 0.3s ease, transform 0.2s ease, background 0.3s ease !important;
            cursor: pointer;
            color: white !important;
        }
        
        .mobile-fab-answer.show {
            display: flex !important;
        }

        .mobile-fab-answer:active, .mobile-fab-answer:hover {
            transform: scale(0.92) !important;
            opacity: 1 !important; 
        }

        /* BẢNG ĐIỀN ĐÁP ÁN TRƯỢT TỪ DƯỚI LÊN (CỬA CUỐN) */
        #right-panel-drawer {
            position: fixed !important;
            top: auto !important;  
            bottom: 0 !important;  
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;  
            
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            
            height: 85vh !important;
            max-height: 85vh !important;
            
            background: #ffffff !important;
            z-index: 100000 !important;
            
            transform: translateY(120%); 
            visibility: hidden;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.4s;
            
            border-radius: 24px 24px 0 0 !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.2) !important;
            display: flex !important;
            flex-direction: column !important;
            border: none !important;
        }

        [data-theme="dark"] #right-panel-drawer {
            background: #1e293b !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.6) !important;
        }

        #right-panel-drawer.open {
            transform: translateY(0); 
            visibility: visible;
        }

        /* VÙNG CHỨA CÁI GẠCH NGANG ĐỂ CẢM ỨNG VUỐT XUỐNG */
        #drawer-handle-zone {
            width: 100%;
            height: 45px;
            flex-shrink: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: grab;
            background: transparent;
            touch-action: none; 
            z-index: 100001;
            position: relative;
        }

        #drawer-handle-zone:active {
            cursor: grabbing;
        }

        #drawer-handle-zone::after {
            content: '';
            display: block;
            width: 50px;
            height: 6px;
            background: #cbd5e1;
            border-radius: 10px;
        }

        [data-theme="dark"] #drawer-handle-zone::after {
            background: #475569;
        }

        #sheets-container, #summary-screen {
            flex: 1;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 20px !important;
            padding-bottom: 100px !important; 
            width: 100% !important;
            box-sizing: border-box !important;
            user-select: auto;
            -webkit-user-select: auto;
            touch-action: pan-y !important;
        }

        /* Lớp màng đen mờ che đề thi */
        #drawer-backdrop {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(15, 23, 42, 0.6) !important;
            backdrop-filter: blur(3px) !important;
            -webkit-backdrop-filter: blur(3px) !important;
            z-index: 99999 !important;
            opacity: 0;
            transition: opacity 0.4s ease;
            display: none;
        }

        #drawer-backdrop.show {
            display: block !important;
            opacity: 1;
        }
        
        #btn-submit-exam {
            position: absolute !important;
            bottom: 20px !important;
            left: 20px !important;
            right: 20px !important;
            width: calc(100% - 40px) !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
            padding: 14px !important;
            border-radius: 12px !important;
            z-index: 10 !important;
        }

        body.is-taking-exam #header-timer-box {
            position: fixed !important;
            top: 15px !important;
            right: 15px !important;
            left: auto !important;
            margin: 0 !important;
            z-index: 99998 !important; 
            background: rgba(254, 242, 242, 0.95) !important;
            backdrop-filter: blur(5px);
        }

        /* SỬA LỖI MENU ĐIỆN THOẠI */
        #mobile-dropdown {
            position: absolute !important;
            top: 60px !important;
            left: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            border-top: 1px solid #e2e8f0 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
            border-radius: 0 0 16px 16px !important;
            padding: 15px 20px 20px 20px !important;
            display: none;
            flex-direction: column !important;
            gap: 15px !important;
            z-index: 999 !important;
            box-sizing: border-box !important;
        }
        
        [data-theme="dark"] #mobile-dropdown {
            background: #1e293b !important;
            border-color: #334155 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
        }

        #mobile-dropdown.show {
            display: flex !important;
            animation: slideDownMenu 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes slideDownMenu {
            from { opacity: 0; transform: translateY(-15px); }
            to { opacity: 1; transform: translateY(0); }
        }
    }
`;
document.head.appendChild(style);


// ==============================================================================
// 2. KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE
// ==============================================================================
const supabaseUrl = 'https://foujvxpzsilshacrpslu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWp2eHB6c2lsc2hhY3Jwc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzYyMzQsImV4cCI6MjEwMjAxMjIzNH0.K8_zJZjKkmU-_WdaXowkM7dLhVBP5GpMRPAsbiiDLb4';
const supabase = createClient(supabaseUrl, supabaseKey);

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


// ==============================================================================
// 3. BIẾN QUẢN LÝ TOÀN CỤC
// ==============================================================================
let EXAM_DATABASE = [];
let currentUser = null;
let currentExam = null;
let totalTime = 0;
let endTime = 0; 
let timerInterval = null;
let isSubmitted = false;
let isReviewMode = false;
let pendingAction = null;
let userDataCache = { history: {}, activeExam: null, activeState: null };
let isInitialLoad = true;
let originalPdfWidth = 0;
let originalPdfHeight = 0;
let currentCategoryFilter = 'all';
let currentCohortFilter = '2k9';
let currentSearchQuery = '';
let isAuthenticating = false;
let realtimeSyncInterval = null;
let recentlyInteracted = new Set(); 

let currentSessionId = localStorage.getItem('thpt_session_id');
if (!currentSessionId) {
    currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5);
    localStorage.setItem('thpt_session_id', currentSessionId);
}


// ==============================================================================
// 4. 👉 TRUNG TÂM KIỂM SOÁT NÚT NỔI (FAB CONTROLLER) THÔNG MINH NHẤT
// ==============================================================================
window.initDrawerHandle = () => {
    const drawer = document.getElementById('right-panel-drawer');
    if (drawer && !document.getElementById('drawer-handle-zone')) {
        const handle = document.createElement('div');
        handle.id = 'drawer-handle-zone';
        // Luôn chèn vạch cảm ứng vuốt lên trên cùng của bảng
        drawer.insertBefore(handle, drawer.firstChild);
    }
};

window.updateFabVisibility = () => {
    let fab = document.getElementById('mobile-fab-answer');
    
    // Nếu nút chưa tồn tại thì tạo mới tự động
    if (!fab) {
        fab = document.createElement('div'); // Dùng thẻ DIV tránh xung đột form
        fab.id = 'mobile-fab-answer';
        fab.className = 'mobile-fab-answer';
        fab.onclick = (e) => { e.stopPropagation(); window.toggleMobileSheet(); };
        document.body.appendChild(fab);
    }
    
    // Xóa sạch các can thiệp inline rác cũ
    fab.style.display = ''; 
    
    // Trên máy tính lớn -> Giấu hẳn
    if (window.innerWidth > 1024) {
        fab.classList.remove('show');
        return;
    }
    
    const workspace = document.getElementById('exam-workspace');
    // Kiểm tra trực tiếp xem màn hình làm bài có đang HIỂN THỊ không
    const isWorkspaceVisible = workspace && (workspace.style.display === 'flex' || workspace.classList.contains('fullscreen-active'));

    // LUẬT MỚI: Cứ hễ đứng trong phòng thi (Workspace hiện) -> LÀ HIỆN NÚT (Bất kể mở bảng hay không)
    if (isWorkspaceVisible) {
        fab.classList.add('show');
        
        // Đổi màu giao diện nút
        if (isReviewMode || isSubmitted) {
            // Xem Điểm -> Màu Xanh Lá 
            fab.style.background = 'linear-gradient(135deg, #10b981, #047857)';
            fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
        } else {
            // Điền Đáp Án -> Màu Xanh Dương
            fab.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)';
            fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
        }
    } else {
        // Về trang chủ hoặc nơi khác -> Giấu nút
        fab.classList.remove('show');
    }
};

// Gọi khởi tạo ngay
window.initDrawerHandle();
window.updateFabVisibility();


// ==============================================================================
// 5. HÀM GIAO DIỆN CHUNG
// ==============================================================================
window.showLoader = (text = "Đang tải...") => {
    const loaderText = document.getElementById('loader-text');
    if (loaderText) {
        loaderText.innerText = text;
    }
    const loader = document.getElementById('global-loader');
    if (loader) { 
        loader.style.display = 'flex'; 
        loader.style.opacity = '1'; 
    }
};

window.hideLoader = () => {
    const loader = document.getElementById('global-loader');
    if (!loader || loader.style.display === 'none') return;
    
    loader.style.transition = 'opacity 0.3s ease'; 
    loader.style.opacity = '0';
    
    setTimeout(() => { 
        loader.style.display = 'none'; 
        loader.style.opacity = '1'; 
    }, 300);
};

window.showNotification = (title, message) => {
    const notifModal = document.getElementById('notification-modal');
    if (!notifModal) return;
    
    document.getElementById('notif-title').innerText = title || "Thông báo";
    document.getElementById('notif-message').innerText = message || "";
    
    notifModal.style.display = 'flex';
    requestAnimationFrame(() => notifModal.classList.add('active'));
};

window.closeNotificationModal = () => {
    const notifModal = document.getElementById('notification-modal');
    if (!notifModal) return;
    
    if (sessionStorage.getItem('thpt_in_exam') === 'true' && !document.fullscreenElement) {
        requestFullScreen();
    }
    
    notifModal.classList.remove('active'); 
    setTimeout(() => notifModal.style.display = 'none', 300);
};

window.closeModal = () => {
    const modal = document.getElementById('custom-modal');
    if (modal) { 
        modal.classList.remove('active'); 
        setTimeout(() => modal.style.display = 'none', 300); 
    }
};

window.closeProfileModal = () => {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) { 
        profileModal.classList.remove('active'); 
        setTimeout(() => profileModal.style.display = 'none', 300); 
    }
};


// ==============================================================================
// 6. THEO DÕI PHIÊN ĐĂNG NHẬP 
// ==============================================================================
let initialLagTimeout = setTimeout(() => {
    if (isInitialLoad) {
        window.hideLoader();
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('login-form').classList.add('active');
    }
}, 1500);

const hasLocalSession = localStorage.getItem('sb-foujvxpzsilshacrpslu-auth-token');
if (!hasLocalSession) {
    clearTimeout(initialLagTimeout);
    window.hideLoader(); 
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('login-form').classList.add('active');
}

supabase.auth.onAuthStateChange(async (event, session) => {
    clearTimeout(initialLagTimeout); 
    
    if (session) {
        currentUser = session.user;
        if (isAuthenticating) return;
        
        try {
            let { data, error } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id).maybeSingle(); 
            
            if (!data) {
                const fallbackUsername = currentUser.email ? currentUser.email.split('@')[0] : 'user_' + Date.now().toString().slice(-4);
                const newProfile = {
                    id: currentUser.id, 
                    username: fallbackUsername, 
                    email: currentUser.email || fallbackUsername + '@thithu.local',
                    history: {}, 
                    active_exam: null, 
                    active_state: null, 
                    session_id: currentSessionId, 
                    role: 'student'
                };
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
                    role: data.role
                };
                
                if (sessionStorage.getItem('just_logged_in') === 'true') {
                    sessionStorage.removeItem('just_logged_in');
                    await supabase.from('user_profiles').update({ session_id: currentSessionId }).eq('id', currentUser.id);
                    userDataCache.sessionId = currentSessionId;
                } else if (userDataCache.role !== 'admin' && userDataCache.role !== 'editor') {
                    if (userDataCache.sessionId && currentSessionId && userDataCache.sessionId !== currentSessionId) {
                        window.hideLoader(); 
                        clearInterval(timerInterval); 
                        window.openModal('kickout'); 
                        return;
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
                if (displayEmail.includes('@thithu.local')) {
                    displayEmail = 'Tài khoản không dùng Gmail';
                }
                document.getElementById('menu-display-email').innerText = displayEmail;

                if (isInitialLoad) {
                    isInitialLoad = false; 
                    window.hideLoader(); 
                    document.getElementById('auth-screen').style.display = 'none';
                    
                    const rState = JSON.parse(sessionStorage.getItem('thpt_review_state') || 'null');
                    if (rState && userDataCache.history[rState.id]) {
                        window.startExam(rState.id, 'review', rState.idx);
                    } else if (userDataCache.activeExam && sessionStorage.getItem('thpt_in_exam') === 'true') {
                        window.startExam(userDataCache.activeExam, 'continue');
                    } else {
                        window.showHome(); 
                    }
                }
            } else {
                await supabase.auth.signOut(); 
                window.hideLoader(); 
                document.getElementById('auth-screen').style.display = 'flex'; 
                document.getElementById('login-form').classList.add('active');
            }
        } catch (err) {
            window.hideLoader(); 
            document.getElementById('auth-screen').style.display = 'flex'; 
            document.getElementById('login-form').classList.add('active');
        }
    } else {
        isInitialLoad = true; 
        currentUser = null; 
        window.hideLoader(); 
        document.getElementById('auth-screen').style.display = 'flex'; 
        document.getElementById('login-form').classList.add('active');
        document.getElementById('header-user-info').style.display = 'none'; 
        document.getElementById('hamburger-btn').style.display = 'none';
    }
});


// ==============================================================================
// 7. ĐĂNG KÝ VÀ ĐĂNG NHẬP 
// ==============================================================================
window.formatDOB = (input) => {
    let v = input.value.replace(/\D/g, ''); 
    if (v.length >= 3 && v.length <= 4) {
        v = v.slice(0, 2) + '/' + v.slice(2);
    } else if (v.length > 4) {
        v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4, 8);
    }
    input.value = v;
};

window.togglePassword = (id, el) => {
    const i = document.getElementById(id);
    if (i.type === "password") { 
        i.type = "text"; 
        el.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; 
    } else { 
        i.type = "password"; 
        el.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`; 
    }
};

window.checkEnter = (e, type) => { 
    if (e.key === 'Enter') { 
        if (type === 'login') window.handleLogin(); 
        else if (type === 'register') window.handleRegister(); 
        else if (type === 'forgot') window.handleForgot(); 
    } 
};

window.toggleAuth = (type) => {
    document.getElementById('login-form').classList.remove('active'); 
    document.getElementById('register-form').classList.remove('active'); 
    document.getElementById('forgot-form').classList.remove('active');
    document.getElementById('login-error').style.display = 'none'; 
    document.getElementById('reg-error').style.display = 'none'; 
    document.getElementById('reg-success').style.display = 'none'; 
    document.getElementById('forgot-error').style.display = 'none';
    
    if (type === 'login') {
        document.getElementById('login-form').classList.add('active'); 
    } else if (type === 'register') {
        document.getElementById('register-form').classList.add('active'); 
    } else if (type === 'forgot') {
        document.getElementById('forgot-form').classList.add('active');
    }
};

window.handleForgot = async () => {
    const mail = document.getElementById('forgot-email').value.trim(); 
    const e = document.getElementById('forgot-error'); 
    const btn = document.getElementById('btn-forgot'); 
    
    e.style.display = 'none';
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
            redirectTo: window.location.origin + window.location.pathname.replace('index.html', '') + 'reset.html' 
        });
        if (error) throw error;
        
        window.showNotification("Thành công!", "Link đã được gửi đến Gmail."); 
        window.toggleAuth('login');
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
    const fullName = document.getElementById('reg-fullname').value.trim();
    const u = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const dobRaw = document.getElementById('reg-dob').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const p = document.getElementById('reg-pass').value;
    const c = document.getElementById('reg-pass-confirm').value;

    const e = document.getElementById('reg-error'); 
    const s = document.getElementById('reg-success'); 
    
    e.style.display = 'none'; 
    s.style.display = 'none';

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
    if (dobRaw.length !== 10) { 
        e.innerText = "Ngày sinh phải đúng định dạng (VD: 15/08/2009)!"; 
        e.style.display = "block"; 
        return; 
    }

    const parts = dobRaw.split('/');
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10), year = parseInt(parts[2], 10);
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) { 
        e.innerText = "Ngày sinh không hợp lệ!"; 
        e.style.display = "block"; 
        return; 
    }
    
    const dbDob = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    if (p !== c) { 
        e.innerText = "Mật khẩu xác nhận không khớp!"; 
        e.style.display = "block"; 
        return; 
    }

    try {
        isAuthenticating = true; 
        window.showLoader("Đang tạo tài khoản...");
        
        const { data: existingUser } = await supabase.from('user_profiles').select('id').eq('username', u);
        
        if (existingUser && existingUser.length > 0) { 
            window.hideLoader(); 
            isAuthenticating = false; 
            e.innerText = "Tên đăng nhập đã có người sử dụng!"; 
            e.style.display = "block"; 
            return; 
        }
        
        currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5); 
        localStorage.setItem('thpt_session_id', currentSessionId);
        
        let finalEmail = email || (u.toLowerCase() + "@thithu.local");
        
        const { data: authData, error: authErr } = await supabase.auth.signUp({ 
            email: finalEmail, 
            password: p, 
            options: { data: { full_name: fullName, username: u } } 
        });
        
        if (authErr) throw authErr; 
        
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) { 
            window.hideLoader(); 
            isAuthenticating = false; 
            e.innerText = "Gmail này đã được đăng ký!"; 
            e.style.display = "block"; 
            return; 
        }
        
        if (authData.user) {
            await supabase.from('user_profiles').insert([{ 
                id: authData.user.id, 
                username: u, 
                email: finalEmail, 
                phone: phone || null, 
                dob: dbDob, 
                school: school || null, 
                history: {}, 
                active_exam: null, 
                active_state: null, 
                session_id: currentSessionId, 
                role: 'student' 
            }]);
        }
        
        sessionStorage.setItem('just_logged_in', 'true');
        
        window.hideLoader(); 
        s.innerText = "Đăng ký thành công! Đang tự động đăng nhập..."; 
        s.style.display = "block"; 
        
        setTimeout(() => { 
            isAuthenticating = false; 
            window.location.reload(); 
        }, 1200);
        
    } catch(err) { 
        window.hideLoader(); 
        isAuthenticating = false; 
        e.innerText = "Lỗi đăng ký, vui lòng thử lại!"; 
        e.style.display = "block"; 
    }
};

window.handleLogin = async () => {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const e = document.getElementById('login-error'); 
    
    e.style.display = 'none';
    
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
        let guessEmail = u.includes('@') ? u : (u.toLowerCase() + "@thithu.local");
        
        const { data: auth1, error: err1 } = await supabase.auth.signInWithPassword({ 
            email: guessEmail, 
            password: p 
        });
        
        if (!err1 && auth1.user) { 
            loginSuccess = true; 
            finalUserId = auth1.user.id;
        } else if (!u.includes('@')) {
            const { data: userProfile } = await supabase.from('user_profiles').select('email, id').eq('username', u).maybeSingle();
            
            if (userProfile && userProfile.email) { 
                const { data: auth2, error: err2 } = await supabase.auth.signInWithPassword({ 
                    email: userProfile.email, 
                    password: p 
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
        
        sessionStorage.setItem('just_logged_in', 'true');
        currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5); 
        localStorage.setItem('thpt_session_id', currentSessionId);
        
        await supabase.from('user_profiles').update({ session_id: currentSessionId }).eq('id', finalUserId);
        
        window.hideLoader(); 
        
        setTimeout(() => { 
            isAuthenticating = false; 
            window.location.reload(); 
        }, 500);
        
    } catch(err) { 
        window.hideLoader(); 
        isAuthenticating = false; 
        e.innerText = "Lỗi kết nối mạng, vui lòng thử lại!"; 
        e.style.display = "block"; 
    }
};

window.handleLogout = async () => { 
    window.showLoader("Đang đăng xuất..."); 
    await supabase.auth.signOut(); 
    location.reload(); 
};


// ==============================================================================
// 8. MENU & ĐIỀU HƯỚNG GIAO DIỆN DARK MODE
// ==============================================================================
const savedTheme = localStorage.getItem('thpt_theme') || 'light';
if (savedTheme === 'dark') document.body.setAttribute('data-theme', 'dark');

function updateThemeUI(theme) {
    const isDark = (theme === 'dark');
    const iconD = document.getElementById('theme-icon-desktop'); 
    const textD = document.getElementById('theme-text-desktop');
    const iconM = document.getElementById('theme-icon-mobile'); 
    const textM = document.getElementById('theme-text-mobile');
    
    if (iconD) iconD.innerText = isDark ? '☀️' : '🌙'; 
    if (textD) textD.innerText = isDark ? 'Chế độ sáng' : 'Chế độ tối';
    if (iconM) iconM.innerText = isDark ? '☀️' : '🌙'; 
    if (textM) textM.innerText = isDark ? 'Chế độ sáng' : 'Chế độ tối';
}

document.addEventListener('DOMContentLoaded', () => { 
    updateThemeUI(savedTheme); 
    window.initDrawerHandle();
    window.updateFabVisibility();
});

window.toggleTheme = () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark'); 
    } else {
        document.body.removeAttribute('data-theme');
    }
    
    localStorage.setItem('thpt_theme', newTheme); 
    updateThemeUI(newTheme);
};

window.switchTab = (tabId, element) => {
    document.getElementById('mobile-dropdown').classList.remove('show');
    
    if (tabId === 'luyenthi') {
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.m-menu-item').forEach(el => el.classList.remove('active'));
        
        const desktopBtn = document.querySelector(`.menu-item[onclick*="${tabId}"]`);
        const mobileBtn = document.querySelector(`.m-menu-item[onclick*="${tabId}"]`);
        
        if (desktopBtn) desktopBtn.classList.add('active'); 
        if (mobileBtn) mobileBtn.classList.add('active');
        
        window.showHome();
    } else { 
        window.showNotification("Thông báo", "Tính năng đang được đội ngũ kỹ thuật xây dựng và sẽ sớm ra mắt!"); 
    }
};

window.handleLogoClick = () => { 
    if (!isSubmitted && !isReviewMode && currentExam) {
        window.openModal('exit'); 
    } else {
        window.switchTab('luyenthi');
    }
};

window.toggleUserMenu = (event) => {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profile-dropdown-menu'); 
    const container = document.getElementById('user-dropdown-container');
    
    if (menu) menu.classList.toggle('show'); 
    if (container) container.classList.toggle('open'); 
};

window.openProfileModal = () => {
    const menu = document.getElementById('profile-dropdown-menu'); 
    const container = document.getElementById('user-dropdown-container');
    
    if (menu) menu.classList.remove('show'); 
    if (container) container.classList.remove('open');
    
    const modal = document.getElementById('profile-modal'); 
    if (!modal) return;
    
    const username = userDataCache.username || 'User'; 
    const initialLetter = username.charAt(0).toUpperCase();
    
    let email = (currentUser && currentUser.email && !currentUser.email.includes('@thithu.local')) ? currentUser.email : (userDataCache.email || 'Chưa cập nhật');
    if (email.includes('@thithu.local')) email = 'Chưa đăng ký Gmail';
    
    let dobFormatted = 'Chưa cập nhật';
    if (userDataCache.dob) { 
        const parts = userDataCache.dob.split('-'); 
        if (parts.length === 3) {
            dobFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`; 
        } else {
            dobFormatted = userDataCache.dob; 
        }
    }
    
    let totalAttempts = 0;
    if (userDataCache.history) { 
        for (const exId in userDataCache.history) { 
            totalAttempts += (userDataCache.history[exId] || []).length; 
        } 
    }
    
    document.getElementById('profile-big-initial').innerText = initialLetter; 
    document.getElementById('profile-modal-username').innerText = username;
    document.getElementById('profile-modal-school').innerText = userDataCache.school || 'Chưa cập nhật trường THPT';
    document.getElementById('profile-modal-email').innerText = email; 
    document.getElementById('profile-modal-phone').innerText = userDataCache.phone || 'Chưa cập nhật';
    document.getElementById('profile-modal-dob').innerText = dobFormatted; 
    document.getElementById('profile-modal-exams-count').innerText = `${totalAttempts} lần`;
    
    modal.style.display = 'flex'; 
    requestAnimationFrame(() => modal.classList.add('active'));
};

window.toggleMobileMenu = () => { 
    document.getElementById('mobile-dropdown').classList.toggle('show'); 
};

// BẬT TẮT BẢNG ĐÁP ÁN
window.toggleMobileSheet = (e) => {
    if (e) e.stopPropagation();
    const panel = document.getElementById('right-panel-drawer'); 
    const backdrop = document.getElementById('drawer-backdrop');

    if (panel) {
        panel.style.transition = '';
        panel.style.transform = '';
    }
    if (backdrop) {
        backdrop.style.transition = '';
        backdrop.style.opacity = '';
    }

    if (panel && panel.classList.contains('open')) { 
        panel.classList.remove('open'); 
        if (backdrop) {
            backdrop.classList.remove('show'); 
            setTimeout(() => { backdrop.style.display = 'none'; }, 300); 
        }
    } else if (panel) { 
        panel.classList.add('open'); 
        if (backdrop) {
            backdrop.style.display = 'block'; 
            setTimeout(() => backdrop.classList.add('show'), 10); 
        }
    }
};


// ==============================================================================
// 9. TẢI ĐỀ THI LÊN GIAO DIỆN TRANG CHỦ & TÌM KIẾM
// ==============================================================================
window.handleCohort = (cohort, btnEl) => { 
    currentCohortFilter = cohort; 
    document.querySelectorAll('.cohort-btn').forEach(b => b.classList.remove('active')); 
    btnEl.classList.add('active'); 
    document.getElementById('main-page-title').innerText = `Kho Đề Thi & Ôn Luyện ${cohort.toUpperCase()}`; 
    renderHome(); 
};

window.handleFilterExam = (category, btnEl) => { 
    currentCategoryFilter = category; 
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); 
    if (btnEl) btnEl.classList.add('active'); 
    renderHome(); 
};

window.handleSearchExam = () => { 
    currentSearchQuery = document.getElementById('search-exam-input').value.trim().toLowerCase(); 
    renderHome(); 
};

window.showHome = (force = false) => {
    if (!force && userDataCache.activeExam && sessionStorage.getItem('thpt_in_exam') === 'true') { 
        window.startExam(userDataCache.activeExam, 'continue'); 
        return; 
    }
    
    if (document.fullscreenElement) { 
        document.exitFullscreen().catch(() => {}); 
    }
    
    isReviewMode = false;
    isSubmitted = false;
    
    document.body.classList.remove('is-taking-exam');
    document.title = "Trang Chủ - Hệ Thống Thi Thử THPT Quốc Gia"; 
    
    const headerSelectors = ['header', '.header', '.top-navbar', '#header', '.navbar'];
    headerSelectors.forEach(selector => { 
        const el = document.querySelector(selector); 
        if (el) { el.style.display = ''; } 
    });
    
    document.getElementById('exam-workspace').classList.remove('fullscreen-active');
    document.getElementById('header-timer-box').style.display = 'none';
    
    document.getElementById('header-user-info').style.display = window.innerWidth <= 767 ? 'none' : 'flex';
    document.getElementById('hamburger-btn').style.display = window.innerWidth <= 767 ? 'block' : 'none';
    
    document.getElementById('home-screen').style.display = 'block'; 
    document.getElementById('exam-workspace').style.display = 'none';
    
    document.querySelectorAll('.ad-banner-side').forEach(el => el.style.display = '');
    
    window.updateFabVisibility();
    
    currentExam = null; 
    renderHome();
};

function animateNumberChange(element, newValue) { 
    element.classList.remove('num-slide-up'); 
    void element.offsetWidth; 
    element.innerText = newValue; 
    element.classList.add('num-slide-up'); 
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
                        if (!recentlyInteracted.has(`view_${ex.id}`) && localEx.views !== ex.views) { 
                            localEx.views = ex.views || 0; 
                            const viewEl = document.getElementById(`view-count-${ex.id}`); 
                            if (viewEl) animateNumberChange(viewEl, localEx.views); 
                        }
                        
                        if (!recentlyInteracted.has(`like_${ex.id}`) && localEx.likes !== ex.likes) { 
                            localEx.likes = ex.likes || 0; 
                            const likeEl = document.getElementById(`like-val-${ex.id}`); 
                            if (likeEl) animateNumberChange(likeEl, localEx.likes); 
                        }
                    }
                });
            }
        } catch (e) { }
    }, 5000);
}

window.renderHome = async () => {
    const listEl = document.getElementById('exam-list'); 
    if (!listEl) return;
    
    if (EXAM_DATABASE.length === 0) {
        try {
            const { data: dbExams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            EXAM_DATABASE = (dbExams || []).map(ex => ({ 
                id: ex.id, 
                title: ex.title, 
                category: ex.category || 'practise', 
                cohort: ex.cohort || '2k9', 
                pdfUrl: ex.pdf_url, 
                answers: ex.answers || {}, 
                views: ex.views || 0, 
                likes: ex.likes || 0 
            }));
            
            startRealtimeSync(); 
        } catch (err) { }
    }

    let bookmarkedExams = JSON.parse(localStorage.getItem('thpt_bookmarked_exams') || '[]'); 
    let likedExams = JSON.parse(localStorage.getItem('thpt_liked_exams') || '[]');
    
    const filteredExams = EXAM_DATABASE.filter(ex => {
        const isBookmarked = bookmarkedExams.includes(ex.id); 
        const matchesCohort = (ex.cohort === currentCohortFilter); 
        const matchesSearch = ex.title.toLowerCase().includes(currentSearchQuery);
        
        if (currentCategoryFilter === 'bookmarked') return isBookmarked && matchesCohort && matchesSearch;
        
        const matchesCat = (currentCategoryFilter === 'all' || ex.category === currentCategoryFilter); 
        return matchesCohort && matchesCat && matchesSearch;
    });

    if (filteredExams.length === 0) { 
        if (currentCategoryFilter === 'bookmarked') { 
            listEl.innerHTML = `<div class="empty-state">Bạn chưa lưu đề thi nào.</div>`; 
        } else { 
            listEl.innerHTML = `<div class="empty-state">Chưa có đề thi nào. Hệ thống đang cập nhật thêm...</div>`; 
        }
        return; 
    }

    listEl.innerHTML = '';
    
    filteredExams.forEach(ex => {
        let historyData = userDataCache.history[ex.id] || []; 
        let hasDoneExam = historyData.length > 0; 
        let badgeHtml = "";
        
        let playIcon = `<svg class="prof-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        let actionsHtml = `<button class="btn-play primary" onclick="window.startExam('${ex.id}', 'new')">${playIcon} Làm bài </button>`;
        
        if (hasDoneExam) {
            const lastAttempt = historyData[historyData.length - 1];
            badgeHtml = `<div class="exam-status-inline success">Đã làm ${historyData.length} lần • ${lastAttempt.score.toFixed(2)}đ</div>`;
            actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'retake')">Làm lại</button> <button class="btn-play secondary" onclick="window.showHistory('${ex.id}')">Lịch sử</button>`;
        } else if (userDataCache.activeExam === ex.id) {
            badgeHtml = `<div class="exam-status-inline warning">Đang làm dở...</div>`;
            actionsHtml = `<button class="btn-play warning" onclick="window.startExam('${ex.id}', 'continue')">Tiếp tục</button>`;
        }
        
        let catLabel = ex.category === 'so' ? 'Sở GD&ĐT' : ex.category === 'chuyen' ? 'Trường Chuyên' : 'Luyện tập'; 
        let year = ex.cohort === '2k8' ? '2026' : '2027'; 
        let isLiked = likedExams.includes(ex.id); 
        let isBookmarked = bookmarkedExams.includes(ex.id); 
        let totalViews = ex.views || 0; 
        let totalLikes = ex.likes || 0;
        
        let eyeSvg = `<svg class="prof-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        let heartSvg = `<svg class="prof-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${isLiked ? '#ef4444' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        let bookmarkSvg = `<svg class="prof-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? 'currentColor' : 'none'}"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

        listEl.innerHTML += `
            <div class="exam-card-pro no-cover">
                <div class="exam-info-box">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div class="exam-meta-pro" style="margin-bottom: 0;">${catLabel} • Khóa ${year}</div>${badgeHtml}
                    </div>
                    <h3 class="exam-title-pro">${ex.title}</h3>
                    <div class="exam-stats-pro">
                        <span> ${eyeSvg} <b id="view-count-${ex.id}">${totalViews}</b> lượt </span>
                        <span id="like-btn-wrap-${ex.id}" style="cursor:pointer; color: ${isLiked ? '#ef4444' : 'inherit'};" onclick="window.toggleLike('${ex.id}', this)" class="like-btn-hover ${isLiked ? 'liked' : ''}">
                            ${heartSvg} <span class="like-num" id="like-val-${ex.id}">${totalLikes}</span>
                        </span>
                    </div>
                    <div class="exam-actions-pro">
                        ${actionsHtml}
                        <button id="bookmark-btn-${ex.id}" class="btn-more-pro ${isBookmarked ? 'active' : ''}" onclick="window.toggleBookmark('${ex.id}', this)">${bookmarkSvg}</button>
                    </div>
                </div>
            </div>
        `;
    });
};

window.toggleBookmark = (examId, btn) => {
    let bookmarkedExams = JSON.parse(localStorage.getItem('thpt_bookmarked_exams') || '[]'); 
    let isBookmarked = bookmarkedExams.includes(examId);
    
    if (isBookmarked) { 
        bookmarkedExams = bookmarkedExams.filter(id => id !== examId); 
        if(btn) { 
            btn.classList.remove('active'); 
            btn.querySelector('svg').setAttribute('fill', 'none'); 
        } 
    } else { 
        bookmarkedExams.push(examId); 
        if(btn) { 
            btn.classList.add('active'); 
            btn.querySelector('svg').setAttribute('fill', 'currentColor'); 
        } 
    }
    
    localStorage.setItem('thpt_bookmarked_exams', JSON.stringify(bookmarkedExams)); 
    
    if (currentCategoryFilter === 'bookmarked') { 
        renderHome(); 
    }
};

window.toggleLike = async (examId, element) => {
    let historyData = userDataCache.history[examId] || [];
    if (historyData.length === 0) { 
        window.showNotification("Chưa thể thả tim", "Bạn phải hoàn thành bài thi này ít nhất 1 lần mới có thể thả tim nhé!"); 
        return; 
    }
    
    recentlyInteracted.add(`like_${examId}`); 
    setTimeout(() => { recentlyInteracted.delete(`like_${examId}`); }, 8000);
    
    let likedExams = JSON.parse(localStorage.getItem('thpt_liked_exams') || '[]'); 
    let isLiked = likedExams.includes(examId); 
    let delta = 0;
    
    if (element) { 
        element.classList.add('animating'); 
        setTimeout(() => { element.classList.remove('animating'); }, 400); 
    }
    
    if (isLiked) { 
        likedExams = likedExams.filter(id => id !== examId); 
        delta = -1; 
        element.classList.remove('liked'); 
        element.style.color = 'inherit'; 
        element.querySelector('svg').setAttribute('fill', 'none'); 
    } else { 
        likedExams.push(examId); 
        delta = 1; 
        element.classList.add('liked'); 
        element.style.color = '#ef4444'; 
        element.querySelector('svg').setAttribute('fill', '#ef4444'); 
    }
    
    localStorage.setItem('thpt_liked_exams', JSON.stringify(likedExams));
    
    const ex = EXAM_DATABASE.find(e => e.id === examId);
    if (ex) { 
        ex.likes = (ex.likes || 0) + delta; 
        if (ex.likes < 0) ex.likes = 0; 
        const valEl = document.getElementById(`like-val-${examId}`); 
        if (valEl) { animateNumberChange(valEl, ex.likes); } 
    }
    
    try { 
        if (currentUser) { 
            await supabase.from('user_profiles').update({ liked_exams: likedExams }).eq('id', currentUser.id); 
        } 
        await supabase.rpc('increment_like', { exam_id_param: examId, delta: delta }); 
    } catch (err) { }
};


// ==============================================================================
// 10. PHÒNG THI: TẢI ĐỀ, CHẤM ĐIỂM 
// ==============================================================================

async function loadPdfToCanvas(pdfUrl, disableLoader = false) {
    if (!disableLoader) {
        window.showLoader("Đang tải đề thi ra màn hình...");
    }
    
    const scrollContent = document.getElementById('pdf-scroll-content');
    const staticLayer = document.getElementById('static-layer');
    const drawLayer = document.getElementById('draw-layer');
    
    Array.from(scrollContent.children).forEach(child => { 
        if (child.id !== 'draw-layer' && child.id !== 'static-layer') { 
            child.remove(); 
        } 
    });
    
    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        let totalHeight = 0; 
        let maxWidth = 0;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum); 
            const viewport = page.getViewport({ scale: 1.5 }); 
            const canvas = document.createElement('canvas');
            
            canvas.className = 'pdf-page-canvas'; 
            canvas.width = viewport.width; 
            canvas.height = viewport.height;
            
            const ctx = canvas.getContext('2d'); 
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            scrollContent.insertBefore(canvas, staticLayer); 
            totalHeight += viewport.height; 
            
            if (viewport.width > maxWidth) { maxWidth = viewport.width; }
        }
        
        originalPdfWidth = maxWidth; 
        originalPdfHeight = totalHeight;
        
        staticLayer.width = maxWidth; 
        staticLayer.height = totalHeight; 
        drawLayer.width = maxWidth; 
        drawLayer.height = totalHeight;
        
        if (strokes && strokes.length > 0) { 
            redrawStaticCanvas(); 
        }
        
        if (!disableLoader) {
            window.hideLoader();
        }
        
        let initZ = 1; 
        const wrapper = document.getElementById('pdf-render-wrapper');
        
        if (window.innerWidth <= 1024) { 
            initZ = wrapper.clientWidth / maxWidth; 
        } else {
            if (initZ > 1) initZ = 1;
        }
        
        window.changeZoom(initZ, true); 
        setTool('none');
        
    } catch (error) { 
        window.showNotification("Lỗi tải đề", "Không thể tải file PDF. Vui lòng kiểm tra lại đường dẫn file!"); 
        if (!disableLoader) window.hideLoader(); 
    }
}

function requestFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) { 
        elem.requestFullscreen().catch(err => console.log(err)); 
    } else if (elem.webkitRequestFullscreen) { 
        elem.webkitRequestFullscreen(); 
    } else if (elem.msRequestFullscreen) { 
        elem.msRequestFullscreen(); 
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && sessionStorage.getItem('thpt_in_exam') === 'true') {
        window.showNotification("Cảnh báo vi phạm", "Bạn vừa thoát khỏi chế độ làm bài toàn màn hình!\nHệ thống yêu cầu làm bài nghiêm túc. Vui lòng bấm tắt thông báo này để quay lại chế độ thi.");
    }
});


window.startExam = async (eId, mode, attIdx = null) => {
    document.getElementById('right-panel-drawer').classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('show');
    document.getElementById('drawer-backdrop').style.display = 'none';

    try {
        if (EXAM_DATABASE.length === 0) {
            window.showLoader("Đang nạp dữ liệu đề thi...");
            const { data: dbExams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
            
            if (!error && dbExams) { 
                EXAM_DATABASE = dbExams.map(ex => ({ 
                    id: ex.id, 
                    title: ex.title, 
                    category: ex.category || 'practise', 
                    cohort: ex.cohort || '2k9', 
                    pdfUrl: ex.pdf_url, 
                    answers: ex.answers || {}, 
                    views: ex.views || 0, 
                    likes: ex.likes || 0 
                })); 
            }
        }
    } catch (err) { }

    currentExam = EXAM_DATABASE.find(e => e.id === eId);
    
    if (!currentExam) { 
        window.hideLoader(); 
        window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi này!"); 
        window.showHome(true); 
        return; 
    }

    if (mode === 'review') {
        const historyData = userDataCache.history[eId] || []; 
        const idx = attIdx !== null ? attIdx : (historyData.length - 1);
        sessionStorage.setItem('thpt_review_state', JSON.stringify({id: eId, idx: idx})); 
        sessionStorage.removeItem('thpt_in_exam');
    } else {
        sessionStorage.setItem('thpt_in_exam', 'true'); 
        sessionStorage.removeItem('thpt_review_state');
    }

    isReviewMode = (mode === 'review'); 
    isSubmitted = isReviewMode;
    
    document.querySelectorAll('.ad-banner-side').forEach(el => el.style.display = 'none');
    
    const popupAd = document.getElementById('corner-ad'); 
    if (popupAd) popupAd.style.display = 'none';
    
    const headerSelectors = ['header', '.header', '.top-navbar', '#header', '.navbar'];
    headerSelectors.forEach(selector => { 
        const el = document.querySelector(selector); 
        if (el) el.style.display = 'none'; 
    });
    
    document.getElementById('exam-workspace').classList.add('fullscreen-active');
    
    if (!isReviewMode) {
        document.body.classList.add('is-taking-exam');
        document.title = `Đang làm: ${currentExam.title}`; 
        
        const timerBox = document.getElementById('header-timer-box');
        if (timerBox) {
            if (window.innerWidth <= 1024) {
                document.body.appendChild(timerBox);
            } else {
                const controlHeader = document.getElementById('control-header');
                const submitBtn = document.getElementById('btn-submit-exam');
                if (controlHeader && submitBtn) { 
                    controlHeader.insertBefore(timerBox, submitBtn); 
                }
            }
            timerBox.style.display = 'inline-flex';
        }
        
        requestFullScreen();
    } else { 
        document.body.classList.remove('is-taking-exam'); 
        document.title = `Lịch sử: ${currentExam.title}`; 
    }

    if (mode === 'retake' || mode === 'new') { 
        userDataCache.activeState = null; 
        strokes = []; 
    } else if (isReviewMode) {
        const historyData = userDataCache.history[eId] || []; 
        const idx = attIdx !== null ? attIdx : (historyData.length - 1); 
        const attemptData = historyData[idx] || {};
        
        if (attemptData.strokes && Array.isArray(attemptData.strokes)) { 
            strokes = JSON.parse(JSON.stringify(attemptData.strokes)); 
        } else { 
            strokes = []; 
        }
    } else if (mode === 'continue' && userDataCache.activeState) {
        if (userDataCache.activeState.strokes && Array.isArray(userDataCache.activeState.strokes)) { 
            strokes = JSON.parse(JSON.stringify(userDataCache.activeState.strokes)); 
        } else { 
            strokes = []; 
        }
    }
    
    if (!isReviewMode) { 
        userDataCache.activeExam = eId; 
        await supabase.from('user_profiles').update({ active_exam: eId }).eq('id', currentUser.id); 
    }
    
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('exam-workspace').style.display = 'flex';
    document.getElementById('header-user-info').style.display = 'none';
    document.getElementById('hamburger-btn').style.display = 'none';
    
    const examNameTitle = document.getElementById('current-exam-name'); 
    if (examNameTitle) examNameTitle.style.display = 'none';
    
    const btnExit = document.getElementById('btn-exit-exam'); 
    if (btnExit) btnExit.style.display = 'none';

    window.hideLoader(); 

    if (isReviewMode) {
        document.getElementById('summary-screen').style.display = 'block';
        document.getElementById('sheets-container').style.display = 'none';
        document.getElementById('control-header').style.display = 'none';
        
        const historyData = userDataCache.history[eId] || []; 
        const idx = attIdx !== null ? attIdx : (historyData.length - 1);
        
        if (historyData[idx]) { 
            fillAnswers(historyData[idx].answers); 
            runGradingLogic(historyData[idx].answers, idx + 1); 
        }
        
        const toolbar = document.getElementById('toolbar-wrapper'); 
        if (toolbar) toolbar.style.display = 'none';
        
        const drawLayer = document.getElementById('draw-layer'); 
        if (drawLayer) drawLayer.style.pointerEvents = 'none';
        
        document.getElementById('zoom-controls').style.display = 'flex';

        const panel = document.getElementById('right-panel-drawer'); 
        const backdrop = document.getElementById('drawer-backdrop');
        
        if (panel) { panel.classList.add('open'); }
        if (backdrop) { backdrop.style.display = 'block'; backdrop.classList.add('show'); }
        
        loadPdfToCanvas(currentExam.pdfUrl, true).catch(e => console.error(e));
        
    } else {
        document.getElementById('summary-screen').style.display = 'none';
        document.getElementById('sheets-container').style.display = 'block';
        document.getElementById('control-header').style.display = 'flex';
        
        totalTime = (currentExam.timeMinutes || 90) * 60;
        window.initAnswerSheets();
        
        await loadPdfToCanvas(currentExam.pdfUrl, false); 
        
        document.getElementById('toolbar-wrapper').style.display = 'block'; 
        document.getElementById('zoom-controls').style.display = 'flex';
        document.getElementById('toolbar-wrapper').classList.remove('hidden'); 
        document.getElementById('pdf-render-wrapper').classList.remove('toolbar-closed');
        
        const drawLayer = document.getElementById('draw-layer'); 
        if (drawLayer) drawLayer.style.pointerEvents = 'auto';
        
        if (mode === 'continue' && userDataCache.activeState) { 
            totalTime = userDataCache.activeState.timeLeft; 
            fillAnswers(userDataCache.activeState.answers || {}); 
        }
        
        startTimer();
    }
    
    // Đảm bảo FAB hiện lên sau khi mọi DOM đã cập nhật xong
    window.updateFabVisibility();
};


window.saveProgress = async () => {
    if (!currentUser || !currentExam || isSubmitted || isReviewMode || userDataCache.sessionId !== currentSessionId) return;
    
    userDataCache.activeState = { 
        timeLeft: totalTime, 
        answers: getAllCurrentAnswers(), 
        strokes: JSON.parse(JSON.stringify(strokes)) 
    };
    
    await supabase.from('user_profiles').update({ active_exam: currentExam.id, active_state: userDataCache.activeState }).eq('id', currentUser.id);
};

window.initAnswerSheets = () => {
    const container = document.getElementById('sheets-container'); 
    container.innerHTML = ''; 
    let htmlContent = '';
    
    htmlContent += `<div class="section-title">PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</div><div class="mcq-grid">`;
    for(let i = 1; i <= 12; i++) {
        htmlContent += `<div class="q-compact-row"><div class="q-compact-num">Câu ${i}</div><div class="mcq-options compact">`;
        ['A', 'B', 'C', 'D'].forEach(option => { 
            htmlContent += `<label class="mcq-label"><input type="radio" name="ans_P1_${i}" value="${option}"><span class="mcq-box round">${option}</span></label>`; 
        });
        htmlContent += `</div><div class="result-feedback" id="feedback_P1_${i}"></div></div>`;
    }
    
    htmlContent += `</div><div class="section-title">PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI</div><div class="tf-grid-compact">`;
    for(let i = 1; i <= 4; i++) {
        htmlContent += `<div class="q-compact-row tf-block"><div class="q-compact-num" style="width:100%; margin-bottom:5px;">Câu ${i}</div><div class="tf-items">`;
        ['a', 'b', 'c', 'd'].forEach(subQ => { 
            htmlContent += `<div class="tf-item-row"><span class="tf-item-label">${subQ})</span><div><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="T"><span class="tf-box small true-box">Đ</span></label><label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="F"><span class="tf-box small false-box">S</span></label></div></div>`; 
        });
        htmlContent += `</div><div class="result-feedback" id="feedback_P2_${i}"></div></div>`;
    }
    
    htmlContent += `</div><div class="section-title">PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</div><div class="short-grid">`;
    for(let i = 1; i <= 6; i++) { 
        htmlContent += `<div class="q-compact-row short-block"><div class="q-compact-num">Câu ${i}</div><input type="text" id="ans_P3_${i}" class="short-answer-input compact" placeholder="Nhập Đ.Án" autocomplete="off"><div class="result-feedback" id="feedback_P3_${i}"></div></div>`; 
    }
    htmlContent += `</div>`; 
    
    container.innerHTML = htmlContent;
};

window.viewDetailedAnswers = () => {
    if (!currentExam) { 
        window.showNotification("Lỗi", "Không tìm thấy dữ liệu đề thi hiện tại!"); 
        return; 
    }
    
    let attemptIdx = 0;
    const reviewStateStr = sessionStorage.getItem('thpt_review_state');
    
    if (reviewStateStr) {
        const reviewState = JSON.parse(reviewStateStr);
        attemptIdx = reviewState.idx;
    } else {
        const historyData = userDataCache.history[currentExam.id] || []; 
        attemptIdx = historyData.length > 0 ? (historyData.length - 1) : 0;
    }
    
    if (document.fullscreenElement) { 
        document.exitFullscreen().catch(() => {}); 
    }
    
    window.location.href = `solution.html?examId=${currentExam.id}&attempt=${attemptIdx}`;
};

window.goHome = () => {
    sessionStorage.removeItem('thpt_in_exam'); 
    sessionStorage.removeItem('thpt_review_state'); 
    clearInterval(timerInterval); 
    
    if (document.fullscreenElement) { 
        document.exitFullscreen().catch(() => {}); 
    }
    
    const panel = document.getElementById('right-panel-drawer'); 
    const backdrop = document.getElementById('drawer-backdrop');
    
    if (panel) panel.classList.remove('open'); 
    if (backdrop) { 
        backdrop.classList.remove('show'); 
        setTimeout(() => backdrop.style.display = 'none', 300); 
    }
    
    window.showHome(true);
};

window.backToSummary = () => {
    document.getElementById('sheets-container').style.display = 'none';
    document.getElementById('btn-back-summary').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'block';
};

function getAllCurrentAnswers() {
    const ans = {}; 
    document.querySelectorAll('input[type="radio"]:checked').forEach(el => { 
        ans[el.name] = el.value; 
    });
    document.querySelectorAll('input[type="text"]').forEach(el => { 
        if (el.value.trim() !== '') { 
            ans[el.id] = el.value.trim(); 
        } 
    }); 
    return ans;
}

function fillAnswers(ans) {
    for (const key in ans) { 
        const radio = document.querySelector(`input[name="${key}"][value="${ans[key]}"]`); 
        const text = document.getElementById(key); 
        if (radio) radio.checked = true; 
        if (text) text.value = ans[key]; 
    }
}

function updateTimerDisplay() {
    let m = Math.floor(totalTime / 60).toString().padStart(2, '0'); 
    let s = (totalTime % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('global-timer');
    
    if (timerEl) { 
        timerEl.innerText = `${m}:${s}`; 
    }
}

function startTimer() {
    clearInterval(timerInterval);
    endTime = Date.now() + totalTime * 1000;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        let remaining = Math.floor((endTime - Date.now()) / 1000);
        if (remaining <= 0) { 
            clearInterval(timerInterval); 
            totalTime = 0; 
            updateTimerDisplay();
            window.showNotification("Hết giờ!", "Đã hết thời gian làm bài! Hệ thống tự động thu bài và chấm điểm."); 
            window.submitAndGrade(); 
            return; 
        }
        totalTime = remaining; 
        updateTimerDisplay();
        
        if (remaining % 5 === 0) { 
            window.saveProgress(); 
        }
    }, 1000);
}

window.submitAndGrade = async () => {
    sessionStorage.removeItem('thpt_in_exam'); 
    clearInterval(timerInterval); 
    isSubmitted = true; 
    isReviewMode = true; 
    setTool('none'); 
    
    document.body.classList.remove('is-taking-exam');
    if (document.fullscreenElement) { 
        document.exitFullscreen().catch(() => {}); 
    }

    const toolbar = document.getElementById('toolbar-wrapper'); 
    if (toolbar) { toolbar.style.display = 'none'; }
    
    const drawLayer = document.getElementById('draw-layer'); 
    if (drawLayer) { drawLayer.style.pointerEvents = 'none'; }
    
    const panel = document.getElementById('right-panel-drawer'); 
    const backdrop = document.getElementById('drawer-backdrop');
    if (panel) { panel.classList.add('open'); }
    
    if (backdrop) { 
        backdrop.style.display = 'block'; 
        setTimeout(() => { backdrop.classList.add('show'); }, 10); 
    }
    
    window.updateFabVisibility();
    
    const ans = getAllCurrentAnswers(); 
    const score = runGradingLogic(ans); 
    const id = currentExam.id; 
    const hist = userDataCache.history;
    
    if (!hist[id]) { hist[id] = []; }
    const d = new Date(); 
    const ds = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    
    hist[id].push({ 
        score: score, 
        answers: ans, 
        date: ds, 
        strokes: JSON.parse(JSON.stringify(strokes)) 
    });
    
    sessionStorage.setItem('thpt_review_state', JSON.stringify({id: id, idx: hist[id].length - 1}));
    
    userDataCache.activeExam = null; 
    userDataCache.activeState = null;
    await supabase.from('user_profiles').update({ history: hist, active_exam: null, active_state: null }).eq('id', currentUser.id);

    recentlyInteracted.add(`view_${id}`); 
    setTimeout(() => { recentlyInteracted.delete(`view_${id}`); }, 8000);
    
    try { 
        const ex = EXAM_DATABASE.find(e => e.id === id); 
        if (ex) { 
            ex.views = (ex.views || 0) + 1; 
            const viewEl = document.getElementById(`view-count-${id}`); 
            if(viewEl) { animateNumberChange(viewEl, ex.views); } 
        } 
        await supabase.rpc('increment_view', { exam_id_param: id }); 
    } catch (e) { }
};

function runGradingLogic(ans, attempt = null) {
    document.getElementById('control-header').style.display = 'none'; 
    document.getElementById('header-timer-box').style.display = 'none';
    
    const toolbar = document.getElementById('toolbar-wrapper'); 
    if (toolbar) { toolbar.style.display = 'none'; }
    
    let totalScore = 0; 
    let p1_correct = 0; 
    let p2_score = 0; 
    let p3_correct = 0; 
    const keys = currentExam.answers || currentExam.keys || {}; 
    
    for (let i = 1; i <= 12; i++) { 
        let correctAns = null; 
        if (keys.P1 && keys.P1[i]) { 
            correctAns = typeof keys.P1[i] === 'object' ? keys.P1[i].ans : keys.P1[i]; 
        } 
        const isCorrect = ans[`ans_P1_${i}`] === correctAns; 
        if (isCorrect) p1_correct++; 
    } 
    totalScore += p1_correct * 0.25;
    
    for (let i = 1; i <= 4; i++) { 
        let opts = 0; 
        const kv = (keys.P2 && keys.P2[i]) || { a:'T', b:'F', c:'T', d:'F' }; 
        ['a', 'b', 'c', 'd'].forEach(o => { 
            if (ans[`ans_P2_${i}${o}`] === kv[o]) opts++; 
        }); 
        let pts = opts === 1 ? 0.1 : opts === 2 ? 0.25 : opts === 3 ? 0.5 : opts === 4 ? 1 : 0; 
        p2_score += pts; 
    } 
    totalScore += p2_score;
    
    for (let i = 1; i <= 6; i++) { 
        let correctAns = null; 
        if (keys.P3 && keys.P3[i]) { 
            correctAns = typeof keys.P3[i] === 'object' ? keys.P3[i].ans : keys.P3[i]; 
        } 
        const isCorrect = (ans[`ans_P3_${i}`] || '').trim() === String(correctAns || ''); 
        if (isCorrect) p3_correct++; 
    } 
    totalScore += p3_correct * 0.5;
    
    document.querySelectorAll('#sheets-container input').forEach(e => e.disabled = true);
    
    document.getElementById('final-score-text').innerText = totalScore.toFixed(2);
    document.getElementById('summary-desc').innerText = attempt ? `Lần ${attempt}` : "Kết quả gần nhất";
    document.getElementById('summary-stats').innerHTML = `
        <div class="stat-row"><span>Phần I (Trắc nghiệm):</span> <strong>${p1_correct}/12 (+${(p1_correct * 0.25).toFixed(2)})</strong></div>
        <div class="stat-row"><span>Phần II (Đúng/Sai):</span> <strong>(+${p2_score.toFixed(2)})</strong></div>
        <div class="stat-row"><span>Phần III (Điền khuyết):</span> <strong>${p3_correct}/6 (+${(p3_correct * 0.5).toFixed(2)})</strong></div>
    `;
    
    document.getElementById('sheets-container').style.display = 'none'; 
    document.getElementById('summary-screen').style.display = 'block';
    
    return totalScore;
}

window.showHistory = (eId) => {
    const historyData = userDataCache.history[eId] || []; 
    const ex = EXAM_DATABASE.find(e => e.id === eId);
    
    const modal = document.getElementById('custom-modal'); 
    const listContainer = document.getElementById('modal-history-list');
    
    document.getElementById('modal-title').innerText = `Lịch sử: ${ex.title}`; 
    document.getElementById('modal-message').style.display = 'none'; 
    document.getElementById('modal-action-buttons').style.display = 'none';
    
    listContainer.style.display = 'block'; 
    listContainer.innerHTML = '';
    
    for (let i = historyData.length - 1; i >= 0; i--) {
        const a = historyData[i];
        listContainer.innerHTML += `
            <div class="history-item">
                <div class="history-info"><span class="h-attempt">Lần ${i + 1}</span><span class="h-date">${a.date}</span></div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="h-score">${a.score.toFixed(2)}</span>
                    <button class="btn-review-sm" onclick="window.closeModal(); window.startExam('${eId}', 'review', ${i})">Xem Lại</button>
                </div>
            </div>
        `;
    }
    
    listContainer.innerHTML += `<button class="btn-cancel" style="width:100%; margin-top:10px;" onclick="window.closeModal()">Đóng</button>`;
    
    modal.style.display = 'flex'; 
    requestAnimationFrame(() => modal.classList.add('active'));
};


window.openModal = (action) => {
    const modal = document.getElementById('custom-modal'); 
    const title = document.getElementById('modal-title'); 
    const msg = document.getElementById('modal-message'); 
    const confirmBtn = document.getElementById('modal-confirm-btn'); 
    const cancelBtn = document.querySelector('#custom-modal .btn-cancel');
    
    document.getElementById('modal-history-list').style.display = 'none'; 
    msg.style.display = 'block'; 
    document.getElementById('modal-action-buttons').style.display = 'flex'; 
    cancelBtn.style.display = 'block';
    
    if (action === 'exit') {
        if(isSubmitted || isReviewMode) { window.goHome(); return; }
        title.innerText = "Thoát"; 
        msg.innerText = "Hệ thống sẽ lưu lại quá trình làm bài. Bạn có chắc chắn muốn thoát?";
        confirmBtn.className = "btn-confirm danger"; 
        confirmBtn.innerText = "Thoát"; 
        pendingAction = window.goHome;
    } else if (action === 'submit') {
        title.innerText = "Nộp bài"; 
        msg.innerText = "Bạn đã chắc chắn hoàn thành và muốn nộp bài?";
        confirmBtn.className = "btn-confirm"; 
        confirmBtn.innerText = "Nộp"; 
        pendingAction = window.submitAndGrade;
    } else if (action === 'clear_canvas') {
        title.innerText = "Xóa Tất Cả"; 
        msg.innerText = "Bạn chắc chắn muốn xóa toàn bộ nét vẽ trên màn hình?";
        confirmBtn.className = "btn-confirm danger"; 
        confirmBtn.innerText = "Xóa sạch"; 
        pendingAction = () => { strokes = []; redrawStaticCanvas(); };
    } else if (action === 'kickout') {
        title.innerText = "Cảnh báo"; 
        msg.innerText = "Tài khoản của bạn vừa đăng nhập ở một thiết bị khác!";
        confirmBtn.className = "btn-confirm danger"; 
        confirmBtn.innerText = "Thoát"; 
        cancelBtn.style.display = 'none'; 
        pendingAction = window.handleLogout;
    }
    
    modal.style.display = 'flex'; 
    requestAnimationFrame(() => modal.classList.add('active'));
};

window.confirmAction = () => { 
    if (pendingAction) pendingAction(); 
    window.closeModal(); 
};


// ==============================================================================
// 11. HỆ THỐNG ZOOM TỰ ĐỘNG & VẼ PDF
// ==============================================================================

let currentZoom = 1;

window.changeZoom = (amount, isAbsolute = false) => {
    if (!originalPdfWidth) return;
    
    if (isAbsolute) { 
        currentZoom = amount; 
    } else { 
        currentZoom += amount; 
    }
    
    if (currentZoom < 0.2) currentZoom = 0.2; 
    if (currentZoom > 5.0) currentZoom = 5.0;
    
    const scaledWidth = originalPdfWidth * currentZoom; 
    const scaledHeight = originalPdfHeight * currentZoom;
    const scrollContent = document.getElementById('pdf-scroll-content'); 
    
    if (scrollContent) { 
        scrollContent.style.transform = `scale(${currentZoom})`; 
    }
    
    const container = document.getElementById('pdf-zoom-container'); 
    if (container) { 
        container.style.width = scaledWidth + 'px'; 
        container.style.height = scaledHeight + 'px'; 
    }
    
    const wrapper = document.getElementById('pdf-render-wrapper');
    if (wrapper && container) { 
        if (window.innerWidth <= 1024) {
            container.style.marginLeft = '0px';
        } else {
            if (scaledWidth < wrapper.clientWidth - 40) { 
                container.style.marginLeft = ((wrapper.clientWidth - scaledWidth) / 2) + 'px'; 
            } else { 
                container.style.marginLeft = '20px'; 
            } 
        }
    }
    
    const zoomText = document.getElementById('zoom-text'); 
    if (zoomText) { 
        zoomText.innerText = Math.round(currentZoom * 100) + '%'; 
    }
};

window.addEventListener('resize', () => {
    if (document.getElementById('exam-workspace').style.display === 'flex' && originalPdfWidth) { 
        const wrapper = document.getElementById('pdf-render-wrapper');
        let newZ = 1;
        if (window.innerWidth <= 1024) { 
            newZ = wrapper.clientWidth / originalPdfWidth; 
        } else {
            if (newZ > 1) newZ = 1;
        }
        window.changeZoom(newZ, true); 
    } else if (document.getElementById('home-screen').style.display === 'block') { 
        document.getElementById('hamburger-btn').style.display = window.innerWidth <= 767 ? 'block' : 'none'; 
        document.getElementById('header-user-info').style.display = window.innerWidth <= 767 ? 'none' : 'flex'; 
    }
    
    window.updateFabVisibility();
});

document.addEventListener('wheel', function(e) { 
    if (e.ctrlKey || e.metaKey || e.altKey) { 
        e.preventDefault(); 
        if (document.getElementById('exam-workspace').style.display === 'flex') { 
            if (e.deltaY < 0) { 
                window.changeZoom(0.05); 
            } else { 
                window.changeZoom(-0.05); 
            } 
        } 
    } 
}, { passive: false });

const pdfWrapper = document.getElementById('pdf-render-wrapper');
let initDist = 0; 
let initZoom = 1; 
let pinchCenter = null;

pdfWrapper.addEventListener('touchstart', (e) => { 
    if (e.touches.length === 2) { 
        initDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY); 
        initZoom = currentZoom; 
        const rect = pdfWrapper.getBoundingClientRect(); 
        pinchCenter = { 
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left, 
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top 
        }; 
    } 
}, { passive: false });

pdfWrapper.addEventListener('touchmove', (e) => { 
    if (e.touches.length === 2) { 
        e.preventDefault(); 
        const scale = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY) / initDist; 
        let newZoom = initZoom * scale; 
        if (newZoom < 0.2) newZoom = 0.2; 
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
}, { passive: false });

const staticLayer = document.getElementById('static-layer'); 
const staticCtx = staticLayer.getContext('2d', { desynchronized: true });
const drawLayer = document.getElementById('draw-layer'); 
const drawCtx = drawLayer.getContext('2d', { desynchronized: true });

let strokes = []; 
let currentStroke = null; 
let isDrawing = false; 
let activeTool = 'none'; 
let brushColor = '#0f172a'; 
let brushSize = 3;

function setTool(tool) {
    if (activeTool === tool) { 
        activeTool = 'none'; 
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'eraser-active')); 
        drawLayer.style.pointerEvents = 'none'; 
        document.getElementById('pdf-render-wrapper').style.cursor = 'default'; 
        document.getElementById('color-palette').style.opacity = '0.3'; 
        document.getElementById('color-palette').style.pointerEvents = 'none'; 
        return; 
    }
    
    activeTool = tool; 
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'eraser-active'));
    
    if (tool === 'pan') { 
        const toolPan = document.getElementById('tool-pan'); 
        if (toolPan) toolPan.classList.add('active'); 
        
        drawLayer.style.pointerEvents = 'none'; 
        document.getElementById('pdf-render-wrapper').style.cursor = 'grab'; 
        document.getElementById('color-palette').style.opacity = '0.3'; 
        document.getElementById('color-palette').style.pointerEvents = 'none'; 
    } else { 
        drawLayer.style.pointerEvents = 'auto'; 
        document.getElementById('color-palette').style.opacity = '1'; 
        document.getElementById('color-palette').style.pointerEvents = 'auto'; 
        
        if (tool === 'pen') { 
            const toolPen = document.getElementById('tool-pen'); 
            if (toolPen) toolPen.classList.add('active'); 
            brushSize = 3; 
            const sizeInp = document.getElementById('brush-size'); 
            if (sizeInp) sizeInp.value = 3; 
        } else if (tool === 'highlighter') { 
            const toolHighlighter = document.getElementById('tool-highlighter'); 
            if (toolHighlighter) toolHighlighter.classList.add('active'); 
            brushSize = 15; 
            const sizeInp = document.getElementById('brush-size'); 
            if (sizeInp) sizeInp.value = 15; 
        } else if (tool === 'eraser') { 
            const toolEraser = document.getElementById('tool-eraser'); 
            if (toolEraser) toolEraser.classList.add('eraser-active'); 
            brushSize = 25; 
            const sizeInp = document.getElementById('brush-size'); 
            if (sizeInp) sizeInp.value = 25; 
            document.getElementById('color-palette').style.opacity = '0.3'; 
            document.getElementById('color-palette').style.pointerEvents = 'none'; 
        } 
        updateBrushStyle(); 
    }
}

document.getElementById('tool-pen')?.addEventListener('click', () => setTool('pen')); 
document.getElementById('tool-highlighter')?.addEventListener('click', () => setTool('highlighter')); 
document.getElementById('tool-eraser')?.addEventListener('click', () => setTool('eraser')); 
document.getElementById('tool-pan')?.addEventListener('click', () => setTool('pan'));

window.toggleToolbar = () => { 
    document.getElementById('toolbar-wrapper').classList.toggle('hidden'); 
    document.getElementById('pdf-render-wrapper').classList.toggle('toolbar-closed'); 
};

function updateBrushStyle() { 
    if (activeTool === 'none' || activeTool === 'pan') return; 
    
    if (activeTool === 'eraser') { 
        const s = Math.max(15, brushSize * 1.5); 
        const svg = btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="white" fill-opacity="0.5" stroke="black" stroke-width="2"/></svg>`); 
        drawLayer.style.cursor = `url('data:image/svg+xml;base64,${svg}') ${s/2} ${s/2}, auto`; 
    } else { 
        drawLayer.style.cursor = 'crosshair'; 
    } 
}

document.getElementById('brush-size')?.addEventListener('input', (e) => { 
    brushSize = parseInt(e.target.value); 
    updateBrushStyle(); 
});

document.querySelectorAll('.color-swatch').forEach(swatch => { 
    swatch.addEventListener('click', () => { 
        if (['eraser','pan','none'].includes(activeTool)) { 
            setTool('pen'); 
        } 
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active')); 
        swatch.classList.add('active'); 
        brushColor = swatch.dataset.color; 
        updateBrushStyle(); 
    }); 
});

function drawSingleStroke(ctx, stroke) {
    ctx.beginPath(); 
    ctx.lineWidth = stroke.size;
    
    if (stroke.tool === 'eraser') { 
        ctx.globalCompositeOperation = 'destination-out'; 
        ctx.globalAlpha = 1; 
        ctx.lineCap = 'square'; 
        ctx.lineJoin = 'miter'; 
    } else if (stroke.tool === 'highlighter') { 
        ctx.globalCompositeOperation = 'source-over'; 
        ctx.globalAlpha = 0.5; 
        ctx.lineCap = 'round'; 
        ctx.lineJoin = 'round'; 
    } else { 
        ctx.globalCompositeOperation = 'source-over'; 
        ctx.globalAlpha = 1; 
        ctx.lineCap = 'round'; 
        ctx.lineJoin = 'round'; 
    }
    
    ctx.strokeStyle = stroke.color; 
    ctx.fillStyle = stroke.color;
    
    if (stroke.points.length > 0) { 
        if (stroke.points.length < 3) { 
            if (stroke.tool === 'eraser') { 
                ctx.fillRect(stroke.points[0].x - stroke.size/2, stroke.points[0].y - stroke.size/2, stroke.size, stroke.size); 
            } else { 
                ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2); 
                ctx.fill(); 
            } 
        } else { 
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y); 
            for (let i = 1; i < stroke.points.length - 2; i++) { 
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2; 
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2; 
                ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc); 
            } 
            ctx.quadraticCurveTo(stroke.points[stroke.points.length - 2].x, stroke.points[stroke.points.length - 2].y, stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y); 
            ctx.stroke(); 
        } 
    }
}

function redrawStaticCanvas() { 
    staticCtx.clearRect(0, 0, staticLayer.width, staticLayer.height); 
    strokes.forEach(s => drawSingleStroke(staticCtx, s)); 
}

function getDrawCoords(e) { 
    const rect = drawLayer.getBoundingClientRect(); 
    return { 
        x: ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / currentZoom, 
        y: ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / currentZoom 
    }; 
}

function beginDraw(e) { 
    if (isReviewMode || activeTool === 'none' || activeTool === 'pan') return; 
    e.preventDefault(); 
    isDrawing = true; 
    
    currentStroke = { tool: activeTool, color: brushColor, size: brushSize, points: [getDrawCoords(e)] }; 
    
    if (activeTool === 'eraser') { 
        drawSingleStroke(staticCtx, currentStroke); 
    } else { 
        drawSingleStroke(drawCtx, currentStroke); 
    } 
}

function strokeDraw(e) { 
    if (!isDrawing || isReviewMode || activeTool === 'none' || activeTool === 'pan') return; 
    e.preventDefault(); 
    currentStroke.points.push(getDrawCoords(e)); 
    
    if (activeTool === 'eraser') { 
        const p1 = currentStroke.points[currentStroke.points.length - 2]; 
        const p2 = currentStroke.points[currentStroke.points.length - 1]; 
        staticCtx.beginPath(); 
        staticCtx.globalCompositeOperation = 'destination-out'; 
        staticCtx.lineWidth = brushSize; 
        staticCtx.lineCap = 'square'; 
        staticCtx.lineJoin = 'miter'; 
        staticCtx.moveTo(p1.x, p1.y); 
        staticCtx.lineTo(p2.x, p2.y); 
        staticCtx.stroke(); 
    } else { 
        drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height); 
        drawSingleStroke(drawCtx, currentStroke); 
    } 
}

function endDraw() { 
    if (!isDrawing) return; 
    isDrawing = false; 
    strokes.push(currentStroke); 
    
    if (activeTool !== 'eraser') { 
        drawSingleStroke(staticCtx, currentStroke); 
        drawCtx.clearRect(0, 0, drawLayer.width, drawLayer.height); 
    } 
    currentStroke = null; 
}

drawLayer.addEventListener('mousedown', beginDraw); 
drawLayer.addEventListener('mousemove', strokeDraw); 
window.addEventListener('mouseup', endDraw); 

drawLayer.addEventListener('touchstart', (e) => { 
    if (e.touches.length === 1 && activeTool !== 'none') { beginDraw(e); } 
}, { passive: false }); 

drawLayer.addEventListener('touchmove', (e) => { 
    if (e.touches.length === 1 && activeTool !== 'none') { strokeDraw(e); } 
}, { passive: false }); 

window.addEventListener('touchend', endDraw);

document.getElementById('btn-undo')?.addEventListener('click', () => { 
    if (strokes.length > 0) { 
        strokes.pop(); 
        redrawStaticCanvas(); 
    } 
}); 

document.getElementById('btn-clear-canvas')?.addEventListener('click', () => { 
    window.openModal('clear_canvas'); 
});


// ==============================================================================
// 12. XỬ LÝ CLICK RA NGOÀI ĐỂ TẮT POPUP CHÍNH XÁC
// ==============================================================================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.id === 'drawer-backdrop') {
        window.handleBackdropClick(e, e.target.id);
    }
});

window.handleBackdropClick = (e, modalId) => { 
    if (e.target === e.currentTarget || e.target.classList.contains('modal-overlay')) { 
        if (modalId === 'notification-modal') window.closeNotificationModal(); 
        if (modalId === 'custom-modal') window.closeModal(); 
        if (modalId === 'profile-modal') window.closeProfileModal();
        if (modalId === 'drawer-backdrop') window.toggleMobileSheet(); 
    } 
};


// ==============================================================================
// 13. TÍNH NĂNG VUỐT BẢNG MƯỢT MÀ CHUẨN XÁC 100% (SWIPE TO DISMISS)
// ==============================================================================
let sheetStartY = 0;
let sheetCurrentY = 0;
let isSheetDragging = false;
let activeDrawer = null;
let activeBackdrop = null;
let drawerHeight = 0;

document.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('#drawer-handle-zone');
    if (!handle) return; 
    
    const drawer = document.getElementById('right-panel-drawer');
    if (!drawer || !drawer.classList.contains('open')) return;

    isSheetDragging = true;
    sheetStartY = e.touches[0].clientY;
    sheetCurrentY = sheetStartY;
    
    activeDrawer = drawer;
    activeBackdrop = document.getElementById('drawer-backdrop');
    drawerHeight = activeDrawer.getBoundingClientRect().height;
    
    activeDrawer.style.transition = 'none';
    if (activeBackdrop) activeBackdrop.style.transition = 'none';
    
}, { passive: true });


document.addEventListener('touchmove', (e) => {
    if (!isSheetDragging || !activeDrawer) return;
    
    sheetCurrentY = e.touches[0].clientY;
    let deltaY = sheetCurrentY - sheetStartY;
    
    if (deltaY < 0) {
        deltaY = deltaY * 0.2; 
    }
    
    activeDrawer.style.transform = `translateY(${deltaY}px)`;
    
    if (activeBackdrop && deltaY >= 0) {
        let opacityProgress = 1 - (deltaY / (drawerHeight * 0.15));
        opacityProgress = Math.max(0, Math.min(1, opacityProgress));
        activeBackdrop.style.opacity = opacityProgress;
    }
    
    if (e.cancelable && deltaY > 0) {
        e.preventDefault(); 
    }
}, { passive: false });


document.addEventListener('touchend', (e) => {
    if (!isSheetDragging || !activeDrawer) return;
    isSheetDragging = false;
    
    let deltaY = sheetCurrentY - sheetStartY;
    
    if (deltaY > drawerHeight * 0.35) {
        activeDrawer.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.4s';
        if (activeBackdrop) activeBackdrop.style.transition = 'opacity 0.3s ease';
        
        window.toggleMobileSheet();
        
        setTimeout(() => {
            if (activeDrawer) activeDrawer.style.transform = '';
            if (activeBackdrop) activeBackdrop.style.opacity = '';
        }, 400);
        
    } else {
        activeDrawer.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        if (activeBackdrop) activeBackdrop.style.transition = 'opacity 0.4s ease';
        
        activeDrawer.style.transform = 'translateY(0)';
        if (activeBackdrop) activeBackdrop.style.opacity = '1';
        
        setTimeout(() => {
            if (activeDrawer && activeDrawer.classList.contains('open')) {
                activeDrawer.style.transition = '';
                activeDrawer.style.transform = '';
            }
            if (activeBackdrop && document.getElementById('drawer-backdrop').classList.contains('show')) {
                activeBackdrop.style.transition = '';
                activeBackdrop.style.opacity = '';
            }
        }, 400);
    }
      
    activeDrawer = null;
    activeBackdrop = null;
});

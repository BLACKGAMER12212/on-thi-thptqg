import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// ==============================================================================
// 1. CẤU HÌNH KẾT NỐI SERVER SUPABASE
// ==============================================================================

const supabaseUrl = 'https://foujvxpzsilshacrpslu.supabase.co';
const supabaseKey = 'sb_publishable_Xzo4hIwEc52h_AV_FZDs1w_c5-jDaCR';
const supabase = createClient(supabaseUrl, supabaseKey);


// Khai báo công nhân phân tích PDF (Bắt buộc phải có để đọc đề)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';



// ==============================================================================
// 2. CƠ SỞ DỮ LIỆU ĐỀ THI (FULL 4 ĐỀ ĐẦY ĐỦ)
// ==============================================================================

const EXAM_DATABASE = [
    {
        id: "toan_de_ninhbinh",
        cohort: "2k8",
        category: "so",
        title: "Khảo sát THPT Ninh Bình-Bạc Liêu - Mã 1111",
        tag: "Mới nhất",
        pdfUrl: "exams/thpt-ninhbinh.pdf",
        timeMinutes: 90,
        keys: {
            P1: { 1: "C", 2: "B", 3: "C", 4: "B", 5: "C", 6: "D", 7: "C", 8: "C", 9: "B", 10: "B", 11: "D", 12: "B" },
            P2: { 1: { a: "T", b: "F", c: "T", d: "T" }, 2: { a: "T", b: "T", c: "F", d: "T" }, 3: { a: "T", b: "F", c: "F", d: "F" }, 4: { a: "T", b: "T", c: "F", d: "F" } },
            P3: { 1: "84", 2: "3646", 3: "32", 4: "92", 5: "30,1", 6: "14,5" }
        }
    },
    {
        id: "toan_de_thainguyen",
        cohort: "2k8",
        category: "so",
        title: "Khảo sát Sở Thái Nguyên - Mã 0119",
        tag: "Mới nhất",
        pdfUrl: "exams/thpt-thainguyen-0119.pdf",
        timeMinutes: 90,
        keys: {
            P1: { 1: "C", 2: "A", 3: "A", 4: "B", 5: "B", 6: "A", 7: "B", 8: "B", 9: "B", 10: "D", 11: "A", 12: "D" },
            P2: { 1: { a: "F", b: "F", c: "T", d: "F" }, 2: { a: "F", b: "F", c: "F", d: "T" }, 3: { a: "T", b: "F", c: "T", d: "T" }, 4: { a: "T", b: "T", c: "T", d: "F" } },
            P3: { 1: "5,3", 2: "1201", 3: "1664", 4: "257", 5: "-49", 6: "1403" }
        }
    },
    {
        id: "toan_de_danang",
        cohort: "2k8",
        category: "so",
        title: "Khảo sát Sở Đà Nẵng - Mã 1001",
        tag: "Mới nhất",
        pdfUrl: "exams/thpt-danang-1001.pdf",
        timeMinutes: 90,
        keys: {
            P1: { 1: "B", 2: "A", 3: "A", 4: "C", 5: "D", 6: "B", 7: "A", 8: "C", 9: "A", 10: "B", 11: "A", 12: "C" },
            P2: { 1: { a: "T", b: "F", c: "T", d: "F" }, 2: { a: "T", b: "F", c: "T", d: "T" }, 3: { a: "T", b: "T", c: "F", d: "T" }, 4: { a: "T", b: "T", c: "F", d: "T" } },
            P3: { 1: "26,1", 2: "0,03", 3: "4050", 4: "2", 5: "25", 6: "409" }
        }
    },
    {
        id: "toan_de_nghean-0101",
        cohort: "2k8",
        category: "so",
        title: "Khảo sát Sở Nghệ An - Mã 0101",
        tag: "Mới nhất",
        pdfUrl: "exams/thpt_nghean-0101.pdf",
        timeMinutes: 90,
        keys: {
            P1: { 1: "C", 2: "B", 3: "D", 4: "D", 5: "D", 6: "B", 7: "B", 8: "B", 9: "B", 10: "C", 11: "B", 12: "A" },
            P2: { 1: { a: "F", b: "T", c: "T", d: "F" }, 2: { a: "T", b: "F", c: "T", d: "T" }, 3: { a: "T", b: "T", c: "T", d: "T" }, 4: { a: "T", b: "T", c: "F", d: "F" } },
            P3: { 1: "52,1", 2: "97,7", 3: "9", 4: "4446", 5: "0,29", 6: "1200" }
        }
    }
];



// ==============================================================================
// 3. CÁC BIẾN TOÀN CỤC CHẠY NGẦM HỆ THỐNG
// ==============================================================================

let currentUser = null;
let currentExam = null;
let totalTime = 0;
let timerInterval = null;

let isSubmitted = false;
let isReviewMode = false;
let pendingAction = null;
let userDataCache = { history: {}, activeExam: null, activeState: null };

let isInitialLoad = true;
let originalPdfWidth = 0;
let originalPdfHeight = 0;

let currentCategoryFilter = 'all';
let currentCohortFilter = '2k8';
let currentSearchQuery = '';

// Cờ chống kẹt văng web lúc đang đăng nhập
let isAuthenticating = false;

// Đảm bảo không đăng nhập 2 thiết bị
let currentSessionId = localStorage.getItem('thpt_session_id');
if (!currentSessionId) {
    currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5);
    localStorage.setItem('thpt_session_id', currentSessionId);
}



// ==============================================================================
// 4. HÀM ĐIỀU KHIỂN LOADING MƯỢT MÀ
// ==============================================================================

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

window.showLoader = (text = "Đang tải...") => {
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('loader-text');
    if (loaderText) loaderText.innerText = text;
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
};

let initialLagTimeout = setTimeout(() => {
    if (isInitialLoad) {
        window.hideLoader();
        document.getElementById('auth-screen').style.display = 'flex';
    }
}, 4000);

const hasLocalSession = localStorage.getItem('sb-foujvxpzsilshacrpslu-auth-token');
if (!hasLocalSession) {
    clearTimeout(initialLagTimeout);
    window.hideLoader();
    document.getElementById('auth-screen').style.display = 'flex';
}



// ==============================================================================
// 5. TỰ ĐỘNG KIỂM TRA ĐĂNG NHẬP / CẬP NHẬT AVATAR
// ==============================================================================

supabase.auth.onAuthStateChange(async (event, session) => {
    clearTimeout(initialLagTimeout); 

    if (session) {
        currentUser = session.user;
        
        // Móc dữ liệu cá nhân từ Supabase
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id).single();
        
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
                school: data.school
            };
        } else {
            userDataCache = {
                history: {},
                activeExam: null,
                activeState: null,
                sessionId: currentSessionId,
                username: currentUser.email.split('@')[0],
                email: currentUser.email
            };
        }
            
        // Kiểm tra bảo mật chống 2 thiết bị
        if (userDataCache.sessionId && currentSessionId && userDataCache.sessionId !== currentSessionId) {
            if (!isAuthenticating) {
                window.hideLoader();
                clearInterval(timerInterval);
                window.openModal('kickout');
                return;
            }
        }
        
        // Cập nhật Avatar và thông tin lên Header & Menu
        const initialLetter = (userDataCache.username || 'U').charAt(0).toUpperCase();
        document.getElementById('user-avatar-initial').innerText = initialLetter;
        document.getElementById('menu-avatar-initial').innerText = initialLetter;
        
        document.getElementById('display-username').innerText = userDataCache.username;
        document.getElementById('display-username-mobile').innerText = userDataCache.username;
        document.getElementById('menu-display-username').innerText = userDataCache.username;
        
        // Lấy Email hiển thị ở Menu
        let displayEmail = currentUser.email || 'Chưa cập nhật';
        if (displayEmail.includes('@thithu.local')) displayEmail = 'Tài khoản không dùng Gmail';
        document.getElementById('menu-display-email').innerText = displayEmail;

        if (isInitialLoad || isAuthenticating) {
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
        isInitialLoad = true;
        currentUser = null;
        window.hideLoader(); 
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('header-user-info').style.display = 'none';
        document.getElementById('hamburger-btn').style.display = 'none';
    }
});



// ==============================================================================
// 6. QUẢN LÝ AVATAR DROPDOWN MENU & HỒ SƠ CÁ NHÂN
// ==============================================================================

// Bật/Tắt Menu Dropdown khi bấm vào Avatar
window.toggleUserMenu = (event) => {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profile-dropdown-menu');
    const container = document.getElementById('user-dropdown-container');
    if (menu) {
        menu.classList.toggle('show');
        if (container) container.classList.toggle('open');
    }
};

// Tự động đóng Menu khi click bất kỳ đâu ra ngoài
document.addEventListener('click', (event) => {
    const container = document.getElementById('user-dropdown-container');
    const menu = document.getElementById('profile-dropdown-menu');
    if (container && !container.contains(event.target)) {
        if (menu) menu.classList.remove('show');
        container.classList.remove('open');
    }
});

// Mở Hộp thoại Hồ sơ cá nhân
window.openProfileModal = () => {
    // Đóng dropdown menu lại
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

    const phone = userDataCache.phone || 'Chưa cập nhật';
    const school = userDataCache.school || 'Chưa cập nhật trường THPT';

    // Dịch ngày sinh YYYY-MM-DD -> DD/MM/YYYY
    let dobFormatted = 'Chưa cập nhật';
    if (userDataCache.dob) {
        const parts = userDataCache.dob.split('-');
        if (parts.length === 3) {
            dobFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
            dobFormatted = userDataCache.dob;
        }
    }

    // Đếm tổng số lần làm đề
    let totalAttempts = 0;
    if (userDataCache.history) {
        for (const exId in userDataCache.history) {
            totalAttempts += (userDataCache.history[exId] || []).length;
        }
    }

    // Gán dữ liệu lên HTML Modal
    document.getElementById('profile-big-initial').innerText = initialLetter;
    document.getElementById('profile-modal-username').innerText = username;
    document.getElementById('profile-modal-school').innerText = school;
    document.getElementById('profile-modal-email').innerText = email;
    document.getElementById('profile-modal-phone').innerText = phone;
    document.getElementById('profile-modal-dob').innerText = dobFormatted;
    document.getElementById('profile-modal-exams-count').innerText = `${totalAttempts} lần`;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
};

// Đóng Modal Hồ sơ
window.closeProfileModal = () => {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};



// ==============================================================================
// 7. CÁC HÀM TIỆN ÍCH FORM VÀ NGÀY SINH
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
        el.innerText = "🙈";
    } else {
        i.type = "password";
        el.innerText = "👁️";
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
    
    if (type === 'login') document.getElementById('login-form').classList.add('active');
    else if (type === 'register') document.getElementById('register-form').classList.add('active');
    else if (type === 'forgot') document.getElementById('forgot-form').classList.add('active');
};



// ==============================================================================
// 8. HỆ THỐNG XÁC THỰC (ĐĂNG KÝ, ĐĂNG NHẬP, QUÊN MẬT KHẨU)
// ==============================================================================

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
            redirectTo: window.location.origin + window.location.pathname.replace('index.html', '') + 'reset.html',
        });
        
        if (error) throw error;
        
        alert("✅ Link đặt lại mật khẩu đã được gửi đến Gmail của bạn. Vui lòng kiểm tra hộp thư (cả mục Spam/Thư rác)!");
        window.toggleAuth('login');
        
    } catch (err) {
        console.error(err);
        e.innerText = "Gmail này chưa được đăng ký hoặc có lỗi hệ thống!";
        e.style.display = "block";
    } finally {
        btn.innerText = "GỬI LINK ĐẶT LẠI MK";
        btn.style.opacity = "1";
        btn.disabled = false;
    }
};

window.handleRegister = async () => {
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

    if (!u || !dobRaw || !p || !c) {
        e.innerText = "Vui lòng điền đầy đủ các thông tin bắt buộc (*)!";
        e.style.display = "block";
        return;
    }

    if (dobRaw.length !== 10) {
        e.innerText = "Ngày sinh phải đúng định dạng (VD: 15/08/2009)!";
        e.style.display = "block";
        return;
    }

    const parts = dobRaw.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        e.innerText = "Ngày sinh bạn nhập không hợp lệ!";
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
        if(existingUser && existingUser.length > 0) {
            window.hideLoader();
            e.innerText = "Tên tài khoản này đã có người sử dụng!";
            e.style.display = "block";
            return;
        }

        currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5);
        localStorage.setItem('thpt_session_id', currentSessionId);

        let finalEmail = email;
        if (!finalEmail) {
            finalEmail = u.toLowerCase() + "@thithu.local"; 
        }

        const { data: authData, error: authErr } = await supabase.auth.signUp({ email: finalEmail, password: p });
        if (authErr) throw authErr; 

        if (authData.user) {
            const { error: profileErr } = await supabase.from('user_profiles').insert([{
                id: authData.user.id,
                username: u,
                email: finalEmail, 
                phone: phone || null, 
                dob: dbDob,
                school: school || null, 
                history: {},
                active_exam: null,
                active_state: null,
                session_id: currentSessionId
            }]);
            if (profileErr) console.warn("Lỗi nhẹ khi lưu thông tin phụ:", profileErr);
        }

        window.hideLoader();
        s.innerText = "Đăng ký thành công! Đang vào hệ thống...";
        s.style.display = "block";

    } catch(err) {
        console.error("Lỗi:", err);
        window.hideLoader();
        if (err.message && err.message.includes('already registered')) {
            e.innerText = "Gmail này đã được đăng ký trên hệ thống!";
        } else if (err.message && err.message.includes('Password should be')) {
            e.innerText = "Mật khẩu quá yếu (cần tối thiểu 6 ký tự)!";
        } else {
            e.innerText = "Tài khoản hoặc Gmail đã có người sử dụng!";
        }
        e.style.display = "block";
    } finally {
        setTimeout(() => { isAuthenticating = false; }, 3000);
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
        
        let guessEmail = u.toLowerCase() + "@thithu.local";
        const { data: auth1, error: err1 } = await supabase.auth.signInWithPassword({ email: guessEmail, password: p });
        
        if (!err1 && auth1.user) {
            loginSuccess = true;
        } else {
            const { data: userProfile } = await supabase.from('user_profiles').select('email').eq('username', u).single();
            if (userProfile && userProfile.email) {
                const { data: auth2, error: err2 } = await supabase.auth.signInWithPassword({ email: userProfile.email, password: p });
                if (!err2 && auth2.user) {
                    loginSuccess = true;
                }
            }
        }
        
        if (!loginSuccess) {
            window.hideLoader();
            e.innerText = "Tài khoản hoặc mật khẩu không chính xác!";
            e.style.display = "block";
            return;
        }
        
        currentSessionId = Date.now().toString() + Math.random().toString(36).substr(2,5);
        localStorage.setItem('thpt_session_id', currentSessionId);
        await supabase.from('user_profiles').update({ session_id: currentSessionId }).eq('username', u);
        
    } catch(err) {
        console.error(err);
        window.hideLoader();
        e.innerText = "Lỗi kết nối mạng, vui lòng thử lại!";
        e.style.display = "block";
    } finally {
        setTimeout(() => { isAuthenticating = false; }, 3000);
    }
};

window.handleLogout = async () => {
    window.showLoader("Đang đăng xuất...");
    await supabase.auth.signOut();
    location.reload();
};



// ==============================================================================
// 9. ĐIỀU KHIỂN GIAO DIỆN (NÚT BẤM, MENU MOBILE)
// ==============================================================================

window.toggleMobileMenu = () => {
    document.getElementById('mobile-dropdown').classList.toggle('show');
};

window.handleLogoClick = () => {
    if (!isSubmitted && !isReviewMode && currentExam) {
        window.openModal('exit');
    } else {
        window.goHome();
    }
};

window.toggleMobileSheet = () => {
    const panel = document.getElementById('right-panel-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        backdrop.classList.remove('show');
        setTimeout(() => backdrop.style.display = 'none', 300);
    } else {
        panel.classList.add('open');
        backdrop.style.display = 'block';
        setTimeout(() => backdrop.classList.add('show'), 10);
    }
};

window.saveProgress = async () => {
    if (!currentUser || !currentExam || isSubmitted || isReviewMode || userDataCache.sessionId !== currentSessionId) return;
    
    userDataCache.activeState = { timeLeft: totalTime, answers: getAllCurrentAnswers() };
    
    await supabase.from('user_profiles').update({
        active_exam: currentExam.id,
        active_state: userDataCache.activeState
    }).eq('id', currentUser.id);
};



// ==============================================================================
// 10. HIỂN THỊ DANH SÁCH ĐỀ THI TẠI TRANG CHỦ
// ==============================================================================

window.showHome = (force = false) => {
    if (!force && userDataCache.activeExam && sessionStorage.getItem('thpt_in_exam') === 'true') {
        window.startExam(userDataCache.activeExam, 'continue');
        return;
    }
    
    document.getElementById('header-timer-box').style.display = 'none';
    document.getElementById('btn-exit-exam').style.display = 'none';
    document.getElementById('header-user-info').style.display = window.innerWidth <= 767 ? 'none' : 'flex';
    document.getElementById('hamburger-btn').style.display = window.innerWidth <= 767 ? 'block' : 'none';
    
    document.getElementById('home-screen').style.display = 'block';
    document.getElementById('exam-workspace').style.display = 'none';
    
    currentExam = null;
    renderHome();
};

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

function renderHome() {
    const listEl = document.getElementById('exam-list');
    listEl.innerHTML = '';
    
    const filteredExams = EXAM_DATABASE.filter(ex => {
        return (ex.cohort === currentCohortFilter) &&
               (currentCategoryFilter === 'all' || ex.category === currentCategoryFilter) &&
               (ex.title.toLowerCase().includes(currentSearchQuery));
    });
    
    if (filteredExams.length === 0) {
        listEl.innerHTML = `<div class="empty-state">❌ Chưa có đề thi nào cho mục này. Hệ thống đang cập nhật thêm!</div>`;
        return;
    }
    
    filteredExams.forEach(ex => {
        let historyData = userDataCache.history[ex.id] || [];
        let tagText = ex.tag;
        let tagColor = "";
        let scoreHtml = "";
        let actionsHtml = `<button class="start-btn" onclick="window.startExam('${ex.id}', 'new')">Vào thi ngay</button>`;
        
        if (historyData.length > 0) {
            const lastAttempt = historyData[historyData.length - 1];
            tagText = `Đã làm ${historyData.length}/10 lần`;
            tagColor = "background:#d1fae5;color:#059669;";
            scoreHtml = `<div class="score-badge">${lastAttempt.score.toFixed(2)} đ</div>`;
            actionsHtml = `<div class="action-buttons">
                               ${historyData.length < 10 ? `<button class="btn-retake" onclick="window.startExam('${ex.id}', 'retake')">Làm lại</button>` : ''}
                               <button class="btn-history" onclick="window.showHistory('${ex.id}')">Lịch sử</button>
                           </div>`;
        } else if (userDataCache.activeExam === ex.id) {
            tagText = "Đang làm dở...";
            tagColor = "background:#fef08a;color:#ca8a04;";
            actionsHtml = `<button class="start-btn" onclick="window.startExam('${ex.id}', 'continue')" style="background:#ca8a04;">Tiếp tục</button>`;
        }
        
        let catLabel = ex.category === 'so' ? '🏛️ Đề Sở/Tỉnh' : ex.category === 'chuyen' ? '🏆 Trường Chuyên' : '🎯 Luyện Kỹ Năng';
        
        listEl.innerHTML += `
            <div class="exam-card">
                ${scoreHtml}
                <div class="exam-tag" style="${tagColor}">${tagText}</div>
                <div class="exam-title">${ex.title}</div>
                <div class="exam-meta">
                    <span>🕒 ${ex.timeMinutes}p</span>
                    <span>${catLabel}</span>
                </div>
                ${actionsHtml}
            </div>
        `;
    });
}



// ==============================================================================
// 11. QUẢN LÝ PHÒNG THI & HIỂN THỊ FILE PDF
// ==============================================================================

async function loadPdfToCanvas(pdfUrl) {
    window.showLoader("Đang tải đề thi ra màn hình...");
    
    const scrollContent = document.getElementById('pdf-scroll-content');
    const staticLayer = document.getElementById('static-layer');
    const drawLayer = document.getElementById('draw-layer');
    
    Array.from(scrollContent.children).forEach(child => {
        if (child.id !== 'draw-layer' && child.id !== 'static-layer') child.remove();
    });
    
    strokes = [];
    
    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        let totalHeight = 0, maxWidth = 0;
        
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
            if (viewport.width > maxWidth) maxWidth = viewport.width;
        }
        
        originalPdfWidth = maxWidth;
        originalPdfHeight = totalHeight;
        
        staticLayer.width = maxWidth;
        staticLayer.height = totalHeight;
        drawLayer.width = maxWidth;
        drawLayer.height = totalHeight;
        
        redrawStaticCanvas();
        window.hideLoader();
        
        let initZ = 1;
        const wrapper = document.getElementById('pdf-render-wrapper');
        if (window.innerWidth <= 1024) {
            initZ = wrapper.clientWidth / maxWidth;
            if (initZ > 1) initZ = 1;
        }
        window.changeZoom(initZ, true);
        setTool('none');
        
    } catch (error) {
        alert("Không thể tải file PDF từ đường dẫn: " + pdfUrl + ". Vui lòng kiểm tra lại!");
        window.hideLoader();
    }
}

window.startExam = async (eId, mode, attIdx = null) => {
    document.getElementById('right-panel-drawer').classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('show');
    document.getElementById('drawer-backdrop').style.display = 'none';
    
    if (mode === 'review') {
        const idx = attIdx !== null ? attIdx : (userDataCache.history[eId].length - 1);
        sessionStorage.setItem('thpt_review_state', JSON.stringify({id: eId, idx: idx}));
        sessionStorage.removeItem('thpt_in_exam');
    } else {
        sessionStorage.setItem('thpt_in_exam', 'true');
        sessionStorage.removeItem('thpt_review_state');
    }
    
    currentExam = EXAM_DATABASE.find(e => e.id === eId);
    isReviewMode = (mode === 'review');
    isSubmitted = isReviewMode;
    
    if (mode === 'retake') userDataCache.activeState = null;
    
    if (!isReviewMode) {
        userDataCache.activeExam = eId;
        await supabase.from('user_profiles').update({ active_exam: eId }).eq('id', currentUser.id);
    }
    
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('exam-workspace').style.display = 'flex';
    document.getElementById('header-timer-box').style.display = isReviewMode ? 'none' : 'flex';
    document.getElementById('control-header').style.display = isReviewMode ? 'none' : 'flex';
    document.getElementById('btn-exit-exam').style.display = 'block';
    document.getElementById('btn-exit-exam').innerText = isReviewMode ? "Về trang chủ" : "Thoát Đề";
    document.getElementById('header-user-info').style.display = 'none';
    document.getElementById('hamburger-btn').style.display = 'none';
    
    document.getElementById('summary-screen').style.display = 'none';
    document.getElementById('sheets-container').style.display = 'block';
    document.getElementById('btn-back-summary').style.display = 'none';
    document.getElementById('current-exam-name').innerText = currentExam.title;
    totalTime = currentExam.timeMinutes * 60;
    
    window.initAnswerSheets();
    await loadPdfToCanvas(currentExam.pdfUrl);
    
    if (isReviewMode) {
        const historyData = userDataCache.history[eId];
        const idx = attIdx !== null ? attIdx : (historyData.length - 1);
        
        fillAnswers(historyData[idx].answers);
        runGradingLogic(historyData[idx].answers, idx + 1);
        
        document.getElementById('toolbar-wrapper').style.display = 'none';
        document.getElementById('zoom-controls').style.display = 'flex';
    } 
    else {
        document.getElementById('toolbar-wrapper').style.display = 'block';
        document.getElementById('zoom-controls').style.display = 'flex';
        document.getElementById('toolbar-wrapper').classList.remove('hidden');
        document.getElementById('pdf-render-wrapper').classList.remove('toolbar-closed');
        
        if (mode === 'continue' && userDataCache.activeState) {
            totalTime = userDataCache.activeState.timeLeft;
            fillAnswers(userDataCache.activeState.answers);
        }
        startTimer();
    }
};

window.goHome = () => {
    sessionStorage.removeItem('thpt_in_exam');
    sessionStorage.removeItem('thpt_review_state');
    clearInterval(timerInterval);
    window.showHome(true);
};



// ==============================================================================
// 12. HỆ THỐNG PHIẾU ĐIỀN ĐÁP ÁN (DỰA VÀO CẤU TRÚC 2025)
// ==============================================================================

window.initAnswerSheets = () => {
    const container = document.getElementById('sheets-container');
    container.innerHTML = '';
    let htmlContent = '';
    
    // PHẦN I
    htmlContent += `<div class="section-title">PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</div><div class="mcq-grid">`;
    for(let i = 1; i <= 12; i++) {
        htmlContent += `<div class="q-compact-row"><div class="q-compact-num">Câu ${i}</div><div class="mcq-options compact">`;
        ['A', 'B', 'C', 'D'].forEach(option => {
            htmlContent += `<label class="mcq-label"><input type="radio" name="ans_P1_${i}" value="${option}"><span class="mcq-box round">${option}</span></label>`;
        });
        htmlContent += `</div><div class="result-feedback" id="feedback_P1_${i}"></div></div>`;
    }
    
    // PHẦN II
    htmlContent += `</div><div class="section-title">PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI</div><div class="tf-grid-compact">`;
    for(let i = 1; i <= 4; i++) {
        htmlContent += `<div class="q-compact-row tf-block"><div class="q-compact-num" style="width:100%; margin-bottom:5px;">Câu ${i}</div><div class="tf-items">`;
        ['a', 'b', 'c', 'd'].forEach(subQ => {
            htmlContent += `<div class="tf-item-row"><span class="tf-item-label">${subQ})</span>
                            <div>
                                <label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="T"><span class="tf-box small true-box">Đ</span></label>
                                <label class="tf-label"><input type="radio" name="ans_P2_${i}${subQ}" value="F"><span class="tf-box small false-box">S</span></label>
                            </div></div>`;
        });
        htmlContent += `</div><div class="result-feedback" id="feedback_P2_${i}"></div></div>`;
    }
    
    // PHẦN III
    htmlContent += `</div><div class="section-title">PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</div><div class="short-grid">`;
    for(let i = 1; i <= 6; i++) {
        htmlContent += `<div class="q-compact-row short-block"><div class="q-compact-num">Câu ${i}</div><input type="text" id="ans_P3_${i}" class="short-answer-input compact" placeholder="Nhập Đ.Án" autocomplete="off"><div class="result-feedback" id="feedback_P3_${i}"></div></div>`;
    }
    
    htmlContent += `</div>`;
    container.innerHTML = htmlContent;
};

window.viewDetailedAnswers = () => {
    document.getElementById('summary-screen').style.display = 'none';
    document.getElementById('sheets-container').style.display = 'block';
    document.getElementById('btn-back-summary').style.display = 'flex';
};

window.backToSummary = () => {
    document.getElementById('sheets-container').style.display = 'none';
    document.getElementById('btn-back-summary').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'block';
};



// ==============================================================================
// 13. LOGIC ĐẾM GIỜ VÀ CHẤM ĐIỂM
// ==============================================================================

function getAllCurrentAnswers() {
    const ans = {};
    document.querySelectorAll('input[type="radio"]:checked').forEach(el => ans[el.name] = el.value);
    document.querySelectorAll('input[type="text"]').forEach(el => {
        if (el.value.trim() !== '') ans[el.id] = el.value.trim();
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

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (totalTime <= 0) {
            clearInterval(timerInterval);
            alert("Đã hết thời gian làm bài! Hệ thống sẽ tự động thu bài và chấm điểm.");
            window.submitAndGrade();
            return;
        }
        
        totalTime--;
        const m = Math.floor(totalTime / 60).toString().padStart(2, '0');
        const s = (totalTime % 60).toString().padStart(2, '0');
        document.getElementById('global-timer').innerText = `${m}:${s}`;
        
        if (totalTime % 5 === 0) window.saveProgress();
    }, 1000);
}

window.submitAndGrade = async () => {
    sessionStorage.removeItem('thpt_in_exam');
    clearInterval(timerInterval);
    isSubmitted = true;
    
    const panel = document.getElementById('right-panel-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    panel.classList.add('open');
    backdrop.style.display = 'block';
    setTimeout(() => backdrop.classList.add('show'), 10);
    
    const ans = getAllCurrentAnswers();
    const score = runGradingLogic(ans);
    const id = currentExam.id;
    const hist = userDataCache.history;
    
    if (!hist[id]) hist[id] = [];
    
    const d = new Date();
    const ds = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    
    hist[id].push({score: score, answers: ans, date: ds});
    sessionStorage.setItem('thpt_review_state', JSON.stringify({id: id, idx: hist[id].length - 1}));
    
    userDataCache.activeExam = null;
    userDataCache.activeState = null;
    
    await supabase.from('user_profiles').update({ history: hist, active_exam: null, active_state: null }).eq('id', currentUser.id);
};

function runGradingLogic(ans, attempt = null) {
    document.getElementById('control-header').style.display = 'none';
    document.getElementById('header-timer-box').style.display = 'none';
    
    let totalScore = 0;
    const keys = currentExam.keys;
    let p1_correct = 0, p2_score = 0, p3_correct = 0;
    
    for (let i = 1; i <= 12; i++) {
        const box = document.getElementById(`feedback_P1_${i}`).closest('.q-compact-row');
        if (ans[`ans_P1_${i}`] === keys.P1[i]) {
            p1_correct++;
            box.classList.add('correct-bg');
        } else {
            box.classList.add('wrong-bg');
            document.getElementById(`feedback_P1_${i}`).innerHTML = `<span class="correct-text">🎯 ${keys.P1[i]}</span>`;
        }
    }
    totalScore += p1_correct * 0.25;
    
    for (let i = 1; i <= 4; i++) {
        let opts = 0;
        ['a', 'b', 'c', 'd'].forEach(o => {
            if (ans[`ans_P2_${i}${o}`] === keys.P2[i][o]) opts++;
        });
        
        let pts = opts === 1 ? 0.1 : opts === 2 ? 0.25 : opts === 3 ? 0.5 : opts === 4 ? 1 : 0;
        p2_score += pts;
        
        const box = document.getElementById(`feedback_P2_${i}`).closest('.q-compact-row');
        if (opts === 4) box.classList.add('correct-bg');
        else {
            box.classList.add('wrong-bg');
            const kv = keys.P2[i];
            document.getElementById(`feedback_P2_${i}`).innerHTML = `<span class="correct-text">🎯 a)${kv.a === 'T' ? 'Đ' : 'S'} b)${kv.b === 'T' ? 'Đ' : 'S'} c)${kv.c === 'T' ? 'Đ' : 'S'} d)${kv.d === 'T' ? 'Đ' : 'S'} (+${pts}đ)</span>`;
        }
    }
    totalScore += p2_score;
    
    for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`feedback_P3_${i}`).closest('.q-compact-row');
        if ((ans[`ans_P3_${i}`] || '').trim() === String(keys.P3[i])) {
            p3_correct++;
            box.classList.add('correct-bg');
        } else {
            box.classList.add('wrong-bg');
            document.getElementById(`feedback_P3_${i}`).innerHTML = `<span class="correct-text">🎯 ${keys.P3[i]}</span>`;
        }
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



// ==============================================================================
// 14. HỘP THOẠI CẢNH BÁO (MODALS) VÀ XEM LỊCH SỬ THI
// ==============================================================================

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
    
    historyData.forEach((a, i) => {
        listContainer.innerHTML += `
            <div class="history-item">
                <div class="history-info">
                    <span class="h-attempt">Lần ${i + 1}</span>
                    <span class="h-date">${a.date}</span>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="h-score">${a.score.toFixed(2)}</span>
                    <button class="btn-review-sm" onclick="window.closeModal(); window.startExam('${eId}', 'review', ${i})">Xem</button>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML += `<button class="btn-cancel" style="width:100%; margin-top:10px;" onclick="window.closeModal()">Đóng</button>`;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
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
        msg.innerText = "Hệ thống sẽ tự động lưu lại quá trình làm bài. Bạn có chắc chắn muốn thoát?";
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
        msg.innerText = "Bạn chắc chắn muốn xóa toàn bộ nét vẽ và dạ quang trên màn hình?";
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
    setTimeout(() => modal.classList.add('show'), 10);
};

window.closeModal = () => {
    const m = document.getElementById('custom-modal');
    m.classList.remove('show');
    setTimeout(() => m.style.display = 'none', 300);
};

window.confirmAction = () => {
    if (pendingAction) pendingAction();
    window.closeModal();
};



// ==============================================================================
// 15. HỆ THỐNG ZOOM (TO/NHỎ ĐỀ THI) BẰNG CHUỘT VÀ CẢM ỨNG
// ==============================================================================

let currentZoom = 1;

window.changeZoom = (amount, isAbsolute = false) => {
    if (!originalPdfWidth) return;
    
    if (isAbsolute) currentZoom = amount;
    else currentZoom += amount;
    
    if (currentZoom < 0.2) currentZoom = 0.2;
    if (currentZoom > 5.0) currentZoom = 5.0;
    
    const scaledWidth = originalPdfWidth * currentZoom;
    const scaledHeight = originalPdfHeight * currentZoom;
    
    const content = document.getElementById('pdf-scroll-content');
    content.style.transform = `scale(${currentZoom})`;
    
    const container = document.getElementById('pdf-zoom-container');
    container.style.width = scaledWidth + 'px';
    container.style.height = scaledHeight + 'px';
    
    const wrapper = document.getElementById('pdf-render-wrapper');
    if (scaledWidth < wrapper.clientWidth - 40) {
        container.style.marginLeft = ((wrapper.clientWidth - scaledWidth) / 2) + 'px';
    } else {
        container.style.marginLeft = '20px';
    }
    
    const zoomText = document.getElementById('zoom-text');
    if (zoomText) zoomText.innerText = Math.round(currentZoom * 100) + '%';
};

window.addEventListener('resize', () => {
    if (document.getElementById('exam-workspace').style.display === 'flex' && originalPdfWidth) {
        window.changeZoom(0);
    } else if (document.getElementById('home-screen').style.display === 'block') {
        document.getElementById('hamburger-btn').style.display = window.innerWidth <= 767 ? 'block' : 'none';
        document.getElementById('header-user-info').style.display = window.innerWidth <= 767 ? 'none' : 'flex';
    }
});

document.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        if (document.getElementById('exam-workspace').style.display === 'flex') {
            if (e.deltaY < 0) window.changeZoom(0.05);
            else window.changeZoom(-0.05);
        }
    }
}, { passive: false });

const pdfWrapper = document.getElementById('pdf-render-wrapper');
let initDist = 0, initZoom = 1, pinchCenter = null;

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



// ==============================================================================
// 16. HỆ THỐNG VẼ NÉT TRỰC TIẾP LÊN FILE PDF LÚC LÀM BÀI
// ==============================================================================

const staticLayer = document.getElementById('static-layer');
const staticCtx = staticLayer.getContext('2d', { desynchronized: true });
const drawLayer = document.getElementById('draw-layer');
const drawCtx = drawLayer.getContext('2d', { desynchronized: true });

let strokes = [], currentStroke = null, isDrawing = false, activeTool = 'none', brushColor = '#0f172a', brushSize = 3;

window.toggleToolbar = () => {
    document.getElementById('toolbar-wrapper').classList.toggle('hidden');
    document.getElementById('pdf-render-wrapper').classList.toggle('toolbar-closed');
};

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
        document.getElementById('tool-pan')?.classList.add('active');
        drawLayer.style.pointerEvents = 'none';
        document.getElementById('pdf-render-wrapper').style.cursor = 'grab';
        document.getElementById('color-palette').style.opacity = '0.3';
        document.getElementById('color-palette').style.pointerEvents = 'none';
    } else {
        drawLayer.style.pointerEvents = 'auto';
        document.getElementById('color-palette').style.opacity = '1';
        document.getElementById('color-palette').style.pointerEvents = 'auto';
        
        if (tool === 'pen') {
            document.getElementById('tool-pen').classList.add('active');
            brushSize = 3; document.getElementById('brush-size').value = 3;
        } else if (tool === 'highlighter') {
            document.getElementById('tool-highlighter').classList.add('active');
            brushSize = 15; document.getElementById('brush-size').value = 15;
        } else if (tool === 'eraser') {
            document.getElementById('tool-eraser').classList.add('eraser-active');
            brushSize = 25; document.getElementById('brush-size').value = 25;
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

document.getElementById('brush-size').addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    updateBrushStyle();
});

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        if (['eraser','pan','none'].includes(activeTool)) setTool('pen');
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
    
    if (activeTool === 'eraser') drawSingleStroke(staticCtx, currentStroke);
    else drawSingleStroke(drawCtx, currentStroke);
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
drawLayer.addEventListener('touchstart', (e) => { if (e.touches.length === 1 && activeTool !== 'none') beginDraw(e); }, {passive: false});
drawLayer.addEventListener('touchmove', (e) => { if (e.touches.length === 1 && activeTool !== 'none') strokeDraw(e); }, {passive: false});
window.addEventListener('touchend', endDraw);

document.getElementById('btn-undo').addEventListener('click', () => {
    if (strokes.length > 0) {
        strokes.pop();
        redrawStaticCanvas();
    }
});

document.getElementById('btn-clear-canvas').addEventListener('click', () => {
    window.openModal('clear_canvas');
});
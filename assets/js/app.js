/**
 * app.js - منصة سول ميديا (Soul Media) للدعوات الإلكترونية وتذاكر الدخول الذكية
 * حقوق التطوير والتصميم: Soul Media
 */

document.addEventListener('DOMContentLoaded', () => {
  initStore();
  setupAuth();
  setupNavigation();
  setupSearchAndFilters();
  setupLivePreview();
  setupCreateForm();
  setupEditForm();
  setupTransferSection();
  setupSettingsAndTheme();
  setupModals();
});

// متغير لحالة العرض الحالية (عرض شبكة البطاقات أو عرض الجدول)
let currentInvitationsViewMode = 'grid'; // 'grid' or 'table'
let currentActiveView = 'dashboard';
let currentSelectedInvitationId = null;

// ===================================================
// 1. إدارة المصادقة وجلسة الدخول
// ===================================================
function setupAuth() {
  const loginForm = document.getElementById('system-login-form');
  const errorAlert = document.getElementById('login-error-alert');
  const logoutBtn = document.getElementById('btn-logout-sidebar');
  const togglePassBtn = document.getElementById('btn-toggle-password');
  const passInput = document.getElementById('login-password');
  const quickAhmedBtn = document.getElementById('btn-quick-login-ahmed');
  const quickAdminBtn = document.getElementById('btn-quick-login-admin');

  // استرجاع اسم المستخدم المحفوظ إن وجد
  const savedUser = localStorage.getItem('grad_real_remembered_username_v4');
  const usernameInput = document.getElementById('login-username');
  if (savedUser && usernameInput) {
    usernameInput.value = savedUser;
  }

  // إظهار / إخفاء كلمة المرور
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    });
  }

  // أزرار الدخول السريع التجريبي
  if (quickAhmedBtn) {
    quickAhmedBtn.addEventListener('click', async () => {
      if (usernameInput) usernameInput.value = 'ahmed';
      if (passInput) passInput.value = '123456';
      await performLogin('ahmed', '123456', true);
    });
  }

  if (quickAdminBtn) {
    quickAdminBtn.addEventListener('click', async () => {
      if (usernameInput) usernameInput.value = 'admin';
      if (passInput) passInput.value = 'admin123';
      await performLogin('admin', 'admin123', true);
    });
  }

  // تقديم نموذج الدخول
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = usernameInput ? usernameInput.value.trim() : '';
      const p = passInput ? passInput.value.trim() : '';
      const rem = document.getElementById('login-remember')?.checked ?? true;
      await performLogin(u, p, rem);
    });
  }

  // زر تسجيل الخروج
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('هل ترغب بتسجيل الخروج من المنصة؟')) {
        logoutUser();
        updateAuthUI();
      }
    });
  }

  updateAuthUI();
}

async function performLogin(username, password, remember) {
  const errorAlert = document.getElementById('login-error-alert');
  const submitBtn = document.getElementById('btn-login-submit');

  if (errorAlert) errorAlert.classList.add('hidden');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin ml-2"></i><span>جاري التحقق...</span>';
  }

  try {
    const res = await loginUser(username, password, remember);
    if (res.success) {
      updateAuthUI();
      switchView('dashboard');
    } else {
      if (errorAlert) {
        errorAlert.textContent = res.message || 'بيانات الدخول غير صحيحة';
        errorAlert.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error(err);
    if (errorAlert) {
      errorAlert.textContent = 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة ثانية';
      errorAlert.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket ml-2"></i><span>تسجيل الدخول</span>';
    }
  }
}

function updateAuthUI() {
  const loginContainer = document.getElementById('login-container');
  const mainAppContainer = document.getElementById('main-app-container');
  const user = getCurrentUser();

  if (user) {
    loginContainer?.classList.add('hidden');
    mainAppContainer?.classList.remove('hidden');

    // تحديث بيانات المستخدم في الترويسة والقائمة
    const avatarEl = document.getElementById('user-avatar-circle');
    const nameEl = document.getElementById('sidebar-user-name');
    const bannerNameEl = document.getElementById('banner-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const gradField = document.getElementById('field-create-grad-name');

    if (avatarEl) avatarEl.textContent = user.initials || 'أح';
    if (nameEl) nameEl.textContent = user.name || 'أحمد محمد علي';
    if (bannerNameEl) bannerNameEl.textContent = user.name || 'أحمد محمد علي';
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'مشرف النظام' : 'مستخدم عادي';
    if (gradField) gradField.value = user.name || 'أحمد محمد علي';

    // تحميل كافة البيانات
    renderDashboardData();
    renderInvitations();
    renderTransfersSection();
    renderEventsTable();
    renderUsersTable();
  } else {
    loginContainer?.classList.remove('hidden');
    mainAppContainer?.classList.add('hidden');
  }
}

// ===================================================
// 2. إدارة التنقل بين الشاشات والواجهات (Navigation)
// ===================================================
function setupNavigation() {
  const views = [
    { navId: 'nav-dashboard', mobileId: 'mobile-nav-dashboard', viewId: 'view-dashboard', name: 'dashboard' },
    { navId: 'nav-invitations', mobileId: 'mobile-nav-invitations', viewId: 'view-invitations', name: 'invitations' },
    { navId: 'nav-create', mobileId: 'mobile-nav-create', viewId: 'view-create', name: 'create' },
    { navId: 'nav-transfer', mobileId: 'mobile-nav-transfer', viewId: 'view-transfer', name: 'transfer' },
    { navId: 'nav-events', mobileId: null, viewId: 'view-events', name: 'events' },
    { navId: 'nav-users', mobileId: null, viewId: 'view-users', name: 'users' },
    { navId: 'nav-settings', mobileId: null, viewId: 'view-settings', name: 'settings' }
  ];

  views.forEach(v => {
    const desktopBtn = document.getElementById(v.navId);
    if (desktopBtn) {
      desktopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(v.name);
        closeMobileSidebar();
      });
    }

    if (v.mobileId) {
      const mobileBtn = document.getElementById(v.mobileId);
      if (mobileBtn) {
        mobileBtn.addEventListener('click', (e) => {
          e.preventDefault();
          switchView(v.name);
        });
      }
    }
  });

  // أزرار سريعة داخل الشاشات
  document.getElementById('btn-goto-create')?.addEventListener('click', () => switchView('create'));
  document.getElementById('btn-empty-create')?.addEventListener('click', () => switchView('create'));
  document.getElementById('btn-dash-quick-create')?.addEventListener('click', () => switchView('create'));
  document.getElementById('btn-goto-transfer')?.addEventListener('click', () => switchView('transfer'));
  document.getElementById('btn-dash-view-all-invs')?.addEventListener('click', () => switchView('invitations'));
  document.getElementById('btn-back-from-create')?.addEventListener('click', () => switchView('invitations'));
  document.getElementById('btn-cancel-create')?.addEventListener('click', () => switchView('invitations'));
  document.getElementById('btn-back-from-details')?.addEventListener('click', () => switchView('invitations'));
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => switchView('invitations'));

  // إدارة القائمة الجانبية في شاشات الجوال
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const closeSidebarBtn = document.getElementById('btn-close-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const sidebar = document.getElementById('app-sidebar');

  if (mobileMenuBtn && sidebar && sidebarBackdrop) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarBackdrop.classList.add('active');
    });
  }

  if (closeSidebarBtn && sidebar && sidebarBackdrop) {
    closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
}

function switchView(viewName) {
  currentActiveView = viewName;

  const viewElements = {
    dashboard: document.getElementById('view-dashboard'),
    invitations: document.getElementById('view-invitations'),
    create: document.getElementById('view-create'),
    edit: document.getElementById('view-edit'),
    details: document.getElementById('view-details'),
    transfer: document.getElementById('view-transfer'),
    events: document.getElementById('view-events'),
    users: document.getElementById('view-users'),
    settings: document.getElementById('view-settings')
  };

  // إخفاء كافة الشاشات
  Object.values(viewElements).forEach(el => {
    if (el) el.classList.add('hidden');
  });

  // إظهار الشاشة المطلوبة
  if (viewElements[viewName]) {
    viewElements[viewName].classList.remove('hidden');
  }

  // تحديث حالة الأزرار في القائمة الجانبية والشريط السفلي
  const navMap = {
    dashboard: 'nav-dashboard',
    invitations: 'nav-invitations',
    create: 'nav-create',
    transfer: 'nav-transfer',
    events: 'nav-events',
    users: 'nav-users',
    settings: 'nav-settings'
  };

  const mobileNavMap = {
    dashboard: 'mobile-nav-dashboard',
    invitations: 'mobile-nav-invitations',
    create: 'mobile-nav-create',
    transfer: 'mobile-nav-transfer'
  };

  document.querySelectorAll('.sidebar-container .nav-link').forEach(link => link.classList.remove('active'));
  if (navMap[viewName]) {
    document.getElementById(navMap[viewName])?.classList.add('active');
  }

  document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item').forEach(link => link.classList.remove('active'));
  if (mobileNavMap[viewName]) {
    document.getElementById(mobileNavMap[viewName])?.classList.add('active');
  }

  // تحديث البيانات إذا تم التبديل إلى الشاشات المحددة
  if (viewName === 'dashboard') renderDashboardData();
  if (viewName === 'invitations') renderInvitations();
  if (viewName === 'create') updateLivePreview();
  if (viewName === 'transfer') renderTransfersSection();
  if (viewName === 'events') renderEventsTable();
  if (viewName === 'users') renderUsersTable();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================================
// 3. لوحة التحكم الرئيسية (Dashboard Rendering)
// ===================================================
function renderDashboardData() {
  const invitations = getInvitations();
  const user = getCurrentUser();

  // إحصائيات الدعوات
  const total = invitations.length || 0;
  const accepted = invitations.filter(i => (i.invitationState === 'مقبولة' || i.status === 'صالحة' || i.isUsed)).length || 0;
  const pending = invitations.filter(i => i.invitationState === 'قيد الانتظار').length || 0;
  const declined = invitations.filter(i => i.invitationState === 'معتذر').length || 0;
  
  // الكوتا المتبقية
  const totalQuota = (user && user.regularQuota) ? user.regularQuota : 200;
  const remaining = Math.max(0, totalQuota - total);

  // تحديث البطاقات الـ 5 المعتمدة
  const elTotal = document.getElementById('dash-stat-total');
  const elAccepted = document.getElementById('dash-stat-accepted');
  const elPending = document.getElementById('dash-stat-pending');
  const elDeclined = document.getElementById('dash-stat-declined');
  const elRemaining = document.getElementById('dash-stat-remaining');

  if (elTotal) elTotal.textContent = total > 0 ? total : '200';
  if (elAccepted) elAccepted.textContent = accepted > 0 ? accepted : '160';
  if (elPending) elPending.textContent = pending > 0 ? pending : '20';
  if (elDeclined) elDeclined.textContent = declined > 0 ? declined : '80';
  if (elRemaining) elRemaining.textContent = remaining > 0 ? remaining : '120';

  // تحديث الرسم البياني الدائري (Donut Chart 40%)
  const percentage = total > 0 ? Math.round((accepted / total) * 100) : 40;
  const percentText = document.getElementById('dash-donut-percent');
  const donutCircle = document.getElementById('dash-donut-circle');
  if (percentText) percentText.textContent = `${percentage}%`;
  if (donutCircle) {
    // محيط الدائرة = 2 * PI * r = 2 * 3.14159 * 40 = 251.3
    const circumference = 251.3;
    const offset = circumference - (circumference * percentage) / 100;
    donutCircle.style.strokeDashoffset = offset;
  }

  // تحديث قائمة "آخر الدعوات المرسلة" مع أشرطة التقدم
  renderRecentInvitationsList(invitations);
}

function renderRecentInvitationsList(invitations) {
  const container = document.getElementById('dash-recent-invitations-list');
  if (!container) return;

  const displayList = invitations.slice(0, 4);
  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-xs text-slate-400">
        <i class="fa-regular fa-envelope text-lg block mb-1 text-slate-300"></i>
        لم يتم إرسال أي دعوات حتى الآن.
      </div>
    `;
    return;
  }

  container.innerHTML = displayList.map(inv => {
    const isAccepted = inv.invitationState === 'مقبولة' || inv.status === 'صالحة';
    const isPending = inv.invitationState === 'قيد الانتظار';
    const stateBadge = isAccepted
      ? '<span class="badge-pill badge-pill-green">نشطة</span>'
      : (isPending ? '<span class="badge-pill badge-pill-cyan">قيد الانتظار</span>' : '<span class="badge-pill badge-pill-amber">معتذر</span>');

    const progressWidth = isAccepted ? '85%' : (isPending ? '45%' : '15%');
    const progressBarColor = isAccepted ? 'bg-purple-600' : (isPending ? 'bg-indigo-500' : 'bg-amber-500');

    return `
      <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            <i class="fa-regular fa-envelope"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-800 text-xs">${escapeHtml(inv.event || 'مناسبة عامة')}</h4>
              ${stateBadge}
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 font-medium">المدعو: <strong class="text-slate-700">${escapeHtml(inv.guestName)}</strong> (${inv.peopleCount || 1} مقعد)</p>
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-48">
          <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div class="${progressBarColor} h-full rounded-full transition-all duration-500" style="width: ${progressWidth};"></div>
          </div>
          <button onclick="viewInvitationDetails('${inv.id}')" class="text-xs text-purple-600 font-bold hover:underline flex-shrink-0">
            عرض
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ===================================================
// 4. صفحة "دعواتي" (My Invitations) - شبكة الكروت والجدول
// ===================================================
function setupSearchAndFilters() {
  const searchInput = document.getElementById('filter-search-input');
  const headerSearchInput = document.getElementById('header-search-input');
  const eventSelect = document.getElementById('filter-event-select');
  const typeSelect = document.getElementById('filter-type-select');
  const statusSelect = document.getElementById('filter-status-select');

  const btnGrid = document.getElementById('btn-view-mode-grid');
  const btnTable = document.getElementById('btn-view-mode-table');

  const triggerFilter = () => renderInvitations();

  if (searchInput) searchInput.addEventListener('input', triggerFilter);
  if (headerSearchInput) {
    headerSearchInput.addEventListener('input', (e) => {
      if (currentActiveView !== 'invitations') switchView('invitations');
      if (searchInput) searchInput.value = e.target.value;
      triggerFilter();
    });
  }

  if (eventSelect) eventSelect.addEventListener('change', triggerFilter);
  if (typeSelect) typeSelect.addEventListener('change', triggerFilter);
  if (statusSelect) statusSelect.addEventListener('change', triggerFilter);

  // تبديل العرض بين الكروت والجدول
  if (btnGrid && btnTable) {
    btnGrid.addEventListener('click', () => {
      currentInvitationsViewMode = 'grid';
      btnGrid.className = 'w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xs transition font-bold';
      btnTable.className = 'w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs transition';
      renderInvitations();
    });

    btnTable.addEventListener('click', () => {
      currentInvitationsViewMode = 'table';
      btnTable.className = 'w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xs transition font-bold';
      btnGrid.className = 'w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs transition';
      renderInvitations();
    });
  }

  // ملء قائمة الفعاليات
  populateEventFilterOptions();
}

function populateEventFilterOptions() {
  const select = document.getElementById('filter-event-select');
  if (!select) return;

  const events = getEventsList();
  select.innerHTML = '<option value="الكل">جميع الفعاليات</option>';
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.name;
    opt.textContent = ev.name;
    select.appendChild(opt);
  });
}

function renderInvitations() {
  const invitations = getInvitations();
  const search = (document.getElementById('filter-search-input')?.value || '').trim().toLowerCase();
  const filterEvent = document.getElementById('filter-event-select')?.value || 'الكل';
  const filterType = document.getElementById('filter-type-select')?.value || 'الكل';
  const filterStatus = document.getElementById('filter-status-select')?.value || 'الكل';

  const gridContainer = document.getElementById('invitations-cards-grid');
  const tableContainer = document.getElementById('invitations-table-container');
  const tableBody = document.getElementById('invitations-table-body');
  const emptyState = document.getElementById('invitations-empty-state');

  // تصفية النتائج
  const filtered = invitations.filter(inv => {
    if (search) {
      const matchName = (inv.guestName || '').toLowerCase().includes(search);
      const matchPhone = (inv.guestPhone || '').toLowerCase().includes(search);
      const matchCode = (inv.code || inv.id || '').toLowerCase().includes(search);
      const matchEvent = (inv.event || '').toLowerCase().includes(search);
      if (!matchName && !matchPhone && !matchCode && !matchEvent) return false;
    }

    if (filterEvent !== 'الكل' && inv.event !== filterEvent) return false;
    if (filterType !== 'الكل' && inv.type !== filterType) return false;
    
    if (filterStatus !== 'الكل') {
      const state = inv.invitationState || (inv.status === 'صالحة' ? 'مقبولة' : 'معتذر');
      if (state !== filterStatus && inv.status !== filterStatus) return false;
    }

    return true;
  });

  // فحص الحالة الفارغة
  if (filtered.length === 0) {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  if (currentInvitationsViewMode === 'grid') {
    if (gridContainer) gridContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    renderInvitationsGrid(filtered, gridContainer);
  } else {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    renderInvitationsTable(filtered, tableBody);
  }
}

// عرض شبكة البطاقات (Cards Grid) المطابقة للشاشة رقم 3
function renderInvitationsGrid(items, container) {
  container.innerHTML = items.map(inv => {
    const isAccepted = inv.invitationState === 'مقبولة' || inv.status === 'صالحة';
    const stateBadge = isAccepted
      ? '<span class="badge-pill badge-pill-green">نشطة</span>'
      : '<span class="badge-pill badge-pill-purple">مكتملة</span>';

    const themeClass = inv.eventType === 'wedding' ? 'wedding-theme'
      : (inv.eventType === 'graduation' ? 'grad-theme'
      : (inv.eventType === 'birthday' ? 'birthday-theme' : 'private-theme'));

    const displayEvent = inv.event || 'حفل زفاف مبارك';
    const displayGuest = inv.guestName || 'ضيف كريم';
    const displayDate = inv.createdAt ? inv.createdAt.split(' ')[0] : '2026-10-15';

    const customThumbStyle = inv.customDesign 
      ? `style="background-image: linear-gradient(rgba(16, 11, 30, 0.25), rgba(16, 11, 30, 0.7)), url('${inv.customDesign}'); background-size: cover; background-position: center;"`
      : '';
    const customBadge = inv.customDesign 
      ? `<span class="badge-pill badge-pill-purple text-[9px]"><i class="fa-solid fa-palette text-[9px]"></i> مخصص</span>`
      : '';

    return `
      <div class="invitation-card-item">
        <!-- مصغر البطاقة الجرافيكي -->
        <div class="invitation-card-thumb ${themeClass}" ${customThumbStyle}>
          <div class="card-mini-watermark">
            <span class="text-[9px] uppercase tracking-widest text-purple-300 block mb-0.5">SOUL MEDIA</span>
            <h5 class="text-xs font-bold text-white truncate">${escapeHtml(displayEvent)}</h5>
            <p class="text-[10px] text-amber-200 mt-1 font-mono font-bold truncate">${escapeHtml(displayGuest)}</p>
          </div>
        </div>

        <!-- معلومات وتفاصيل البطاقة -->
        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <h4 class="font-bold text-slate-800 text-xs truncate">${escapeHtml(displayEvent)}</h4>
              <div class="flex items-center gap-1">${customBadge}${stateBadge}</div>
            </div>

            <div class="text-[11px] text-slate-500 space-y-1">
              <div class="flex items-center justify-between font-mono">
                <span><i class="fa-regular fa-calendar ml-1 text-slate-400"></i>${displayDate}</span>
                <span class="font-bold text-purple-700">${inv.type || 'عادية'}</span>
              </div>
              <p class="text-slate-600 truncate font-semibold">
                <i class="fa-regular fa-user ml-1 text-slate-400"></i>${escapeHtml(displayGuest)}
                <span class="text-slate-400 text-[10px]">(${inv.peopleCount || 1} مقعد)</span>
              </p>
            </div>
          </div>

          <!-- شريط أزرار الإجراءات المطابق للشاشة 3 -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
            <button onclick="viewInvitationDetails('${inv.id}')" class="btn-primary-soul text-[11px] py-1.5 px-3 flex-1 justify-center">
              <span>عرض</span>
            </button>

            <button onclick="editInvitation('${inv.id}')" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition" title="تعديل">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>

            <button onclick="shareInvitationDirect('${inv.id}')" class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs transition" title="مشاركة واتساب">
              <i class="fa-brands fa-whatsapp"></i>
            </button>

            <button onclick="deleteInvitationItem('${inv.id}')" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition" title="حذف">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// عرض قائمة الجدول (Table View)
function renderInvitationsTable(items, tbody) {
  if (!tbody) return;
  tbody.innerHTML = items.map(inv => {
    const isAccepted = inv.invitationState === 'مقبولة' || inv.status === 'صالحة';
    const stateBadge = isAccepted
      ? '<span class="badge-pill badge-pill-green">صالحة</span>'
      : '<span class="badge-pill badge-pill-purple">مكتملة</span>';

    return `
      <tr>
        <td class="font-mono font-bold text-purple-700">${escapeHtml(inv.code || inv.id)}</td>
        <td class="font-bold text-slate-900">${escapeHtml(inv.guestName)}</td>
        <td class="font-mono" dir="ltr">${escapeHtml(inv.guestPhone || '-')}</td>
        <td>${escapeHtml(inv.event || 'حفل زفاف')}</td>
        <td class="font-mono font-bold">${inv.peopleCount || 1}</td>
        <td><span class="badge-pill ${inv.type === 'VIP' ? 'badge-pill-amber' : 'badge-pill-purple'}">${inv.type || 'عادية'}</span></td>
        <td>${stateBadge}</td>
        <td class="text-center">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="viewInvitationDetails('${inv.id}')" class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100">عرض</button>
            <button onclick="editInvitation('${inv.id}')" class="p-1.5 text-slate-400 hover:text-slate-700"><i class="fa-regular fa-pen-to-square"></i></button>
            <button onclick="deleteInvitationItem('${inv.id}')" class="p-1.5 text-rose-400 hover:text-rose-600"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// متغيرات حفظ وتنسيق تصميم الدعوة المخصص المرفوع
let currentUploadedCustomDesign = null;
let currentUploadedCustomColor = '#1e1b2e'; // الافتراضي: كحلي داكن/أسود فخم يتطابق تماماً مع كروت البيج والأبيض
let editUploadedCustomDesign = null;
let editUploadedCustomColor = '#1e1b2e';

// ===================================================
// 5. المعاينة الحية الفورية للبطاقة (Live Preview Engine)
// ===================================================
function setupLivePreview() {
  const guestInput = document.getElementById('field-create-guest');
  const eventInput = document.getElementById('field-create-event');
  const dateInput = document.getElementById('field-create-date');
  const timeInput = document.getElementById('field-create-time');
  const venueInput = document.getElementById('field-create-venue');
  const typeSelect = document.getElementById('field-create-type');
  const eventTypeSelect = document.getElementById('field-create-event-type');

  // خيارات التصميم: الافتراضي أو رفع تصميم خاص
  const choiceDefault = document.getElementById('design-choice-default');
  const choiceCustom = document.getElementById('design-choice-custom');
  const labelDefault = document.getElementById('label-template-default');
  const labelCustom = document.getElementById('label-template-custom');
  const uploadBox = document.getElementById('custom-design-upload-box');
  const fileInput = document.getElementById('field-custom-design-file');
  const removeBtn = document.getElementById('btn-remove-custom-design');

  // أزرار ألوان خط التصميم المخصص
  const colorButtons = document.querySelectorAll('.btn-color-preset');
  const customColorPicker = document.getElementById('field-custom-color-picker');
  const customColorLabel = document.getElementById('custom-design-color-label');

  if (colorButtons && colorButtons.length > 0) {
    colorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        colorButtons.forEach(b => {
          b.classList.remove('active', 'border-purple-600', 'bg-purple-50/80');
          b.classList.add('border-slate-200', 'bg-white');
        });
        btn.classList.add('active', 'border-purple-600', 'bg-purple-50/80');
        btn.classList.remove('border-slate-200', 'bg-white');

        currentUploadedCustomColor = btn.getAttribute('data-color') || '#1e1b2e';
        if (customColorPicker) customColorPicker.value = currentUploadedCustomColor;
        if (customColorLabel) customColorLabel.textContent = currentUploadedCustomColor;
        updateLivePreview();
      });
    });
  }

  if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
      currentUploadedCustomColor = e.target.value;
      if (customColorLabel) customColorLabel.textContent = currentUploadedCustomColor;
      colorButtons.forEach(b => {
        b.classList.remove('active', 'border-purple-600', 'bg-purple-50/80');
        b.classList.add('border-slate-200', 'bg-white');
      });
      updateLivePreview();
    });
  }

  const inputs = [guestInput, eventInput, dateInput, timeInput, venueInput, typeSelect, eventTypeSelect];
  inputs.forEach(el => {
    if (el) {
      el.addEventListener('input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    }
  });

  // تغيير اسم المناسبة التلقائي عند تبديل نوع المناسبة
  if (eventTypeSelect && eventInput) {
    eventTypeSelect.addEventListener('change', (e) => {
      const map = {
        wedding: 'حفل زفاف أحمد & سارة',
        graduation: 'حفل التخرج 2026',
        birthday: 'عيد ميلاد مبارك',
        private: 'مناسبة خاصة واحتفال VIP'
      };
      eventInput.value = map[e.target.value] || 'حفل زفاف مبارك';
      updateLivePreview();
    });
  }

  // التبديل بين قالب سول ميديا ورفع تصميم خاص
  if (choiceDefault && choiceCustom) {
    choiceDefault.addEventListener('change', () => {
      if (choiceDefault.checked) {
        if (labelDefault) labelDefault.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-purple-600 bg-purple-50/60 cursor-pointer text-xs font-bold text-purple-900 transition';
        if (labelCustom) labelCustom.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 hover:border-purple-300 bg-white cursor-pointer text-xs font-bold text-slate-700 transition';
        if (uploadBox) uploadBox.classList.add('hidden');
        currentUploadedCustomDesign = null;
        updateLivePreview();
      }
    });

    choiceCustom.addEventListener('change', () => {
      if (choiceCustom.checked) {
        if (labelCustom) labelCustom.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-purple-600 bg-purple-50/60 cursor-pointer text-xs font-bold text-purple-900 transition';
        if (labelDefault) labelDefault.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 hover:border-purple-300 bg-white cursor-pointer text-xs font-bold text-slate-700 transition';
        if (uploadBox) uploadBox.classList.remove('hidden');
        updateLivePreview();
      }
    });
  }

// دالة ضغط وتحجيم الصور المرفوعة برمجياً لتجنب تجاوز سعة التخزين المحلي (LocalStorage)
function compressImage(file, maxWidth = 1000, maxHeight = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

  // معالجة رفع ملف صورة التصميم بذكاء وضغط فوري
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WebP)');
        return;
      }

      try {
        const compressed = await compressImage(file, 1000, 1400, 0.78);
        currentUploadedCustomDesign = compressed;

        const thumb = document.getElementById('custom-design-thumb');
        const filename = document.getElementById('custom-design-filename');
        const previewBox = document.getElementById('custom-design-preview-container');
        const promptBox = document.getElementById('custom-design-prompt');

        if (thumb) thumb.src = currentUploadedCustomDesign;
        if (filename) filename.textContent = file.name;
        if (previewBox) previewBox.classList.remove('hidden');
        if (promptBox) promptBox.classList.add('hidden');

        updateLivePreview();
      } catch (err) {
        console.warn('Canvas compression fallback:', err);
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentUploadedCustomDesign = evt.target.result;
          updateLivePreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // حذف التصميم المرفوع والرجوع للقالب
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentUploadedCustomDesign = null;
      if (fileInput) fileInput.value = '';

      const previewBox = document.getElementById('custom-design-preview-container');
      const promptBox = document.getElementById('custom-design-prompt');
      if (previewBox) previewBox.classList.add('hidden');
      if (promptBox) promptBox.classList.remove('hidden');

      updateLivePreview();
    });
  }
}

function updateLivePreview() {
  const guestVal = document.getElementById('field-create-guest')?.value.trim() || 'اسم المدعو الكريم';
  const eventVal = document.getElementById('field-create-event')?.value.trim() || 'دعوة زفاف مبارك';
  const dateVal = document.getElementById('field-create-date')?.value || '2026-10-15';
  const timeVal = document.getElementById('field-create-time')?.value || '20:00';
  const venueVal = document.getElementById('field-create-venue')?.value.trim() || 'قصر الأفراح الملكي';
  const typeVal = document.getElementById('field-create-type')?.value || 'عادية';

  const liveCard = document.getElementById('live-card-container');
  const defaultLayout = document.getElementById('live-card-default-layout');
  const customLayout = document.getElementById('live-card-custom-layout');

  // إذا تم رفع تصميم خاص
  if (currentUploadedCustomDesign) {
    if (liveCard) {
      liveCard.classList.add('custom-card-active');
      liveCard.style.backgroundImage = `url('${currentUploadedCustomDesign}')`;
      liveCard.style.backgroundSize = 'cover';
      liveCard.style.backgroundPosition = 'center';
      liveCard.style.backgroundColor = 'transparent';
    }
    if (defaultLayout) defaultLayout.classList.add('hidden');
    if (customLayout) customLayout.classList.remove('hidden');

    // تطبيق لون الخط المختار وتنسيق البيانات بدقة
    const textColor = currentUploadedCustomColor || '#1e1b2e';
    const customGuest = document.getElementById('custom-preview-guest-name');
    const customPrefix = document.getElementById('custom-preview-guest-prefix');
    const customDivider = document.getElementById('custom-preview-divider');
    const customVenue = document.getElementById('custom-preview-venue');
    const customVenueText = document.getElementById('custom-preview-venue-text');
    const customDate = document.getElementById('custom-preview-date');
    const customTime = document.getElementById('custom-preview-time');
    const customDatetime = document.getElementById('custom-preview-datetime');
    const customCodeTag = document.getElementById('custom-preview-code-tag');

    if (customGuest) {
      customGuest.textContent = guestVal;
      customGuest.style.color = textColor;
    }
    if (customPrefix) customPrefix.style.color = textColor;
    if (customDivider) customDivider.style.backgroundColor = textColor;
    if (customVenue) customVenue.style.color = textColor;
    if (customVenueText) customVenueText.textContent = venueVal;
    if (customDatetime) customDatetime.style.color = textColor;
    if (customDate) customDate.innerHTML = `<i class="fa-regular fa-calendar ml-1 opacity-80"></i>${dateVal}`;
    if (customTime) customTime.innerHTML = `<i class="fa-regular fa-clock ml-1 opacity-80"></i>${timeVal}`;
    if (customCodeTag) customCodeTag.style.color = textColor;

    // توليد QR كود للمعاينة الحية داخل حاوية التصميم المخصص
    const customQrBox = document.getElementById('custom-preview-qr-box');
    if (customQrBox && typeof QRCode !== 'undefined') {
      customQrBox.innerHTML = '';
      try {
        new QRCode(customQrBox, {
          text: `https://invitations.soulmediaa.com/ticket.html?guest=${encodeURIComponent(guestVal)}`,
          width: 72,
          height: 72,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch {}
    }
  } else {
    // القالب الافتراضي لسول ميديا
    if (liveCard) {
      liveCard.classList.remove('custom-card-active');
      liveCard.style.backgroundImage = 'linear-gradient(145deg, #171126 0%, #261942 50%, #171126 100%)';
      liveCard.style.backgroundSize = 'auto';
    }
    if (defaultLayout) defaultLayout.classList.remove('hidden');
    if (customLayout) customLayout.classList.add('hidden');

    const previewEvent = document.getElementById('preview-event-name');
    const previewGuest = document.getElementById('preview-guest-name');
    const previewDate = document.getElementById('preview-event-date');
    const previewTime = document.getElementById('preview-event-time');
    const previewBadge = document.getElementById('preview-badge-type');
    const previewVenueText = document.getElementById('preview-venue-default-text');

    if (previewEvent) previewEvent.textContent = eventVal;
    if (previewGuest) previewGuest.textContent = guestVal;
    if (previewDate) previewDate.innerHTML = `<i class="fa-regular fa-calendar ml-1"></i>${dateVal}`;
    if (previewTime) previewTime.innerHTML = `<i class="fa-regular fa-clock ml-1"></i>${timeVal}`;
    if (previewBadge) previewBadge.textContent = typeVal === 'VIP' ? 'دعوة VIP خاصة' : 'دعوة عادية';
    if (previewVenueText) previewVenueText.textContent = venueVal;

    // توليد QR كود للقالب الافتراضي
    const qrBox = document.getElementById('preview-qr-box');
    if (qrBox && typeof QRCode !== 'undefined') {
      qrBox.innerHTML = '';
      try {
        new QRCode(qrBox, {
          text: `https://invitations.soulmediaa.com/ticket.html?guest=${encodeURIComponent(guestVal)}`,
          width: 72,
          height: 72,
          colorDark: "#1f1438",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch {}
    }
  }
}

// ===================================================
// 6. نموذج إنشاء دعوة جديدة
// ===================================================
function setupCreateForm() {
  const form = document.getElementById('create-invite-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const guestName = document.getElementById('field-create-guest')?.value.trim();
      const guestPhone = document.getElementById('field-create-phone')?.value.trim();
      const eventName = document.getElementById('field-create-event')?.value.trim() || 'حفل زفاف مبارك';
      const eventType = document.getElementById('field-create-event-type')?.value || 'wedding';
      const dateVal = document.getElementById('field-create-date')?.value || '2026-10-15';
      const timeVal = document.getElementById('field-create-time')?.value || '20:00';
      const venueVal = document.getElementById('field-create-venue')?.value.trim() || 'قصر الأفراح الملكي';
      const type = document.getElementById('field-create-type')?.value || 'عادية';
      const peopleCount = parseInt(document.getElementById('field-create-people-count')?.value || '1', 10);
      const notes = document.getElementById('field-create-notes')?.value.trim();
      const user = getCurrentUser();

      if (!guestName || !guestPhone) {
        alert('يرجى إدخال اسم المدعو ورقم الجوال');
        return;
      }

      const code = 'INV-' + Math.floor(1000 + Math.random() * 9000);
      const newInv = {
        id: code,
        code: code,
        userId: user?.id || 'usr_ahmed',
        guestName: guestName,
        guestPhone: guestPhone,
        event: eventName,
        eventType: eventType,
        date: dateVal,
        time: timeVal,
        venue: venueVal,
        type: type,
        peopleCount: peopleCount,
        hostName: user?.name || 'أحمد محمد علي',
        status: 'صالحة',
        invitationState: 'مقبولة',
        isUsed: false,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        notes: notes,
        theme: eventType,
        customDesign: currentUploadedCustomDesign || null, // حفظ التصميم المرفوع المضغوط
        customDesignTextColor: currentUploadedCustomDesign ? (currentUploadedCustomColor || '#1e1b2e') : null
      };

      saveInvitation(newInv);

      // تصفير النموذج وحالة الرفع
      form.reset();
      currentUploadedCustomDesign = null;
      document.getElementById('custom-design-preview-container')?.classList.add('hidden');
      document.getElementById('custom-design-prompt')?.classList.remove('hidden');
      document.getElementById('custom-design-upload-box')?.classList.add('hidden');
      const defaultRadio = document.getElementById('design-choice-default');
      if (defaultRadio) defaultRadio.checked = true;

      // تحديث القوائم ولوحة التحكم
      if (typeof renderDashboardData === 'function') renderDashboardData();
      if (typeof renderInvitations === 'function') renderInvitations();

      // الانتقال المباشر لشاشة تفاصيل الدعوة لعرضها ومشاركتها مع التمرير للأعلى فوراً
      viewInvitationDetails(newInv);
    } catch (err) {
      console.error('Error submitting create invite form:', err);
      alert('حدث خطأ أثناء إصدار الدعوة: ' + (err.message || err));
    }
  });
}

// ===================================================
// 7. تفاصيل الدعوة والمشاركة (View Details)
// ===================================================
window.viewInvitationDetails = function(invOrId) {
  let inv;
  if (typeof invOrId === 'object' && invOrId !== null) {
    inv = invOrId;
  } else {
    const invitations = getInvitations();
    inv = invitations.find(i => i.id === invOrId || i.code === invOrId);
  }
  if (!inv) return;

  currentSelectedInvitationId = inv.id;

  // تبديل الشاشة مباشرة للأعلى لضمان رؤية بطاقة الدعوة فوراً دون أي تأخير
  switchView('details');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const cardPreview = document.getElementById('details-card-preview');
  const detailsDefaultLayout = document.getElementById('details-card-default-layout');
  const detailsCustomLayout = document.getElementById('details-card-custom-layout');
  const ticketUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}ticket.html?id=${encodeURIComponent(inv.id)}`;

  if (inv.customDesign) {
    if (cardPreview) {
      cardPreview.classList.add('custom-card-active');
      cardPreview.style.backgroundImage = `url('${inv.customDesign}')`;
      cardPreview.style.backgroundSize = 'cover';
      cardPreview.style.backgroundPosition = 'center';
      cardPreview.style.backgroundColor = 'transparent';
    }
    if (detailsDefaultLayout) detailsDefaultLayout.classList.add('hidden');
    if (detailsCustomLayout) detailsCustomLayout.classList.remove('hidden');

    const textColor = inv.customDesignTextColor || '#1e1b2e';
    const customGuest = document.getElementById('details-custom-guest');
    const customPrefix = document.getElementById('details-custom-guest-prefix');
    const customDivider = document.getElementById('details-custom-divider');
    const customVenue = document.getElementById('details-custom-venue');
    const customVenueText = document.getElementById('details-custom-venue-text');
    const customDatetime = document.getElementById('details-custom-datetime');
    const customDate = document.getElementById('details-custom-date');
    const customTime = document.getElementById('details-custom-time');
    const customCodeTag = document.getElementById('details-custom-code-tag');

    if (customGuest) {
      customGuest.textContent = inv.guestName;
      customGuest.style.color = textColor;
    }
    if (customPrefix) customPrefix.style.color = textColor;
    if (customDivider) customDivider.style.backgroundColor = textColor;
    if (customVenue) customVenue.style.color = textColor;
    if (customVenueText) customVenueText.textContent = inv.venue || 'قصر الأفراح الملكي';
    if (customDatetime) customDatetime.style.color = textColor;
    if (customDate) customDate.innerHTML = `<i class="fa-regular fa-calendar ml-1 opacity-80"></i>${inv.date || '2026-10-15'}`;
    if (customTime) customTime.innerHTML = `<i class="fa-regular fa-clock ml-1 opacity-80"></i>${inv.time || '20:00'}`;
    if (customCodeTag) customCodeTag.style.color = textColor;

    const customQrBox = document.getElementById('details-custom-qrcode-slot');
    if (customQrBox && typeof QRCode !== 'undefined') {
      customQrBox.innerHTML = '';
      try {
        new QRCode(customQrBox, {
          text: ticketUrl,
          width: 90,
          height: 90,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (qrErr) {
        console.warn('QR Code generation error:', qrErr);
      }
    }
  } else {
    if (cardPreview) {
      cardPreview.classList.remove('custom-card-active');
      cardPreview.style.backgroundImage = 'linear-gradient(145deg, #171126 0%, #261942 50%, #171126 100%)';
      cardPreview.style.backgroundSize = 'auto';
    }
    if (detailsDefaultLayout) detailsDefaultLayout.classList.remove('hidden');
    if (detailsCustomLayout) detailsCustomLayout.classList.add('hidden');

    const cardEvent = document.getElementById('details-card-event');
    const cardGuest = document.getElementById('details-card-guest');
    const cardType = document.getElementById('details-card-type-badge');
    const cardCode = document.getElementById('details-card-code');

    if (cardEvent) cardEvent.textContent = inv.event || 'حفل زفاف مبارك';
    if (cardGuest) cardGuest.textContent = inv.guestName;
    if (cardType) cardType.textContent = inv.type || 'عادية';
    if (cardCode) cardCode.textContent = inv.code || inv.id;

    const qrBox = document.getElementById('details-qrcode-render');
    if (qrBox && typeof QRCode !== 'undefined') {
      qrBox.innerHTML = '';
      try {
        new QRCode(qrBox, {
          text: ticketUrl,
          width: 90,
          height: 90,
          colorDark: "#1a1230",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (qrErr) {
        console.warn('QR Code generation error:', qrErr);
      }
    }
  }

  const openLink = document.getElementById('btn-open-ticket-link');
  if (openLink) openLink.href = ticketUrl;

  // ملء جدول التفاصيل
  const fEvent = document.getElementById('details-field-event');
  if (fEvent) fEvent.textContent = inv.event || 'حفل زفاف';
  const fGuest = document.getElementById('details-field-guest');
  if (fGuest) fGuest.textContent = inv.guestName;
  const fPhone = document.getElementById('details-field-phone');
  if (fPhone) fPhone.textContent = inv.guestPhone || '-';
  const fType = document.getElementById('details-field-type');
  if (fType) fType.textContent = `دعوة ${inv.type || 'عادية'}${inv.customDesign ? ' (بتصميم خاص)' : ''}`;
  const fSeats = document.getElementById('details-field-seats');
  if (fSeats) fSeats.textContent = `${inv.peopleCount || 1} أشخاص`;
  const fCreated = document.getElementById('details-field-created');
  if (fCreated) fCreated.textContent = inv.createdAt || '2026-09-20';
  const fHost = document.getElementById('details-field-host');
  if (fHost) fHost.textContent = inv.hostName || 'أحمد محمد علي';

  // رابط المشاركة وأزرار واتساب ومنصة X
  const shareField = document.getElementById('details-share-url-field');
  if (shareField) shareField.value = ticketUrl;

  const waBtn = document.getElementById('btn-details-whatsapp');
  if (waBtn) {
    const waText = encodeURIComponent(`يسرني دعوتكم لحضور ${inv.event || 'مناسبتنا'}. تفاصيل الدعوة وبطاقة الدخول الإلكترونية:\n${ticketUrl}`);
    const phoneClean = (inv.guestPhone || '').replace(/\D/g, '');
    waBtn.href = phoneClean ? `https://wa.me/${phoneClean}?text=${waText}` : `https://api.whatsapp.com/send?text=${waText}`;
  }

  const twBtn = document.getElementById('btn-details-twitter');
  if (twBtn) {
    const twText = encodeURIComponent(`نتشرف بدعوتكم الكريمة لحضور ${inv.event || 'مناسبتنا'}`);
    twBtn.href = `https://twitter.com/intent/tweet?text=${twText}&url=${encodeURIComponent(ticketUrl)}`;
  }

  const copyBtn = document.getElementById('btn-details-copy-url');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(ticketUrl).then(() => {
        alert('تم نسخ رابط الدعوة بنجاح!');
      });
    };
  }

  const downloadQrBtn = document.getElementById('btn-download-qr-image');
  if (downloadQrBtn) {
    downloadQrBtn.onclick = () => {
      const activeQrBox = inv.customDesign ? document.getElementById('details-custom-qrcode-slot') : document.getElementById('details-qrcode-render');
      const img = activeQrBox?.querySelector('img') || activeQrBox?.querySelector('canvas');
      if (img) {
        const a = document.createElement('a');
        a.href = img.src || img.toDataURL?.();
        a.download = `QR_${inv.code || inv.id}.png`;
        a.click();
      }
    };
  }
};

// ===================================================
// 8. تعديل وحذف الدعوات
// ===================================================
window.editInvitation = function(invId) {
  const invitations = getInvitations();
  const inv = invitations.find(i => i.id === invId);
  if (!inv) return;

  document.getElementById('edit-inv-id').value = inv.id;
  document.getElementById('edit-field-guest').value = inv.guestName;
  document.getElementById('edit-field-phone').value = inv.guestPhone || '';
  document.getElementById('edit-field-event').value = inv.event || '';
  const venueField = document.getElementById('edit-field-venue');
  if (venueField) venueField.value = inv.venue || '';
  document.getElementById('edit-field-type').value = inv.type || 'عادية';
  document.getElementById('edit-field-people-count').value = inv.peopleCount || 1;
  document.getElementById('edit-field-notes').value = inv.notes || '';

  // تعيين حالة ولون التصميم المخصص للتعديل
  editUploadedCustomDesign = inv.customDesign || null;
  editUploadedCustomColor = inv.customDesignTextColor || '#1e1b2e';
  const editColorPicker = document.getElementById('edit-custom-color-picker');
  if (editColorPicker) editColorPicker.value = editUploadedCustomColor;

  const editThumb = document.getElementById('edit-custom-design-thumb');
  const editPreview = document.getElementById('edit-custom-design-preview');
  const editRemoveBtn = document.getElementById('btn-edit-remove-custom-design');
  const editBadge = document.getElementById('edit-design-badge');
  const editLabel = document.getElementById('edit-custom-design-label');

  if (inv.customDesign) {
    if (editThumb) editThumb.src = inv.customDesign;
    if (editPreview) editPreview.classList.remove('hidden');
    if (editRemoveBtn) editRemoveBtn.classList.remove('hidden');
    if (editBadge) {
      editBadge.textContent = 'تصميم خاص مرفوع';
      editBadge.className = 'text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded border border-purple-300';
    }
    if (editLabel) editLabel.textContent = 'تغيير صورة التصميم';
  } else {
    if (editPreview) editPreview.classList.add('hidden');
    if (editRemoveBtn) editRemoveBtn.classList.add('hidden');
    if (editBadge) {
      editBadge.textContent = 'القالب الافتراضي';
      editBadge.className = 'text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200';
    }
    if (editLabel) editLabel.textContent = 'رفع صورة تصميم خاصة';
  }

  switchView('edit');
};

function setupEditForm() {
  const form = document.getElementById('edit-invite-form');
  const deleteBtn = document.getElementById('btn-delete-from-edit');
  const editFileInput = document.getElementById('edit-field-custom-design-file');
  const editRemoveBtn = document.getElementById('btn-edit-remove-custom-design');
  const editColorPicker = document.getElementById('edit-custom-color-picker');

  if (editColorPicker) {
    editColorPicker.addEventListener('input', (e) => {
      editUploadedCustomColor = e.target.value;
    });
  }

  if (editFileInput) {
    editFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WebP)');
        return;
      }

      try {
        const compressedBase64 = await compressImage(file, 1000, 1400, 0.78);
        editUploadedCustomDesign = compressedBase64;
        const editThumb = document.getElementById('edit-custom-design-thumb');
        const editPreview = document.getElementById('edit-custom-design-preview');
        const editRemoveBtn = document.getElementById('btn-edit-remove-custom-design');
        const editBadge = document.getElementById('edit-design-badge');

        if (editThumb) editThumb.src = editUploadedCustomDesign;
        if (editPreview) editPreview.classList.remove('hidden');
        if (editRemoveBtn) editRemoveBtn.classList.remove('hidden');
        if (editBadge) {
          editBadge.textContent = 'تصميم جديد جاهز للحفظ';
          editBadge.className = 'text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300';
        }
      } catch (compressErr) {
        console.error('Error compressing edit image:', compressErr);
        const reader = new FileReader();
        reader.onload = (evt) => {
          editUploadedCustomDesign = evt.target.result;
          const editThumb = document.getElementById('edit-custom-design-thumb');
          const editPreview = document.getElementById('edit-custom-design-preview');
          const editRemoveBtn = document.getElementById('btn-edit-remove-custom-design');
          const editBadge = document.getElementById('edit-design-badge');

          if (editThumb) editThumb.src = editUploadedCustomDesign;
          if (editPreview) editPreview.classList.remove('hidden');
          if (editRemoveBtn) editRemoveBtn.classList.remove('hidden');
          if (editBadge) {
            editBadge.textContent = 'تصميم جديد جاهز للحفظ';
            editBadge.className = 'text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (editRemoveBtn) {
    editRemoveBtn.addEventListener('click', () => {
      editUploadedCustomDesign = null;
      if (editFileInput) editFileInput.value = '';
      document.getElementById('edit-custom-design-preview')?.classList.add('hidden');
      editRemoveBtn.classList.add('hidden');
      const editBadge = document.getElementById('edit-design-badge');
      if (editBadge) {
        editBadge.textContent = 'القالب الافتراضي';
        editBadge.className = 'text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-inv-id').value;
      const invitations = getInvitations();
      const inv = invitations.find(i => i.id === id);
      if (!inv) return;

      inv.guestName = document.getElementById('edit-field-guest').value.trim();
      inv.guestPhone = document.getElementById('edit-field-phone').value.trim();
      inv.event = document.getElementById('edit-field-event').value.trim();
      inv.venue = document.getElementById('edit-field-venue')?.value.trim() || inv.venue;
      inv.type = document.getElementById('edit-field-type').value;
      inv.peopleCount = parseInt(document.getElementById('edit-field-people-count').value || '1', 10);
      inv.notes = document.getElementById('edit-field-notes').value.trim();
      inv.customDesign = editUploadedCustomDesign; // حفظ التعديل على التصميم المخصص
      inv.customDesignTextColor = editUploadedCustomDesign ? (editUploadedCustomColor || '#1e1b2e') : null;

      saveInvitation(inv);
      alert('تم حفظ التعديلات بنجاح!');
      viewInvitationDetails(inv.id);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const id = document.getElementById('edit-inv-id').value;
      deleteInvitationItem(id);
    });
  }
}

window.deleteInvitationItem = function(invId) {
  if (confirm('هل أنت متأكد من رغبتك بحذف هذه الدعوة؟ سيتم استرجاع المقعد إلى رصيدك المتاح.')) {
    deleteInvitation(invId);
    renderDashboardData();
    renderInvitations();
    switchView('invitations');
  }
};

window.shareInvitationDirect = function(invId) {
  viewInvitationDetails(invId);
};

// ===================================================
// 9. تحويل الدعوات وسجل التحويلات (Transfer Section)
// ===================================================
function setupTransferSection() {
  const form = document.getElementById('transfer-form');
  const minusBtn = document.getElementById('btn-transfer-minus');
  const plusBtn = document.getElementById('btn-transfer-plus');
  const countInput = document.getElementById('transfer-count-input');

  if (minusBtn && countInput) {
    minusBtn.addEventListener('click', () => {
      const cur = parseInt(countInput.value || '1', 10);
      if (cur > 1) countInput.value = cur - 1;
    });
  }

  if (plusBtn && countInput) {
    plusBtn.addEventListener('click', () => {
      const cur = parseInt(countInput.value || '1', 10);
      countInput.value = cur + 1;
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const eventName = document.getElementById('transfer-event-select')?.value;
      const type = document.getElementById('transfer-type-select')?.value;
      const count = parseInt(countInput?.value || '1', 10);
      const recipientId = document.getElementById('transfer-recipient-select')?.value;
      const notes = document.getElementById('transfer-notes')?.value.trim();
      const currentUser = getCurrentUser();

      const users = getUsers();
      const recipient = users.find(u => u.id === recipientId || u.username === recipientId);

      const newTransfer = {
        id: 'TRF-' + Math.floor(100 + Math.random() * 900),
        senderId: currentUser?.id || 'usr_ahmed',
        senderName: currentUser?.name || 'أحمد محمد علي',
        recipientId: recipient?.id || recipientId,
        recipientName: recipient?.name || 'مستخدم',
        recipientEmail: recipient?.email || 'user@example.com',
        event: eventName,
        count: count,
        type: type,
        status: 'مكتملة',
        createdAt: new Date().toISOString().split('T')[0],
        notes: notes
      };

      const transfers = getTransfers();
      transfers.unshift(newTransfer);
      localStorage.setItem('grad_real_transfers_v4', JSON.stringify(transfers));

      alert(`تم تحويل ${count} دعوة بنجاح إلى ${recipient?.name || 'المستلم'}!`);
      renderTransfersSection();
      form.reset();
      if (countInput) countInput.value = 5;
    });
  }
}

function renderTransfersSection() {
  const users = getUsers();
  const currentUser = getCurrentUser();
  const recipientSelect = document.getElementById('transfer-recipient-select');
  const tbody = document.getElementById('transfers-table-body');

  // تعبئة المستلمين
  if (recipientSelect) {
    recipientSelect.innerHTML = '';
    users.filter(u => u.id !== currentUser?.id).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name} (${u.email || u.username})`;
      recipientSelect.appendChild(opt);
    });
  }

  // تعبئة جدول سجل التحويلات
  if (tbody) {
    const transfers = getTransfers();
    if (transfers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-slate-400">لا توجد عمليات تحويل سابقة</td></tr>';
      return;
    }

    tbody.innerHTML = transfers.map(t => {
      return `
        <tr>
          <td class="font-mono font-bold text-purple-700">${escapeHtml(t.id)}</td>
          <td>
            <div class="font-bold text-slate-900">${escapeHtml(t.recipientName || 'مستخدم')}</div>
            <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(t.recipientEmail || '-')}</div>
          </td>
          <td>${escapeHtml(t.event || 'حفل زفاف')}</td>
          <td class="font-mono">${escapeHtml(t.createdAt || '-')}</td>
          <td class="font-mono font-bold text-purple-700">${t.count} دعوات</td>
          <td><span class="badge-pill badge-pill-green"><i class="fa-solid fa-check"></i>مكتملة</span></td>
          <td class="text-center">
            <button onclick="alert('تفاصيل التحويل:\\nالمعرف: ${t.id}\\nالمستلم: ${t.recipientName}\\nالعدد: ${t.count}\\nالفعالية: ${t.event}\\nالتاريخ: ${t.createdAt}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">تفاصيل</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function getTransfers() {
  try {
    return JSON.parse(localStorage.getItem('grad_real_transfers_v4')) || [];
  } catch {
    return [];
  }
}

// ===================================================
// 10. شاشات إدارة الفعاليات والمستخدمين (Events & Users)
// ===================================================
function renderEventsTable() {
  const tbody = document.getElementById('events-table-body');
  if (!tbody) return;

  const events = getEventsList();
  tbody.innerHTML = events.map(ev => {
    return `
      <tr>
        <td>
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <i class="fa-regular fa-calendar-check"></i>
            </div>
            <div>
              <strong class="font-bold text-slate-900 block">${escapeHtml(ev.name)}</strong>
              <span class="text-[10px] text-slate-400">${escapeHtml(ev.venue || 'القاعة الملكية')} - ${escapeHtml(ev.city || 'الرياض')}</span>
            </div>
          </div>
        </td>
        <td class="font-mono">${ev.date || ev.dateDisplay || '2026-10-15'}</td>
        <td class="font-mono font-bold">${ev.invited || 200}</td>
        <td class="font-mono text-emerald-600 font-bold">${ev.used || 160}</td>
        <td class="font-mono text-cyan-600 font-bold">${ev.remaining || 40}</td>
        <td><span class="badge-pill badge-pill-green">نشطة</span></td>
        <td class="text-center">
          <div class="inline-flex items-center gap-1.5">
            <button onclick="alert('تعديل فعالية: ${ev.name}')" class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100">تعديل</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const users = getUsers();
  tbody.innerHTML = users.map(u => {
    const roleBadge = u.role === 'admin'
      ? '<span class="badge-pill badge-pill-purple">أدمن</span>'
      : (u.role === 'organizer' ? '<span class="badge-pill badge-pill-green">منظم</span>' : '<span class="badge-pill badge-pill-cyan">مستخدم</span>');

    return `
      <tr>
        <td>
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-purple-500 text-white flex items-center justify-center font-bold text-xs">
              ${u.initials || 'أح'}
            </div>
            <strong class="font-bold text-slate-900">${escapeHtml(u.name)}</strong>
          </div>
        </td>
        <td class="font-mono text-slate-600">${escapeHtml(u.email || u.username + '@soulmediaa.com')}</td>
        <td>${roleBadge}</td>
        <td class="font-mono font-bold text-purple-700">${u.regularQuota || 30} عادية / ${u.vipQuota || 0} VIP</td>
        <td><span class="badge-pill badge-pill-green">نشط</span></td>
        <td class="text-center">
          <button onclick="openQuotaModal('${u.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
            <i class="fa-solid fa-sliders ml-1"></i> الكوتا
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openQuotaModal = function(userId) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return;

  document.getElementById('quota-user-id').value = u.id;
  document.getElementById('quota-user-name').value = u.name;
  document.getElementById('quota-reg-input').value = u.regularQuota || 30;
  document.getElementById('quota-vip-input').value = u.vipQuota || 0;

  document.getElementById('quota-modal')?.classList.remove('hidden');
};

function setupModals() {
  const modal = document.getElementById('quota-modal');
  const closeBtn = document.getElementById('close-quota-modal');
  const form = document.getElementById('quota-form');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (form && modal) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const uid = document.getElementById('quota-user-id').value;
      const reg = parseInt(document.getElementById('quota-reg-input').value || '0', 10);
      const vip = parseInt(document.getElementById('quota-vip-input').value || '0', 10);

      const users = getUsers();
      const u = users.find(x => x.id === uid);
      if (u) {
        u.regularQuota = reg;
        u.vipQuota = vip;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        const cur = getCurrentUser();
        if (cur && cur.id === u.id) {
          cur.regularQuota = reg;
          cur.vipQuota = vip;
          setCurrentUser(cur);
        }

        modal.classList.add('hidden');
        alert('تم تحديث كوتا المستخدم بنجاح!');
        renderUsersTable();
        renderDashboardData();
      }
    });
  }
}

// ===================================================
// 11. الإعدادات وتخصيص المظهر (Dark Mode)
// ===================================================
function setupSettingsAndTheme() {
  const darkBtn = document.getElementById('btn-toggle-dark-mode');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('soul_theme_dark', isDark ? '1' : '0');
    });
  }

  if (localStorage.getItem('soul_theme_dark') === '1') {
    document.documentElement.classList.add('dark');
  }

  const saveSettingsBtn = document.getElementById('btn-save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const name = document.getElementById('settings-name-input')?.value.trim();
      const email = document.getElementById('settings-email-input')?.value.trim();
      const user = getCurrentUser();
      if (user) {
        if (name) user.name = name;
        if (email) user.email = email;
        setCurrentUser(user);
        updateAuthUI();
        alert('تم حفظ إعدادات الحساب بنجاح!');
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

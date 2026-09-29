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

    return `
      <div class="invitation-card-item">
        <!-- مصغر البطاقة الجرافيكي -->
        <div class="invitation-card-thumb ${themeClass}">
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
              ${stateBadge}
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

// ===================================================
// 5. المعاينة الحية الفورية للبطاقة (Live Preview Engine)
// ===================================================
function setupLivePreview() {
  const guestInput = document.getElementById('field-create-guest');
  const eventInput = document.getElementById('field-create-event');
  const dateInput = document.getElementById('field-create-date');
  const timeInput = document.getElementById('field-create-time');
  const typeSelect = document.getElementById('field-create-type');
  const eventTypeSelect = document.getElementById('field-create-event-type');

  const inputs = [guestInput, eventInput, dateInput, timeInput, typeSelect, eventTypeSelect];
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
}

function updateLivePreview() {
  const guestVal = document.getElementById('field-create-guest')?.value.trim() || 'اسم المدعو الكريم';
  const eventVal = document.getElementById('field-create-event')?.value.trim() || 'دعوة زفاف مبارك';
  const dateVal = document.getElementById('field-create-date')?.value || '2026-10-15';
  const timeVal = document.getElementById('field-create-time')?.value || '20:00';
  const typeVal = document.getElementById('field-create-type')?.value || 'عادية';

  const previewEvent = document.getElementById('preview-event-name');
  const previewGuest = document.getElementById('preview-guest-name');
  const previewDate = document.getElementById('preview-event-date');
  const previewTime = document.getElementById('preview-event-time');
  const previewBadge = document.getElementById('preview-badge-type');

  if (previewEvent) previewEvent.textContent = eventVal;
  if (previewGuest) previewGuest.textContent = guestVal;
  if (previewDate) previewDate.innerHTML = `<i class="fa-regular fa-calendar ml-1"></i>${dateVal}`;
  if (previewTime) previewTime.innerHTML = `<i class="fa-regular fa-clock ml-1"></i>${timeVal}`;
  if (previewBadge) previewBadge.textContent = typeVal === 'VIP' ? 'دعوة VIP خاصة' : 'دعوة عادية';

  // توليد QR كود للمعاينة الحية
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

// ===================================================
// 6. نموذج إنشاء دعوة جديدة
// ===================================================
function setupCreateForm() {
  const form = document.getElementById('create-invite-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const guestName = document.getElementById('field-create-guest')?.value.trim();
    const guestPhone = document.getElementById('field-create-phone')?.value.trim();
    const eventName = document.getElementById('field-create-event')?.value.trim();
    const eventType = document.getElementById('field-create-event-type')?.value || 'wedding';
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
      guestName: guestName,
      guestPhone: guestPhone,
      event: eventName,
      eventType: eventType,
      type: type,
      peopleCount: peopleCount,
      hostName: user?.name || 'أحمد محمد علي',
      status: 'صالحة',
      invitationState: 'مقبولة',
      isUsed: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: notes,
      theme: eventType
    };

    saveInvitation(newInv);

    // تصفير النموذج
    form.reset();
    alert('تم إصدار ونشر الدعوة بنجاح!');
    
    // الانتقال المباشر لشاشة تفاصيل الدعوة لعرضها ومشاركتها
    viewInvitationDetails(newInv.id);
  });
}

// ===================================================
// 7. تفاصيل الدعوة والمشاركة (View Details)
// ===================================================
window.viewInvitationDetails = function(invId) {
  const invitations = getInvitations();
  const inv = invitations.find(i => i.id === invId || i.code === invId);
  if (!inv) return;

  currentSelectedInvitationId = inv.id;

  // ملء البطاقة الفاخرة
  const cardEvent = document.getElementById('details-card-event');
  const cardGuest = document.getElementById('details-card-guest');
  const cardType = document.getElementById('details-card-type-badge');
  const cardCode = document.getElementById('details-card-code');

  if (cardEvent) cardEvent.textContent = inv.event || 'حفل زفاف مبارك';
  if (cardGuest) cardGuest.textContent = inv.guestName;
  if (cardType) cardType.textContent = inv.type || 'عادية';
  if (cardCode) cardCode.textContent = inv.code || inv.id;

  // توليد الباركود عالي الدقة
  const qrBox = document.getElementById('details-qrcode-render');
  if (qrBox && typeof QRCode !== 'undefined') {
    qrBox.innerHTML = '';
    const ticketUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}ticket.html?id=${inv.id}`;
    new QRCode(qrBox, {
      text: ticketUrl,
      width: 90,
      height: 90,
      colorDark: "#1a1230",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    const openLink = document.getElementById('btn-open-ticket-link');
    if (openLink) openLink.href = ticketUrl;
  }

  // ملء جدول التفاصيل
  document.getElementById('details-field-event').textContent = inv.event || 'حفل زفاف';
  document.getElementById('details-field-guest').textContent = inv.guestName;
  document.getElementById('details-field-phone').textContent = inv.guestPhone || '-';
  document.getElementById('details-field-type').textContent = `دعوة ${inv.type || 'عادية'}`;
  document.getElementById('details-field-seats').textContent = `${inv.peopleCount || 1} أشخاص`;
  document.getElementById('details-field-created').textContent = inv.createdAt || '2026-09-20';
  document.getElementById('details-field-host').textContent = inv.hostName || 'أحمد محمد علي';

  // رابط المشاركة وأزرار واتساب ومنصة X
  const shareUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}ticket.html?id=${inv.id}`;
  const shareField = document.getElementById('details-share-url-field');
  if (shareField) shareField.value = shareUrl;

  const waBtn = document.getElementById('btn-details-whatsapp');
  if (waBtn) {
    const waText = encodeURIComponent(`يسرني دعوتكم لحضور ${inv.event || 'مناسبتنا'}. تفاصيل الدعوة وبطاقة الدخول الإلكترونية:\n${shareUrl}`);
    const phoneClean = (inv.guestPhone || '').replace(/\D/g, '');
    waBtn.href = phoneClean ? `https://wa.me/${phoneClean}?text=${waText}` : `https://api.whatsapp.com/send?text=${waText}`;
  }

  const twBtn = document.getElementById('btn-details-twitter');
  if (twBtn) {
    const twText = encodeURIComponent(`نتشرف بدعوتكم الكريمة لحضور ${inv.event || 'مناسبتنا'}`);
    twBtn.href = `https://twitter.com/intent/tweet?text=${twText}&url=${encodeURIComponent(shareUrl)}`;
  }

  const copyBtn = document.getElementById('btn-details-copy-url');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('تم نسخ رابط الدعوة بنجاح!');
      });
    };
  }

  const downloadQrBtn = document.getElementById('btn-download-qr-image');
  if (downloadQrBtn) {
    downloadQrBtn.onclick = () => {
      const img = qrBox?.querySelector('img');
      if (img) {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `QR_${inv.code || inv.id}.png`;
        a.click();
      }
    };
  }

  switchView('details');
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
  document.getElementById('edit-field-type').value = inv.type || 'عادية';
  document.getElementById('edit-field-people-count').value = inv.peopleCount || 1;
  document.getElementById('edit-field-notes').value = inv.notes || '';

  switchView('edit');
};

function setupEditForm() {
  const form = document.getElementById('edit-invite-form');
  const deleteBtn = document.getElementById('btn-delete-from-edit');

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
      inv.type = document.getElementById('edit-field-type').value;
      inv.peopleCount = parseInt(document.getElementById('edit-field-people-count').value || '1', 10);
      inv.notes = document.getElementById('edit-field-notes').value.trim();

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

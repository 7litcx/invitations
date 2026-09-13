/**
 * app.js - نظام الدعوات الإلكترونية (كلية الحاسبات وتقنية المعلومات)
 * يدعم تسجيل الدخول باسم المستخدم وكلمة المرور فقط، وحذف كافة البيانات الوهمية
 */

document.addEventListener('DOMContentLoaded', () => {
  initStore();
  setupRealDate();
  setupAuth();
  setupNavigation();
  setupDarkMode();
  setupSearchAndFilters();
  setupCreateForm();
  setupEditForm();
  setupTransferSection();
  setupShareModal();
});

// 1. إدارة المصادقة وتسجيل الدخول (اسم المستخدم + كلمة المرور فقط)
function setupAuth() {
  const loginContainer = document.getElementById('login-container');
  const mainAppContainer = document.getElementById('main-app-container');
  const loginForm = document.getElementById('system-login-form');
  const errorAlert = document.getElementById('login-error-alert');
  const logoutBtn = document.getElementById('btn-logout-sidebar');
  const adminLink = document.getElementById('admin-panel-link');

  const currentUser = getCurrentUser();

  if (currentUser) {
    loginContainer?.classList.add('hidden');
    mainAppContainer?.classList.remove('hidden');

    // تحديث بيانات المستخدم في القائمة الجانبية
    const avatarEl = document.getElementById('user-avatar-circle');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');

    if (avatarEl) avatarEl.textContent = currentUser.initials || 'خر';
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = currentUser.role === 'admin' ? 'مشرف النظام' : 'منشئ دعوات';

    // إظهار زر لوحة الأدمن للمشرف
    if (adminLink) {
      if (currentUser.role === 'admin') {
        adminLink.classList.remove('hidden');
      } else {
        adminLink.classList.add('hidden');
      }
    }

    renderEventStatistics();
    renderInvitationsTable();

    // مزامنة سحابية هادئة في الخلفية لتحديث الجدول تلقائياً
    syncUserInvitations(currentUser.id).then(() => {
      renderEventStatistics();
      renderInvitationsTable();
    });
  } else {
    loginContainer?.classList.remove('hidden');
    mainAppContainer?.classList.add('hidden');
  }

  // معالجة نموذج تسجيل الدخول
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uInput = document.getElementById('login-username').value;
      const pInput = document.getElementById('login-password').value;

      if (errorAlert) errorAlert.classList.add('hidden');

      const res = await loginUser(uInput, pInput);

      if (res.success) {
        loginForm.reset();
        setupAuth();
      } else {
        if (errorAlert) {
          errorAlert.textContent = res.message || 'خطأ في اسم المستخدم أو كلمة المرور';
          errorAlert.classList.remove('hidden');
        }
      }
    });
  }

  // تسجيل الخروج
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutUser();
      setupAuth();
    });
  }
}

// 2. التاريخ الحي مطابق للتاريخ الفعلي
function setupRealDate() {
  const dateEl = document.getElementById('header-real-date');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}

// 3. إدارة التبديل بين الشاشات
function setupNavigation() {
  const navInv = document.getElementById('nav-invitations');
  const navCreate = document.getElementById('nav-create');
  const navTransfer = document.getElementById('nav-transfer');
  
  const btnGotoTransfer = document.getElementById('btn-goto-transfer');
  const btnGotoCreate = document.getElementById('btn-goto-create');
  const btnBack = document.getElementById('btn-back-to-invitations');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  const viewInv = document.getElementById('view-invitations');
  const viewCreate = document.getElementById('view-create');
  const viewTransfer = document.getElementById('view-transfer');
  const viewEdit = document.getElementById('view-edit');
  const titleEl = document.getElementById('current-view-title');

  window.switchTab = function(target) {
    [navInv, navCreate, navTransfer].forEach(n => n?.classList.remove('active'));
    [viewInv, viewCreate, viewTransfer, viewEdit].forEach(v => v?.classList.add('hidden'));

    if (target === 'invitations') {
      navInv?.classList.add('active');
      viewInv?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'قائمة الدعوات';
      renderEventStatistics();
      renderInvitationsTable();
    } else if (target === 'create') {
      navCreate?.classList.add('active');
      viewCreate?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'إنشاء دعوة جديدة';
    } else if (target === 'transfer') {
      navTransfer?.classList.add('active');
      viewTransfer?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'تحويل الدعوات';
      renderTransferStats();
      renderTransfersLog();
    } else if (target === 'edit') {
      viewEdit?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'تعديل بيانات الدعوة';
    }

    document.getElementById('app-sidebar')?.classList.remove('open');
  };

  navInv?.addEventListener('click', () => switchTab('invitations'));
  navCreate?.addEventListener('click', () => switchTab('create'));
  navTransfer?.addEventListener('click', () => switchTab('transfer'));
  
  btnGotoTransfer?.addEventListener('click', () => switchTab('transfer'));
  btnGotoCreate?.addEventListener('click', () => switchTab('create'));
  btnBack?.addEventListener('click', () => switchTab('invitations'));
  btnCancelEdit?.addEventListener('click', () => switchTab('invitations'));

  document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
    document.getElementById('app-sidebar')?.classList.toggle('open');
  });
}

// 4. الوضع الليلي المطور
function setupDarkMode() {
  const toggleBtn = document.getElementById('btn-toggle-dark');
  const icon = document.getElementById('dark-icon');
  if (!toggleBtn) return;

  const isDark = localStorage.getItem('theme_dark') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    if (icon) icon.className = 'fa-solid fa-sun text-amber-400';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    if (icon) icon.className = 'fa-regular fa-moon';
  }

  toggleBtn.addEventListener('click', () => {
    const isNowDark = document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark', isNowDark);
    localStorage.setItem('theme_dark', isNowDark);

    if (icon) {
      icon.className = isNowDark ? 'fa-solid fa-sun text-amber-400' : 'fa-regular fa-moon';
    }
  });
}

// 5. كرت إحصائيات الفعالية الحقيقية (دعوات عادية ودعوات VIP)
function renderEventStatistics() {
  const user = getCurrentUser();
  if (!user) return;

  const stats = getUserStats(user.id);
  const invitations = getInvitations({ userId: user.id });

  const totalRegularCreated = stats.regularUsed;
  const totalVipCreated = stats.vipUsed;
  const regularQuota = stats.regularAllowed;
  const vipQuota = stats.vipAllowed;

  const usedCount = invitations.filter(i => i.status === 'مستخدمة').length;
  const totalRemaining = stats.regularRemaining + stats.vipRemaining;

  const regPercent = regularQuota > 0 ? Math.min(100, Math.round((totalRegularCreated / regularQuota) * 100)) : 0;
  const vipPercent = vipQuota > 0 ? Math.min(100, Math.round((totalVipCreated / vipQuota) * 100)) : 0;

  // تحديث عناصر الواجهة
  const regularRatioEl = document.getElementById('stat-regular-ratio');
  const regularBarEl = document.getElementById('stat-regular-bar');
  const vipRatioEl = document.getElementById('stat-vip-ratio');
  const vipBarEl = document.getElementById('stat-vip-bar');

  const totalRegEl = document.getElementById('stat-total-regular');
  const totalVipEl = document.getElementById('stat-total-vip');
  const totalUsedEl = document.getElementById('stat-total-used');
  const totalUnusedEl = document.getElementById('stat-total-unused');
  const remainingBadge = document.getElementById('stat-remaining-badge');
  const baseQuotaText = document.getElementById('stat-base-quota-text');
  const formulaText = document.getElementById('stat-formula-text');

  if (regularRatioEl) regularRatioEl.textContent = `${totalRegularCreated} / ${regularQuota}`;
  if (regularBarEl) regularBarEl.style.width = `${regPercent}%`;

  if (vipRatioEl) vipRatioEl.textContent = `${totalVipCreated} / ${vipQuota}`;
  if (vipBarEl) vipBarEl.style.width = `${vipPercent}%`;

  if (totalRegEl) totalRegEl.textContent = totalRegularCreated;
  if (totalVipEl) totalVipEl.textContent = totalVipCreated;
  if (totalUsedEl) totalUsedEl.textContent = usedCount;
  if (totalUnusedEl) totalUnusedEl.textContent = totalRemaining;

  if (remainingBadge) {
    remainingBadge.textContent = `المتبقي: ${totalRemaining} دعوة (${stats.regularRemaining} عادية | ${stats.vipRemaining} VIP)`;
    remainingBadge.className = totalRemaining > 0
      ? 'px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/50'
      : 'px-3 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800/50';
  }

  if (baseQuotaText) baseQuotaText.textContent = `الكوتا: ${regularQuota} عادي | ${vipQuota} VIP`;
  if (formulaText) formulaText.textContent = `حساب معتمد`;
}

// 6. شريط البحث والفلترة المباشرة
function setupSearchAndFilters() {
  const searchInput = document.getElementById('filter-search-input');
  const statusSelect = document.getElementById('filter-status-select');
  const eventSelect = document.getElementById('filter-event-select');

  function triggerFilter() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const status = statusSelect ? statusSelect.value : 'الكل';
    const event = eventSelect ? eventSelect.value : 'الكل';

    renderInvitationsTable({ query, status, event });
  }

  searchInput?.addEventListener('input', triggerFilter);
  statusSelect?.addEventListener('change', triggerFilter);
  eventSelect?.addEventListener('change', triggerFilter);
}

// 7. عرض جدول الدعوات الحقيقية
function renderInvitationsTable(filters = {}) {
  const tbody = document.getElementById('invitations-table-body');
  if (!tbody) return;

  const user = getCurrentUser();
  if (!user) return;

  let invitations = getInvitations({ userId: user.id });

  if (filters.query) {
    const q = filters.query.toLowerCase();
    invitations = invitations.filter(inv => 
      inv.guestName.toLowerCase().includes(q) ||
      inv.phone.includes(q) ||
      inv.id.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== 'الكل') {
    invitations = invitations.filter(inv => inv.status === filters.status);
  }

  if (filters.event && filters.event !== 'الكل') {
    invitations = invitations.filter(inv => inv.event === filters.event);
  }

  if (invitations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          <i class="fa-regular fa-folder-open text-2xl block mb-2 opacity-50"></i>
          لا توجد دعوات مسجلة حتى الآن. اضغط على <strong>إنشاء دعوة جديدة</strong> لبدء إصدار دعواتك.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = invitations.map(inv => {
    const isVip = inv.type === 'VIP';
    const typeBadge = isVip
      ? `<span class="badge-vip"><i class="fa-solid fa-crown text-[10px]"></i> VIP</span>`
      : `<span class="text-slate-600 dark:text-slate-300 font-semibold text-xs">عادية</span>`;

    const statusBadge = inv.status === 'صالحة'
      ? `<span class="badge-status-valid">صالحة</span>`
      : `<span class="badge-status-used">مستخدمة</span>`;

    const ticketUrl = `ticket.html?id=${inv.id}`;

    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 table-cell-id">${escapeHtml(inv.id)}</td>
        <td class="py-3 px-4 font-bold text-xs text-slate-900 dark:text-white table-cell-guest">${escapeHtml(inv.guestName)}</td>
        <td class="py-3 px-4 font-mono text-xs dir-ltr text-right text-slate-700 dark:text-slate-200 table-cell-phone">${escapeHtml(inv.phone)}</td>
        <td class="py-3 px-4 font-semibold text-xs text-slate-700 dark:text-slate-300 table-cell-grad">${escapeHtml(inv.graduateName)}</td>
        <td class="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 table-cell-event">${escapeHtml(inv.event)}</td>
        <td class="py-3 px-4"><span class="person-count-badge">${inv.peopleCount || 1}</span></td>
        <td class="py-3 px-4 table-cell-type">${typeBadge}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openEditView('${inv.id}')" class="btn-action-edit" title="تعديل الدعوة">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="openShareModal('${inv.id}', '${escapeHtml(inv.guestName)}', '${ticketUrl}')" class="btn-action-share" title="مشاركة رابط الدعوة">
              <i class="fa-solid fa-share-nodes text-xs"></i>
            </button>
            <a href="${ticketUrl}" target="_blank" class="btn-action-view" title="معاينة التذكرة والباركود">
              <i class="fa-regular fa-eye text-xs"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 8. شاشة تعديل بيانات الدعوة
window.openEditView = function(invId) {
  const inv = getInvitation(invId);
  if (!inv) return;

  document.getElementById('edit-inv-id').value = inv.id;
  document.getElementById('edit-field-guest').value = inv.guestName;
  document.getElementById('edit-field-phone').value = inv.phone;
  document.getElementById('edit-field-grad-name').value = inv.graduateName;
  document.getElementById('edit-field-people-count').value = inv.peopleCount || 1;
  document.getElementById('edit-field-event').value = inv.event;
  document.getElementById('edit-field-type').value = inv.type || 'عادية';
  document.getElementById('edit-field-notes').value = inv.notes || '';

  window.switchTab('edit');
};

function setupEditForm() {
  const form = document.getElementById('edit-invite-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-inv-id').value;
    const guestName = document.getElementById('edit-field-guest').value.trim();
    const phone = document.getElementById('edit-field-phone').value.trim();
    const gradName = document.getElementById('edit-field-grad-name').value.trim();
    const peopleCount = parseInt(document.getElementById('edit-field-people-count').value, 10) || 1;
    const type = document.getElementById('edit-field-type').value;
    const notes = document.getElementById('edit-field-notes').value.trim();

    await updateInvitation(id, {
      guestName,
      phone,
      graduateName: gradName,
      peopleCount,
      type,
      notes
    });

    alert('تم حفظ التغييرات بنجاح!');
    window.switchTab('invitations');
  });
}

// 9. نموذج إنشاء دعوة جديدة
function setupCreateForm() {
  const form = document.getElementById('create-invite-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const guestName = document.getElementById('field-create-guest').value.trim();
    const phone = document.getElementById('field-create-phone').value.trim();
    const type = document.getElementById('field-create-type').value;
    const gradName = document.getElementById('field-create-grad-name').value.trim();
    const notes = document.getElementById('field-create-notes').value.trim();
    const eventName = document.getElementById('field-create-event').value;

    const result = await createInvitation(user.id, {
      guestName,
      phone,
      type,
      graduateName: gradName || user.name,
      notes,
      event: eventName
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    form.reset();
    document.getElementById('field-create-grad-name').value = user.name;
    alert(`تم إنشاء الدعوة بنجاح للضيف (${guestName}) برقم: ${result.invitation.id}`);

    window.switchTab('invitations');
  });
}

// 10. قسم تحويل الدعوات
function setupTransferSection() {
  const user = getCurrentUser();
  const recipientSelect = document.getElementById('transfer-recipient-select');

  if (recipientSelect && user) {
    const users = getUsers().filter(u => u.id !== user.id);
    recipientSelect.innerHTML = `
      <option value="">اكتب أو اختر اسم المستخدم للبحث...</option>
      ${users.map(u => `<option value="${u.id}">${u.name} (${u.major})</option>`).join('')}
    `;
  }

  const submitBtn = document.getElementById('btn-submit-transfer');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const recipientId = recipientSelect.value;
      const eventName = document.getElementById('transfer-event-select').value;
      const type = document.getElementById('transfer-type-select').value;
      const count = document.getElementById('transfer-count-input').value;
      const notes = document.getElementById('transfer-notes').value;

      if (!recipientId) {
        alert('يرجى اختيار المستخدم المستقبل.');
        return;
      }

      const res = await transferInvitations(user.id, recipientId, count, type, eventName, notes);
      if (!res.success) {
        alert(res.message);
        return;
      }

      alert(res.message);
      document.getElementById('transfer-notes').value = '';
      renderTransferStats();
      renderTransfersLog();
      renderEventStatistics();
    });
  }
}

function renderTransferStats() {
  const user = getCurrentUser();
  if (!user) return;
  const stats = getUserStats(user.id);

  const regEl = document.getElementById('stat-regular-avail');
  const vipEl = document.getElementById('stat-vip-avail');

  if (regEl) regEl.textContent = stats.regularRemaining;
  if (vipEl) vipEl.textContent = stats.vipRemaining;
}

function renderTransfersLog() {
  const container = document.getElementById('transfers-log-container');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) return;
  const transfers = getTransfers(user.id);

  if (transfers.length === 0) {
    container.innerHTML = `<div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">لا توجد عمليات تحويل مسجلة</div>`;
    return;
  }

  container.innerHTML = transfers.map(t => {
    const isSent = t.fromUserId === user.id;
    const arrowIcon = isSent
      ? `<div class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-sm flex-shrink-0"><i class="fa-solid fa-arrow-up"></i></div>`
      : `<div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm flex-shrink-0"><i class="fa-solid fa-arrow-down"></i></div>`;

    const textAction = isSent
      ? `<span class="text-red-600 font-bold">أرسلت</span> ${t.count} دعوة ${t.type} إلى <strong class="text-slate-800 dark:text-white">${escapeHtml(t.toUserName)}</strong>`
      : `<span class="text-emerald-700 font-bold">استلمت</span> ${t.count} دعوة ${t.type} من <strong class="text-slate-800 dark:text-white">${escapeHtml(t.fromUserName)}</strong>`;

    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          ${arrowIcon}
          <div>
            <div class="text-xs text-slate-700 dark:text-slate-200">${textAction}</div>
            <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span><i class="fa-regular fa-calendar-check ml-1"></i> ${escapeHtml(t.event)}</span>
            </div>
          </div>
        </div>
        <div class="text-left text-[11px] text-slate-400 font-mono">
          <div>${t.dateDisplay || 'الآن'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 11. مودال المشاركة
function setupShareModal() {
  const modal = document.getElementById('share-modal');
  const closeBtn = document.getElementById('close-share-modal');

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }

  document.getElementById('btn-copy-share-url')?.addEventListener('click', () => {
    const input = document.getElementById('share-url-field');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      alert('تم نسخ رابط الدعوة بنجاح!');
    });
  });
}

window.openShareModal = function(invId, guestName, relUrl) {
  const modal = document.getElementById('share-modal');
  if (!modal) return;

  const fullUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}${relUrl}`;
  document.getElementById('share-guest-title').textContent = `دعوة الضيف: ${guestName} (${invId})`;
  document.getElementById('share-url-field').value = fullUrl;

  const waBtn = document.getElementById('btn-wa-direct-send');
  if (waBtn) {
    const user = getCurrentUser();
    const gradName = user ? user.name : 'الخريج';
    const text = `🎓 *دعوة لحضور حفل التخرج*\n\nالمكرم/ة: *${guestName}* المحترم/ة\nيسرني دعوتكم لحضور حفل تخرج:\n*${gradName}*\n(كلية الحاسبات وتقنية المعلومات)\n\nتفضلوا بالاطلاع على بطاقة دعوتكم والباركود المخصص لكم:\n${fullUrl}`;
    waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  modal.classList.remove('hidden');
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

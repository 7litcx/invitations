/**
 * app.js - نظام وتطبيق إدارة الدعوات والتذاكر الذكية
 * حقوق التطوير والتصميم: Soul Media
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
// 1. إدارة المصادقة وتحديث الواجهة
function updateAuthUI() {
  const loginContainer = document.getElementById('login-container');
  const mainAppContainer = document.getElementById('main-app-container');
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

    // التعبئة التلقائية لاسم الخريج في نموذج إنشاء الدعوة
    const gradNameInput = document.getElementById('field-create-grad-name');
    if (gradNameInput && currentUser.name) {
      gradNameInput.value = currentUser.name;
    }

    renderEventStatistics();
    renderInvitationsTable();
    renderTransferStats();
    populateTransferRecipients();

    // مزامنة سحابية هادئة في الخلفية لتحديث البيانات والجداول تلقائياً
    Promise.all([
      syncUsersFromSupabase(),
      syncUserInvitations(currentUser.id),
      syncTransfersFromSupabase(currentUser.id)
    ]).then(() => {
      renderEventStatistics();
      renderInvitationsTable();
      renderTransferStats();
      renderTransfersLog();
      populateTransferRecipients();
    });
  } else {
    loginContainer?.classList.remove('hidden');
    mainAppContainer?.classList.add('hidden');
  }
}

function setupAuth() {
  const loginForm = document.getElementById('system-login-form');
  const errorAlert = document.getElementById('login-error-alert');
  const logoutBtn = document.getElementById('btn-logout-sidebar');

  updateAuthUI();

  // فحص خيار تذكرني واسترجاع اسم المستخدم المحفوظ
  const savedUsername = localStorage.getItem('grad_real_remembered_username_v4');
  const uInputEl = document.getElementById('login-username');
  const remEl = document.getElementById('login-remember');
  if (savedUsername && uInputEl) {
    uInputEl.value = savedUsername;
    if (remEl) remEl.checked = true;
  }

  // معالجة نموذج تسجيل الدخول (مرة واحدة فقط)
  if (loginForm && !loginForm.dataset.initialized) {
    loginForm.dataset.initialized = 'true';
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uInput = document.getElementById('login-username').value;
      const pInput = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember')?.checked ?? true;

      if (errorAlert) errorAlert.classList.add('hidden');

      const res = await loginUser(uInput, pInput, remember);

      if (res.success) {
        loginForm.reset();
        showToast.success(`مرحباً بك مجدداً، ${res.user.name}`, 'تم تسجيل الدخول');
        
        // إذا كان المستخدم أدمن، توجيهه فوراً وبشكل تلقائي إلى لوحة التحكم
        if (res.user.role === 'admin') {
          setTimeout(() => {
            window.location.href = 'admin.html';
          }, 400);
          return;
        }

        updateAuthUI();
      } else {
        if (errorAlert) {
          errorAlert.textContent = res.message || 'خطأ في اسم المستخدم أو كلمة المرور';
          errorAlert.classList.remove('hidden');
        }
        showToast.error(res.message || 'خطأ في اسم المستخدم أو كلمة المرور', 'فشل تسجيل الدخول');
      }
    });
  }

  // تسجيل الخروج (مرة واحدة فقط)
  if (logoutBtn && !logoutBtn.dataset.initialized) {
    logoutBtn.dataset.initialized = 'true';
    logoutBtn.addEventListener('click', () => {
      logoutUser();
      updateAuthUI();
      showToast.info('تم تسجيل الخروج بنجاح. نراك قريباً!', 'تسجيل الخروج');
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

  const mobileInv = document.getElementById('mobile-nav-invitations');
  const mobileCreate = document.getElementById('mobile-nav-create');
  const mobileTransfer = document.getElementById('mobile-nav-transfer');

  const sidebar = document.getElementById('app-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  
  const btnGotoTransfer = document.getElementById('btn-goto-transfer');
  const btnGotoCreate = document.getElementById('btn-goto-create');
  const btnBack = document.getElementById('btn-back-to-invitations');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  const viewInv = document.getElementById('view-invitations');
  const viewCreate = document.getElementById('view-create');
  const viewTransfer = document.getElementById('view-transfer');
  const viewEdit = document.getElementById('view-edit');
  const titleEl = document.getElementById('current-view-title');

  function closeMobileSidebar() {
    sidebar?.classList.remove('open');
    sidebarBackdrop?.classList.remove('active');
  }

  function openMobileSidebar() {
    sidebar?.classList.add('open');
    sidebarBackdrop?.classList.add('active');
  }

  window.switchTab = function(target) {
    [navInv, navCreate, navTransfer, mobileInv, mobileCreate, mobileTransfer].forEach(n => n?.classList.remove('active'));
    [viewInv, viewCreate, viewTransfer, viewEdit].forEach(v => v?.classList.add('hidden'));

    if (target === 'invitations') {
      navInv?.classList.add('active');
      mobileInv?.classList.add('active');
      viewInv?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'قائمة الدعوات';
      renderEventStatistics();
      renderInvitationsTable();
    } else if (target === 'create') {
      navCreate?.classList.add('active');
      mobileCreate?.classList.add('active');
      viewCreate?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'إنشاء دعوة جديدة';
      const curUser = getCurrentUser();
      const gradInput = document.getElementById('field-create-grad-name');
      if (gradInput && curUser && curUser.name) {
        gradInput.value = curUser.name;
      }
      updateCreateFormQuotaState();
    } else if (target === 'transfer') {
      navTransfer?.classList.add('active');
      mobileTransfer?.classList.add('active');
      viewTransfer?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'تحويل الدعوات';
      renderTransferStats();
      renderTransfersLog();
      populateTransferRecipients();
      syncUsersFromSupabase().then(() => {
        populateTransferRecipients();
        renderTransferStats();
        renderEventStatistics();
      });
      syncTransfersFromSupabase(getCurrentUser()?.id).then(() => {
        renderTransfersLog();
      });
    } else if (target === 'edit') {
      viewEdit?.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'تعديل بيانات الدعوة';
    }

    closeMobileSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navInv?.addEventListener('click', () => switchTab('invitations'));
  navCreate?.addEventListener('click', () => switchTab('create'));
  navTransfer?.addEventListener('click', () => switchTab('transfer'));

  mobileInv?.addEventListener('click', () => switchTab('invitations'));
  mobileCreate?.addEventListener('click', () => switchTab('create'));
  mobileTransfer?.addEventListener('click', () => switchTab('transfer'));
  
  btnGotoTransfer?.addEventListener('click', () => switchTab('transfer'));
  btnGotoCreate?.addEventListener('click', () => switchTab('create'));
  btnBack?.addEventListener('click', () => switchTab('invitations'));
  btnCancelEdit?.addEventListener('click', () => switchTab('invitations'));

  document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
    if (sidebar?.classList.contains('open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  btnCloseSidebar?.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop?.addEventListener('click', closeMobileSidebar);
}

// 4. الوضع الليلي الإجباري المعتمد
function setupDarkMode() {
  document.documentElement.classList.add('dark');
  document.body.classList.add('dark');
  localStorage.setItem('theme_dark', 'true');
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
    if (filters.event === 'wedding' || filters.event === 'private' || filters.event === 'graduation') {
      invitations = invitations.filter(inv => (inv.eventType || (typeof detectEventType === 'function' ? detectEventType(inv.event) : 'graduation')) === filters.event);
    } else {
      invitations = invitations.filter(inv => inv.event === filters.event);
    }
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

    const eventType = inv.eventType || (typeof detectEventType === 'function' ? detectEventType(inv.event) : 'graduation');
    let eventBadge = '';
    if (eventType === 'wedding') {
      eventBadge = `<span class="badge-event-wedding"><i class="fa-solid fa-ring"></i> ${escapeHtml(inv.event || 'حفل زواج')}</span>`;
    } else if (eventType === 'private') {
      eventBadge = `<span class="badge-event-private"><i class="fa-solid fa-sparkles"></i> ${escapeHtml(inv.event || 'مناسبة خاصة')}</span>`;
    } else {
      eventBadge = `<span class="badge-event-grad"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(inv.event || 'حفل تخرج')}</span>`;
    }

    const ticketUrl = `ticket.html?id=${inv.id}`;

    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 table-cell-id">${escapeHtml(inv.id)}</td>
        <td class="py-3 px-4 font-bold text-xs text-slate-900 dark:text-white table-cell-guest">${escapeHtml(inv.guestName)}</td>
        <td class="py-3 px-4 font-mono text-xs dir-ltr text-right text-slate-700 dark:text-slate-200 table-cell-phone">${escapeHtml(inv.phone)}</td>
        <td class="py-3 px-4 font-semibold text-xs text-slate-700 dark:text-slate-300 table-cell-grad">${escapeHtml(inv.graduateName)}</td>
        <td class="py-3 px-4 text-xs table-cell-event">${eventBadge}</td>
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
            <button onclick="handleDeleteInvitation('${inv.id}', '${escapeHtml(inv.guestName)}')" class="btn-action-delete" title="حذف الدعوة">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateEditHostLabel(type) {
  const labelEl = document.getElementById('edit-host-label');
  if (!labelEl) return;
  if (type === 'wedding') {
    labelEl.textContent = 'اسم العريس / الداعي';
  } else if (type === 'private') {
    labelEl.textContent = 'صاحب المناسبة / الداعي';
  } else {
    labelEl.textContent = 'اسم الخريج (الداعي)';
  }
}

// 8. شاشة تعديل بيانات الدعوة
window.openEditView = function(invId) {
  const inv = getInvitation(invId);
  if (!inv) return;

  const eventType = inv.eventType || (typeof detectEventType === 'function' ? detectEventType(inv.event) : 'graduation');

  document.getElementById('edit-inv-id').value = inv.id;
  document.getElementById('edit-field-guest').value = inv.guestName;
  document.getElementById('edit-field-phone').value = inv.phone;
  document.getElementById('edit-field-grad-name').value = inv.graduateName;
  document.getElementById('edit-field-people-count').value = inv.peopleCount || 1;
  
  const typeSelect = document.getElementById('edit-field-event-type');
  if (typeSelect) typeSelect.value = eventType;

  document.getElementById('edit-field-event').value = inv.event;
  updateEditHostLabel(eventType);
  
  // إخفاء حقل VIP عند اختيار زواج أو مناسبة خاصة في شاشة التعديل
  const editVipContainer = document.getElementById('edit-field-type-container');
  if (eventType === 'wedding' || eventType === 'private') {
    editVipContainer?.classList.add('hidden');
    document.getElementById('edit-field-type').value = 'عادية';
  } else {
    editVipContainer?.classList.remove('hidden');
  }

  window.switchTab('edit');
};

function setupEditForm() {
  const form = document.getElementById('edit-invite-form');
  if (!form) return;

  document.getElementById('edit-field-event-type')?.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    updateEditHostLabel(selectedType);
    const editVipContainer = document.getElementById('edit-field-type-container');
    if (selectedType === 'wedding' || selectedType === 'private') {
      editVipContainer?.classList.add('hidden');
      document.getElementById('edit-field-type').value = 'عادية';
    } else {
      editVipContainer?.classList.remove('hidden');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-inv-id').value;
    const guestName = document.getElementById('edit-field-guest').value.trim();
    const phone = document.getElementById('edit-field-phone').value.trim();
    const gradName = document.getElementById('edit-field-grad-name').value.trim();
    const peopleCount = parseInt(document.getElementById('edit-field-people-count').value, 10) || 1;
    const eventType = document.getElementById('edit-field-event-type')?.value || 'graduation';
    const event = document.getElementById('edit-field-event').value.trim();
    const type = document.getElementById('edit-field-type').value;
    const notes = document.getElementById('edit-field-notes').value.trim();

    const res = await updateInvitation(id, {
      guestName,
      phone,
      graduateName: gradName,
      peopleCount,
      event,
      eventType,
      type,
      notes
    });

    if (res && res.success === false) {
      showToast.error(res.message, 'تعذر تعديل الدعوة');
      return;
    }

    showToast.success('تم حفظ تعديلات بيانات الدعوة بنجاح!', 'تم التحديث');
    window.switchTab('invitations');
  });

  // زر حذف الدعوة من شاشة التعديل
  document.getElementById('btn-delete-from-edit')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-inv-id').value;
    const guestName = document.getElementById('edit-field-guest').value;
    if (id) {
      await handleDeleteInvitation(id, guestName, true);
    }
  });
}

// خاصية حذف الدعوة واسترجاع الكوتا فورياً
window.handleDeleteInvitation = async function(invId, guestName, fromEdit = false) {
  const nameDisplay = guestName ? `دعوة <strong>"${escapeHtml(guestName)}"</strong>` : `الدعوة رقم (<strong>${invId}</strong>)`;

  const confirmed = await showConfirmModal({
    title: 'حذف الدعوة',
    message: `هل أنت متأكد من رغبتك في حذف ${nameDisplay}؟<br><span class="text-[11px] text-slate-400 block mt-1.5">سيتم إلغاء صلاحية التذكرة فوراً، واسترجاع رصيد الدعوة إلى حسابك.</span>`,
    confirmText: 'نعم، احذف الدعوة',
    cancelText: 'تراجع',
    type: 'danger',
    icon: 'fa-solid fa-trash-can'
  });

  if (!confirmed) return;

  const success = await deleteInvitation(invId);
  if (success) {
    const successMsg = guestName 
      ? `تم حذف دعوة (${guestName}) وإعادة الرصيد إلى حسابك بنجاح.` 
      : 'تم حذف الدعوة وإعادة الرصيد إلى حسابك بنجاح.';
    showToast.success(successMsg, 'تم الحذف');
    renderEventStatistics();
    renderInvitationsTable();
    renderTransferStats();
    updateCreateFormQuotaState();

    if (fromEdit) {
      window.switchTab('invitations');
    }
  } else {
    showToast.error('تعذر حذف الدعوة، يرجى إعادة المحاولة لاحقاً.', 'خطأ في الحذف');
  }
};

// فحص وإدارة حالة الكوتا في نموذج إنشاء الدعوة
function updateCreateFormQuotaState() {
  const user = getCurrentUser();
  if (!user) return;

  const stats = getUserStats(user.id);
  const typeSelect = document.getElementById('field-create-type');
  const exhaustedBanner = document.getElementById('create-quota-exhausted-banner');
  const typeWarning = document.getElementById('create-type-quota-warning');
  const typeWarningText = document.getElementById('create-type-quota-warning-text');
  const submitBtn = document.getElementById('btn-submit-create-invite');

  if (!typeSelect || !submitBtn) return;

  // تحديث نصوص خيارات نوع الدعوة مع إبراز الرصيد المتبقي
  const regOption = typeSelect.querySelector('option[value="عادية"]');
  const vipOption = typeSelect.querySelector('option[value="VIP"]');

  if (regOption) {
    regOption.textContent = `دعوة عادية (المتبقي: ${stats.regularRemaining})`;
    regOption.disabled = stats.regularRemaining <= 0;
  }
  if (vipOption) {
    vipOption.textContent = `دعوة VIP (المتبقي: ${stats.vipRemaining})`;
    vipOption.disabled = stats.vipRemaining <= 0;
  }

  const selectedType = typeSelect.value;
  const isSelectedExhausted = (selectedType === 'VIP' && stats.vipRemaining <= 0) ||
                             (selectedType === 'عادية' && stats.regularRemaining <= 0);

  // إذا انتهت الكوتا بالكامل (عادية + VIP)
  if (stats.regularRemaining <= 0 && stats.vipRemaining <= 0) {
    exhaustedBanner?.classList.remove('hidden');
    typeWarning?.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
    submitBtn.innerHTML = '<i class="fa-solid fa-ban ml-1.5"></i> <span>عذراً، استنفذت كامل رصيد الدعوات (0 متبقي)</span>';
    return;
  }

  // إذا كان النوع المحدد فقط هو المستنفذ
  if (isSelectedExhausted) {
    exhaustedBanner?.classList.add('hidden');
    typeWarning?.classList.remove('hidden');
    if (typeWarningText) {
      typeWarningText.textContent = `تنبيه: لا يوجد رصيد متبقٍ للدعوات الـ ${selectedType} (0 متبقي). يرجى اختيار نوع دعوة آخر أو التواصل مع الإدارة.`;
    }
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
    submitBtn.innerHTML = `<i class="fa-solid fa-ban ml-1.5"></i> <span>رصيد الدعوات الـ ${selectedType} مستنفذ</span>`;
    return;
  }

  // يوجد رصيد متاح
  exhaustedBanner?.classList.add('hidden');
  typeWarning?.classList.add('hidden');
  submitBtn.disabled = false;
  submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
  submitBtn.innerHTML = '<i class="fa-solid fa-plus-circle ml-1.5"></i> <span>إنشاء الدعوة</span>';
}

function populateCreateEvents(selectedType = 'wedding') {
  const select = document.getElementById('field-create-event');
  if (!select) return;

  const events = typeof getEventsList === 'function' ? getEventsList() : DEFAULT_EVENTS;
  const filtered = events.filter(e => (e.type || (typeof detectEventType === 'function' ? detectEventType(e.name) : 'graduation')) === selectedType);

  let optionsHtml = '';
  if (filtered.length > 0) {
    optionsHtml = filtered.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)} (${e.dateDisplay || ''})</option>`).join('');
  } else {
    const defaultName = selectedType === 'wedding' ? 'حفل زفاف مبارك' : (selectedType === 'private' ? 'مناسبة خاصة واحتفال VIP' : 'حفل التخرج 2026');
    optionsHtml = `<option value="${defaultName}">${defaultName}</option>`;
  }
  select.innerHTML = optionsHtml;
}

function updateCreateHostLabel(type) {
  const hostLabel = document.getElementById('field-create-host-label');
  const gradInput = document.getElementById('field-create-grad-name');
  if (!hostLabel) return;
  if (type === 'wedding') {
    hostLabel.textContent = 'اسم العريس / الداعي (أهل العرس)';
    if (gradInput) gradInput.placeholder = 'مثال: الداعي / عائلة فلان';
  } else if (type === 'private') {
    hostLabel.textContent = 'صاحب المناسبة / الداعي';
    if (gradInput) gradInput.placeholder = 'اسم صاحب الدعوة أو المنظم';
  } else {
    hostLabel.textContent = 'اسم الخريج (الداعي)';
    if (gradInput) gradInput.placeholder = 'اسم الخريج';
  }
}

// 9. نموذج إنشاء دعوة جديدة
function setupCreateForm() {
  const form = document.getElementById('create-invite-form');
  if (!form) return;

  const initUser = getCurrentUser();
  const initGradInput = document.getElementById('field-create-grad-name');
  if (initGradInput && initUser && initUser.name) {
    initGradInput.value = initUser.name;
  }

  // تهيئة قائمة الفعاليات لنوع المناسبة المختار
  const typeSelect = document.getElementById('field-create-event-type');
  const initialType = typeSelect ? typeSelect.value : 'wedding';
  updateCreateHostLabel(initialType);
  populateCreateEvents(initialType);

  const updateCreateVipVisibility = (type) => {
    const typeWrapper = document.getElementById('field-create-type-wrapper');
    const typeField = document.getElementById('field-create-type');
    if (type === 'wedding' || type === 'private') {
      typeWrapper?.classList.add('hidden');
      if (typeField) typeField.value = 'عادية';
    } else {
      typeWrapper?.classList.remove('hidden');
    }
  };

  updateCreateVipVisibility(initialType);

  typeSelect?.addEventListener('change', (e) => {
    const type = e.target.value;
    updateCreateHostLabel(type);
    populateCreateEvents(type);
    updateCreateVipVisibility(type);
    updateCreateFormQuotaState();
  });

  // تحديث حالة الكوتا عند تغيير نوع الدعوة
  document.getElementById('field-create-type')?.addEventListener('change', () => {
    updateCreateFormQuotaState();
  });

  updateCreateFormQuotaState();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const eventType = document.getElementById('field-create-event-type')?.value || 'wedding';
    const isVipHidden = (eventType === 'wedding' || eventType === 'private');

    // فحص صارم للكوتا قبل الإرسال
    const stats = getUserStats(user.id);
    const type = isVipHidden ? 'عادية' : document.getElementById('field-create-type').value;
    const remaining = type === 'VIP' ? stats.vipRemaining : stats.regularRemaining;

    if (remaining <= 0) {
      showToast.error(`عذراً، لقد استنفذت كامل رصيدك من الدعوات الـ ${type} (0 متبقي). لا يمكن إنشاء دعوة جديدة.`, 'الرصيد مستنفذ');
      updateCreateFormQuotaState();
      return;
    }

    const guestName = document.getElementById('field-create-guest').value.trim();
    const phone = document.getElementById('field-create-phone').value.trim();
    const gradName = document.getElementById('field-create-grad-name').value.trim();
    const notes = document.getElementById('field-create-notes').value.trim();
    const eventType = document.getElementById('field-create-event-type')?.value || 'wedding';
    const eventName = document.getElementById('field-create-event').value;

    const result = await createInvitation(user.id, {
      guestName,
      phone,
      type,
      graduateName: gradName || user.name,
      major: user.major || 'عام',
      notes,
      event: eventName,
      eventType
    });

    if (!result.success) {
      showToast.error(result.message, 'تعذر إنشاء الدعوة');
      updateCreateFormQuotaState();
      return;
    }

    form.reset();
    document.getElementById('field-create-grad-name').value = user.name;
    const curType = document.getElementById('field-create-event-type')?.value || 'wedding';
    updateCreateHostLabel(curType);
    populateCreateEvents(curType);
    updateCreateFormQuotaState();
    showToast.success(`تم إنشاء الدعوة بنجاح للضيف (${guestName})! جارٍ فتح التذكرة...`, 'تم إصدار الدعوة');

    // فتح صفحة الدعوة والباركود للضيف على الفور
    setTimeout(() => {
      window.location.href = `ticket.html?id=${result.invitation.id}`;
    }, 450);
  });
}

// 10. قسم تحويل الدعوات
function populateTransferRecipients() {
  const user = getCurrentUser();
  const recipientSelect = document.getElementById('transfer-recipient-select');
  if (!recipientSelect || !user) return;

  const currentVal = recipientSelect.value;
  let otherUsers = getUsers().filter(u => u.id !== user.id && u.role !== 'admin');
  
  if (otherUsers.length === 0) {
    otherUsers = getUsers().filter(u => u.id !== user.id);
  }

  if (otherUsers.length === 0) {
    recipientSelect.innerHTML = `<option value="">لا يوجد مستخدمون آخرون مسجلون حالياً...</option>`;
    return;
  }

  recipientSelect.innerHTML = `
    <option value="">اختر الخريج المستقبل للدعوات...</option>
    ${otherUsers.map(u => `
      <option value="${u.id}" ${u.id === currentVal ? 'selected' : ''}>
        ${escapeHtml(u.name)} (${escapeHtml(u.major || 'خريج')})
      </option>
    `).join('')}
  `;
}

function updateTransferCountLimits() {
  const user = getCurrentUser();
  if (!user) return;
  const stats = getUserStats(user.id);
  const typeSelect = document.getElementById('transfer-type-select');
  const countInput = document.getElementById('transfer-count-input');
  if (!countInput) return;

  const type = typeSelect ? typeSelect.value : 'عادية';
  const maxAvailable = type === 'VIP' ? stats.vipRemaining : stats.regularRemaining;

  countInput.max = maxAvailable;
  if (maxAvailable === 0) {
    countInput.value = 0;
  } else if (parseInt(countInput.value, 10) > maxAvailable || parseInt(countInput.value, 10) <= 0) {
    countInput.value = 1;
  }
}

function setupTransferSection() {
  populateTransferRecipients();

  const typeSelect = document.getElementById('transfer-type-select');
  if (typeSelect) {
    typeSelect.addEventListener('change', updateTransferCountLimits);
  }

  const submitBtn = document.getElementById('btn-submit-transfer');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
      }

      const recipientSelect = document.getElementById('transfer-recipient-select');
      const recipientId = recipientSelect?.value;
      const eventName = document.getElementById('transfer-event-select')?.value;
      const type = document.getElementById('transfer-type-select')?.value || 'عادية';
      const count = document.getElementById('transfer-count-input')?.value;
      const notes = document.getElementById('transfer-notes')?.value;

      if (!recipientId) {
        showToast.warning('يرجى اختيار الخريج المستقبل للتحويل.', 'حقل مطلوب');
        return;
      }

      const countNum = parseInt(count, 10);
      if (isNaN(countNum) || countNum <= 0) {
        showToast.warning('يرجى تحديد عدد صحيح موجب من الدعوات (1 فأكثر).', 'تنبيه');
        return;
      }

      const origHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري التحويل...</span>';

      try {
        const res = await transferInvitations(user.id, recipientId, countNum, type, eventName, notes);
        if (!res.success) {
          showToast.error(res.message, 'تعذر التحويل');
          return;
        }

        showToast.success(res.message, 'تم التحويل بنجاح');
        document.getElementById('transfer-notes').value = '';
        renderTransferStats();
        renderTransfersLog();
        renderEventStatistics();
        updateTransferCountLimits();
      } catch (err) {
        showToast.error('حدث خطأ أثناء إجراء التحويل، يرجى إعادة المحاولة.', 'خطأ في العملية');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
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

  updateTransferCountLimits();
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
      showToast.success('تم نسخ رابط الدعوة إلى الحافظة بنجاح!', 'تم النسخ');
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
    const majorText = (user && user.major) ? `\nالتخصص: *${user.major}*` : '';
    const text = `🎓 *بطاقة دعوة رسمية لحضور حفل التخرج*\n\nالمكرم/ة: *${guestName}* المحترم/ة\nيسرني دعوتكم لحضور حفل تخرج:\n*${gradName}*${majorText}\n\nيرجى فتح الرابط لإبراز بطاقة دعوتكم والباركود المخصص لكم:\n${fullUrl}`;
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

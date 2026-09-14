/**
 * admin.js - منطق لوحة المشرف لإدارة المستخدمين، الكوتا، وإعدادات Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
  initStore();
  setupAdminLogout();
  setupSupabaseConfig();
  renderUsersTable();
  renderAdminInvitationsTable();
  setupCreateUserForm();
  setupQuotaModal();
  setupCsvExport();
  setupAdminFilterTabs();
  setupBarcodeScanner();
  setupUserSearch();
  setupInvitationSearch();
  setupDeleteAllInvitations();

  // جلب كافة المستخدمين والدعوات من Supabase وتحديث الجداول
  await Promise.all([
    syncUsersFromSupabase(),
    syncUserInvitations()
  ]);
  renderUsersTable();
  renderAdminInvitationsTable();
});

// 1. إعداد Supabase (يعمل تلقائياً من الإعدادات المدمجة)
function setupSupabaseConfig() {
  const form = document.getElementById('supabase-config-form');
  if (!form) return;

  const urlInput = document.getElementById('sb-url');
  const keyInput = document.getElementById('sb-key');
  const statusBadge = document.getElementById('supabase-status-badge');

  const config = getSupabaseConfig();
  if (urlInput) urlInput.value = config.url || '';
  if (keyInput) keyInput.value = config.anonKey || '';

  if (config.url && config.anonKey && statusBadge) {
    if (statusBadge) {
      statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
      statusBadge.textContent = 'متصل بـ Supabase';
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();

      saveSupabaseConfig(url, key);
      const sb = getSupabase();

      if (sb) {
        try {
          const { error } = await sb.from('users').select('id').limit(1);
          if (!error) {
            statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
            statusBadge.textContent = 'تم الاتصال بـ Supabase بنجاح!';
            alert('تم الاتصال بقاعدة بيانات Supabase وحفظ المفاتيح بنجاح!');
            return;
          }
        } catch (err) {
          console.warn('Supabase test query failed:', err);
        }
      }

      alert('تم حفظ الإعدادات، يرجى التأكد من تشغيل ملف supabase_schema.sql في Supabase أولاً.');
    });
  }
}

// 2. نموذج إنشاء مستخدم جديد
function setupCreateUserForm() {
  const form = document.getElementById('create-user-form');
  if (!form) return;

  const majorSelect = document.getElementById('new-major');
  const vipContainer = document.getElementById('new-quota-vip-container');
  const regContainer = document.getElementById('new-quota-regular-container');
  const regLabel = document.getElementById('new-quota-regular-label');
  const regHint = document.getElementById('new-quota-regular-hint');
  const vipInput = document.getElementById('new-quota-vip');

  const updateVipVisibility = () => {
    const val = majorSelect ? majorSelect.value : 'حفل تخرج';
    if (val === 'زواج' || val === 'مناسبة خاصة') {
      vipContainer?.classList.add('hidden');
      regContainer?.classList.add('sm:col-span-2');
      if (regLabel) regLabel.textContent = 'إجمالي عدد الدعوات المسموحة *';
      if (regHint) regHint.textContent = 'الافتراضي: 30 دعوة لكل مستخدم';
      if (vipInput) vipInput.value = 0;
    } else {
      vipContainer?.classList.remove('hidden');
      regContainer?.classList.remove('sm:col-span-2');
      if (regLabel) regLabel.textContent = 'عدد الدعوات العادية *';
      if (regHint) regHint.textContent = 'الافتراضي: 27 دعوة عادية لكل مستخدم';
      if (vipInput && (vipInput.value === '0' || !vipInput.value)) {
        vipInput.value = 3;
      }
    }
  };

  majorSelect?.addEventListener('change', updateVipVisibility);
  updateVipVisibility();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const name = document.getElementById('new-fullname').value.trim();
    const major = majorSelect ? majorSelect.value.trim() : 'حفل تخرج';
    const regularQuota = parseInt(document.getElementById('new-quota-regular').value, 10) || 0;
    const isVipHidden = (major === 'زواج' || major === 'مناسبة خاصة');
    const vipQuota = isVipHidden ? 0 : (parseInt(document.getElementById('new-quota-vip').value, 10) || 0);

    const res = await createUserByAdmin({
      username,
      password,
      name,
      major,
      regularQuota,
      vipQuota,
      role: 'user'
    });

    if (!res.success) {
      showToast.error(res.message, 'تعذر إنشاء الحساب');
      return;
    }

    form.reset();
    document.getElementById('new-quota-regular').value = isVipHidden ? 30 : 27;
    if (vipInput) vipInput.value = isVipHidden ? 0 : 3;
    updateVipVisibility();
    renderUsersTable();
    showToast.success(`تم إنشاء حساب الداعي (${name}) بنجاح!\nاسم الدخول: ${username}`, 'تم إنشاء الحساب');
  });
}

// بحث حسابات المستخدمين
let userSearchQuery = '';

function setupUserSearch() {
  const input = document.getElementById('search-admin-users');
  input?.addEventListener('input', (e) => {
    userSearchQuery = e.target.value.trim().toLowerCase();
    renderUsersTable();
  });
}

// 3. عرض جدول المستخدمين
function renderUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  let users = getUsers();
  const allInvitations = getInvitations();

  // تصفية المستخدمين بناءً على كلمة البحث
  if (userSearchQuery) {
    users = users.filter(u => 
      (u.name && u.name.toLowerCase().includes(userSearchQuery)) ||
      (u.username && u.username.toLowerCase().includes(userSearchQuery)) ||
      (u.major && u.major.toLowerCase().includes(userSearchQuery))
    );
  }

  if (users.length === 0) {
    const emptyMsg = userSearchQuery 
      ? `لا توجد حسابات تطابق بحثك: "${escapeHtml(userSearchQuery)}"`
      : 'لا يوجد مستخدمون مسجلون';
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400">${emptyMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(user => {
    const userInvs = allInvitations.filter(i => i.userId === user.id);
    const regUsed = userInvs.filter(i => i.type === 'عادية').length;
    const vipUsed = userInvs.filter(i => i.type === 'VIP').length;
    const totalUsed = userInvs.length;

    const regQuota = user.regularQuota !== undefined ? user.regularQuota : 30;
    const vipQuota = user.vipQuota !== undefined ? user.vipQuota : 0;

    const regRemaining = Math.max(0, regQuota - regUsed);
    const vipRemaining = Math.max(0, vipQuota - vipUsed);

    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${escapeHtml(user.name)}</td>
        <td class="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400 dir-ltr text-right">${escapeHtml(user.username)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr text-right">${escapeHtml(user.password)}</td>
        <td class="py-3 px-4 text-slate-600 dark:text-slate-300">${escapeHtml(user.major)}</td>
        <td class="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
          <span class="text-indigo-600 dark:text-indigo-400">${regQuota}</span>
          <span class="text-[10px] text-slate-400 font-normal">(${regRemaining} متبقية)</span>
        </td>
        <td class="py-3 px-4 font-bold font-mono text-amber-600 dark:text-amber-400">
          <span>${vipQuota}</span>
          <span class="text-[10px] text-amber-700/70 dark:text-amber-500/70 font-normal">(${vipRemaining} متبقية)</span>
        </td>
        <td class="py-3 px-4 font-semibold font-mono text-slate-700 dark:text-slate-200">${totalUsed} دعوة</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="promptEditUser('${user.id}')" class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg transition hover:bg-indigo-100 dark:hover:bg-indigo-900/50" title="تعديل بيانات وحساب الخريج">
              <i class="fa-solid fa-pen-to-square"></i>
              <span>تعديل</span>
            </button>
            ${user.role !== 'admin' && user.username !== 'admin' ? `
            <button onclick="handleAdminDeleteUser('${user.id}', '${escapeHtml(user.name)}')" class="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/40 rounded-lg transition hover:bg-rose-100 dark:hover:bg-rose-900/50" title="حذف حساب الخريج">
              <i class="fa-regular fa-trash-can"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateModalVipVisibility(major) {
  const vipContainer = document.getElementById('quota-modal-vip-container');
  const regContainer = document.getElementById('quota-modal-reg-container');
  const regLabel = document.getElementById('quota-modal-reg-label');
  const vipInput = document.getElementById('quota-modal-vip');

  if (major === 'زواج' || major === 'مناسبة خاصة') {
    vipContainer?.classList.add('hidden');
    regContainer?.classList.add('sm:col-span-2');
    if (regLabel) regLabel.textContent = 'إجمالي الدعوات المسموحة *';
    if (vipInput) vipInput.value = 0;
  } else {
    vipContainer?.classList.remove('hidden');
    regContainer?.classList.remove('sm:col-span-2');
    if (regLabel) regLabel.textContent = 'الدعوات العادية *';
  }
}

// نافذة تعديل بيانات وحساب الخريج والكوتا
window.promptEditUser = function(userId) {
  const modal = document.getElementById('quota-modal');
  if (!modal) return;

  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    showToast.error('لم يتم العثور على بيانات المستخدم', 'خطأ');
    return;
  }

  const regQuota = user.regularQuota !== undefined ? user.regularQuota : 30;
  const vipQuota = user.vipQuota !== undefined ? user.vipQuota : 0;

  let selectedMajor = user.major || 'حفل تخرج';
  if (selectedMajor.includes('زواج') || selectedMajor === 'wedding') {
    selectedMajor = 'زواج';
  } else if (selectedMajor.includes('خاصة') || selectedMajor === 'private') {
    selectedMajor = 'مناسبة خاصة';
  } else {
    selectedMajor = 'حفل تخرج';
  }

  document.getElementById('quota-modal-userid').value = user.id;
  document.getElementById('quota-modal-fullname').value = user.name || '';
  document.getElementById('quota-modal-username-val').value = user.username || '';
  document.getElementById('quota-modal-password').value = user.password || '';
  document.getElementById('quota-modal-major').value = selectedMajor;
  document.getElementById('quota-modal-reg').value = regQuota;
  document.getElementById('quota-modal-vip').value = vipQuota;

  updateModalVipVisibility(selectedMajor);

  modal.classList.remove('hidden');
};

// للتوافق مع أي استدعاءات سابقة
window.promptEditUserQuota = function(userId) {
  window.promptEditUser(userId);
};

function setupQuotaModal() {
  const modal = document.getElementById('quota-modal');
  const form = document.getElementById('quota-modal-form');
  const closeBtn = document.getElementById('close-quota-modal');
  const cancelBtn = document.getElementById('cancel-quota-modal');
  const majorSelect = document.getElementById('quota-modal-major');

  const closeModal = () => modal?.classList.add('hidden');

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  majorSelect?.addEventListener('change', (e) => {
    updateModalVipVisibility(e.target.value);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('quota-modal-userid').value;
    const name = document.getElementById('quota-modal-fullname').value.trim();
    const username = document.getElementById('quota-modal-username-val').value.trim();
    const password = document.getElementById('quota-modal-password').value.trim();
    const major = majorSelect ? majorSelect.value.trim() : 'حفل تخرج';
    const isVipHidden = (major === 'زواج' || major === 'مناسبة خاصة');
    const newReg = parseInt(document.getElementById('quota-modal-reg').value, 10);
    const newVip = isVipHidden ? 0 : parseInt(document.getElementById('quota-modal-vip').value, 10);

    if (!name || !username || !password) {
      showToast.warning('يرجى ملء جميع الحقول الإلزامية (الاسم، اسم المستخدم، كلمة المرور).', 'تنبيه');
      return;
    }

    if (isNaN(newReg) || newReg < 0 || (!isVipHidden && (isNaN(newVip) || newVip < 0))) {
      showToast.warning('يرجى إدخال أرقام صحيحة أكبر من أو تساوي الصفر للكوتا.', 'تنبيه');
      return;
    }

    const res = await updateUserByAdmin(userId, {
      name,
      username,
      password,
      major,
      regularQuota: newReg,
      vipQuota: newVip
    });

    if (!res.success) {
      showToast.error(res.message, 'تعذر تعديل الحساب');
      return;
    }

    renderUsersTable();
    closeModal();
    showToast.success(`تم تحديث بيانات وحساب (${name}) بنجاح!\nاسم المستخدم: ${username}`, 'تم التعديل بنجاح');
  });
}

// بحث سجل الدعوات
let invSearchQuery = '';

function setupInvitationSearch() {
  const input = document.getElementById('search-admin-invitations');
  input?.addEventListener('input', (e) => {
    invSearchQuery = e.target.value.trim().toLowerCase();
    renderAdminInvitationsTable();
  });
}

// 4. عرض جميع الدعوات مع التصفية وسجل الدعوات المستخدمة
let currentAdminFilter = 'all'; // 'all' | 'valid' | 'used'

function renderAdminInvitationsTable() {
  const tbody = document.getElementById('admin-invitations-table-body');
  if (!tbody) return;

  const allInvitations = getInvitations();
  
  // تحديث عدادات التبويبات الكلية
  const validCount = allInvitations.filter(i => i.status === 'صالحة').length;
  const usedCount = allInvitations.filter(i => i.status === 'مستخدمة').length;

  const countAllEl = document.getElementById('count-inv-all');
  const countValidEl = document.getElementById('count-inv-valid');
  const countUsedEl = document.getElementById('count-inv-used');

  if (countAllEl) countAllEl.textContent = allInvitations.length;
  if (countValidEl) countValidEl.textContent = validCount;
  if (countUsedEl) countUsedEl.textContent = usedCount;

  // تصفية الدعوات بناءً على التبويب النشط
  let filtered = allInvitations;
  if (currentAdminFilter === 'valid') {
    filtered = allInvitations.filter(i => i.status === 'صالحة');
  } else if (currentAdminFilter === 'used') {
    filtered = allInvitations.filter(i => i.status === 'مستخدمة');
  }

  // تصفية إضافية بناءً على نص البحث
  if (invSearchQuery) {
    filtered = filtered.filter(i => 
      (i.id && i.id.toLowerCase().includes(invSearchQuery)) ||
      (i.guestName && i.guestName.toLowerCase().includes(invSearchQuery)) ||
      (i.phone && i.phone.toLowerCase().includes(invSearchQuery)) ||
      (i.graduateName && i.graduateName.toLowerCase().includes(invSearchQuery))
    );
  }

  if (filtered.length === 0) {
    let emptyMsg = 'لا توجد أي دعوات صادرة حتى الآن.';
    if (invSearchQuery) {
      emptyMsg = `لا توجد نتائج تطابق بحثك: "${escapeHtml(invSearchQuery)}"`;
    } else if (currentAdminFilter === 'used') {
      emptyMsg = 'لا توجد أي دعوات مستخدمة حتى الآن.';
    } else if (currentAdminFilter === 'valid') {
      emptyMsg = 'لا توجد دعوات صالحة حالياً.';
    }
    tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-slate-400">${emptyMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(inv => {
    const ticketUrl = `ticket.html?id=${inv.id}`;
    // تنسيق التاريخ الميلادي بصيغة واضحة YYYY-MM-DD
    const gregDate = inv.createdAt 
      ? new Date(inv.createdAt).toISOString().split('T')[0] 
      : '-';

    const eventType = inv.eventType || (typeof detectEventType === 'function' ? detectEventType(inv.event) : 'graduation');
    let eventBadge = '';
    if (eventType === 'wedding') {
      eventBadge = `<span class="badge-event-wedding"><i class="fa-solid fa-ring"></i> ${escapeHtml(inv.event || 'حفل زواج')}</span>`;
    } else if (eventType === 'private') {
      eventBadge = `<span class="badge-event-private"><i class="fa-solid fa-sparkles"></i> ${escapeHtml(inv.event || 'مناسبة خاصة')}</span>`;
    } else {
      eventBadge = `<span class="badge-event-grad"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(inv.event || 'حفل تخرج')}</span>`;
    }

    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">${inv.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${escapeHtml(inv.guestName)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr text-right">${escapeHtml(inv.phone)}</td>
        <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">${escapeHtml(inv.graduateName)}</td>
        <td class="py-3 px-4 text-xs">${eventBadge}</td>
        <td class="py-3 px-4">${inv.type === 'VIP' ? '<span class="badge-vip text-[10px]">VIP</span>' : '<span class="text-xs text-slate-500">عادية</span>'}</td>
        <td class="py-3 px-4">${inv.status === 'صالحة' ? '<span class="badge-status-valid text-xs">صالحة</span>' : '<span class="badge-status-used text-xs">مستخدمة</span>'}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-400 dir-ltr text-right">${gregDate}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <a href="${ticketUrl}" target="_blank" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition text-[11px] font-bold" title="معاينة التذكرة">
              معاينة &larr;
            </a>
            <button onclick="handleAdminDeleteInvitation('${inv.id}', '${escapeHtml(inv.guestName)}')" class="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 transition text-[11px] font-bold cursor-pointer" title="حذف الدعوة">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupAdminFilterTabs() {
  const btnAll = document.getElementById('admin-tab-all');
  const btnValid = document.getElementById('admin-tab-valid');
  const btnUsed = document.getElementById('admin-tab-used');

  const setFilter = (filter, btn) => {
    currentAdminFilter = filter;
    document.querySelectorAll('.admin-inv-filter-btn').forEach(b => b.classList.remove('active', 'text-white'));
    btn.classList.add('active', 'text-white');
    renderAdminInvitationsTable();
  };

  btnAll?.addEventListener('click', () => setFilter('all', btnAll));
  btnValid?.addEventListener('click', () => setFilter('valid', btnValid));
  btnUsed?.addEventListener('click', () => setFilter('used', btnUsed));
}

// 5. تصدير سجل الدعوات إلى ملف Excel / CSV
function setupCsvExport() {
  document.getElementById('btn-export-admin-csv')?.addEventListener('click', () => {
    const invitations = getInvitations();
    if (invitations.length === 0) {
      showToast.info('لا توجد دعوات لتصديرها حالياً.', 'سجل فارغ');
      return;
    }

    let csv = "\uFEFFرقم الدعوة,اسم المدعو,رقم الهاتف,الداعي,المناسبة والفعالية,نوع المناسبة,النوع,الحالة,تاريخ الإنشاء (ميلادي)\n";
    invitations.forEach(i => {
      const gDate = i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : '';
      const eventType = i.eventType || (typeof detectEventType === 'function' ? detectEventType(i.event) : 'graduation');
      const catLabel = eventType === 'wedding' ? 'حفل زواج' : (eventType === 'private' ? 'مناسبة خاصة' : 'حفل تخرج');
      csv += `"${i.id}","${i.guestName}","${i.phone}","${i.graduateName}","${i.event || ''}","${catLabel}","${i.type}","${i.status}","${gDate}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_الدعوات_الرسمي_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success('تم تصدير سجل الدعوات إلى ملف Excel / CSV بنجاح!', 'تم التصدير');
  });
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

// ----------------------------------------------------------------
// 6. نظام فحص وقراءة الباركود والتحقق من التذاكر
// ----------------------------------------------------------------

let html5QrScanner = null;
let isScannerRunning = false;

function setupBarcodeScanner() {
  const modal = document.getElementById('scanner-modal');
  const openBtn = document.getElementById('btn-open-scanner');
  const closeBtn = document.getElementById('close-scanner-modal');
  const cameraBtn = document.getElementById('btn-start-camera');
  const manualForm = document.getElementById('manual-verify-form');

  if (!modal || !openBtn) return;

  const openModal = async () => {
    modal.classList.remove('hidden');
    clearScanResult();
    // تشغيل الكاميرا تلقائياً بمجرد فتح النافذة لتوفير جهد الضغط
    setTimeout(() => {
      startCameraScanner();
    }, 250);
  };

  const closeModal = async () => {
    await stopCameraScanner();
    modal.classList.add('hidden');
    clearScanResult();
  };

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  // تشغيل / إيقاف الكاميرا يدوياً
  cameraBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (isScannerRunning) {
      await stopCameraScanner();
    } else {
      await startCameraScanner();
    }
  });

  // التحقق اليدوي برقم الدعوة
  manualForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('manual-ticket-id');
    const rawVal = input ? input.value.trim() : '';
    if (!rawVal) return;

    await verifyTicketCode(rawVal);
    if (input) input.value = '';
  });
}

// استخراج معرف الدعوة من رابط URL أو كود خام
function extractTicketId(scannedText) {
  if (!scannedText) return '';
  const trimmed = scannedText.trim();
  
  // إذا كان الرابط كاملاً مثلاً https://site.com/ticket.html?id=INV-000001
  if (trimmed.includes('id=')) {
    try {
      const parsedUrl = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const id = parsedUrl.searchParams.get('id');
      if (id) return id.trim();
    } catch {
      const match = trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
  }

  // كود التذكرة المباشر مثلاً INV-000001
  return trimmed;
}

// بدء مسح الكاميرا بمرونة ودعم لجميع أنواع الكاميرات والمتصفحات
async function startCameraScanner() {
  const laserEl = document.getElementById('scanner-laser');
  const cameraBtnText = document.getElementById('btn-camera-text');

  if (typeof Html5Qrcode === 'undefined') {
    showToast.error('تعذر تحميل مكتبة فحص الباركود، يرجى إعادة تحديث الصفحة أو إدخال رقم الدعوة يدوياً.', 'خطأ في الكاميرا');
    return;
  }

  if (isScannerRunning) {
    return;
  }

  if (cameraBtnText) cameraBtnText.textContent = 'جارٍ فتح الكاميرا...';

  try {
    if (!html5QrScanner) {
      html5QrScanner = new Html5Qrcode("qr-reader", { verbose: false });
    }

    const scanConfig = {
      fps: 20,
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    const onSuccess = async (decodedText) => {
      laserEl?.classList.add('hidden');
      await stopCameraScanner();
      await verifyTicketCode(decodedText);
    };

    const onError = () => {
      // فحص مستمر للفريمات
    };

    // المحاولة 1: الكاميرا الخلفية القياسية (environment)
    try {
      await html5QrScanner.start({ facingMode: "environment" }, scanConfig, onSuccess, onError);
    } catch (envErr) {
      console.warn('Environment camera failed, trying available cameras list:', envErr);
      // المحاولة 2: جلب قائمة الكاميرات واختيار الكاميرا المتاحة
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const selectedCam = devices[devices.length - 1].id; // الكاميرا الخلفية غالباً تكون الأخيرة
        await html5QrScanner.start(selectedCam, scanConfig, onSuccess, onError);
      } else {
        throw new Error('لا توجد أي كاميرا متوفرة في هذا الجهاز.');
      }
    }

    isScannerRunning = true;
    laserEl?.classList.remove('hidden');
    if (cameraBtnText) cameraBtnText.textContent = 'إيقاف تشغيل الكاميرا';
  } catch (err) {
    console.error('Camera start error:', err);
    isScannerRunning = false;
    laserEl?.classList.add('hidden');
    if (cameraBtnText) cameraBtnText.textContent = 'تشغيل الكاميرا للمسح';
    showToast.error('تعذر تشغيل الكاميرا. يرجى التأكد من السماح بصلاحية الكاميرا للمتصفح، أو التحقق بإدخال رقم الدعوة.', 'إذن الكاميرا');
  }
}

// إيقاف مسح الكاميرا
async function stopCameraScanner() {
  const laserEl = document.getElementById('scanner-laser');
  const cameraBtnText = document.getElementById('btn-camera-text');

  if (html5QrScanner && isScannerRunning) {
    try {
      await html5QrScanner.stop();
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
    isScannerRunning = false;
  }
  laserEl?.classList.add('hidden');
  if (cameraBtnText) cameraBtnText.textContent = 'تشغيل الكاميرا للمسح';
}

function clearScanResult() {
  const resultCard = document.getElementById('scan-result-card');
  if (resultCard) {
    resultCard.classList.add('hidden');
    resultCard.innerHTML = '';
  }
}

// التحقق من الدعوة وتأكيد دخول الضيف
async function verifyTicketCode(rawCode) {
  const ticketId = extractTicketId(rawCode);
  const resultCard = document.getElementById('scan-result-card');
  if (!resultCard) return;

  resultCard.classList.remove('hidden');
  resultCard.className = 'rounded-2xl p-4 border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-center space-y-2';
  resultCard.innerHTML = `
    <div class="py-4 text-center">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 dark:text-indigo-400"></i>
      <p class="text-xs text-slate-500 mt-2">جارٍ التحقق من كود الدعوة في قاعدة البيانات...</p>
    </div>
  `;

  // جلب الدعوة من المتجر أو Supabase
  const invitation = await fetchInvitationById(ticketId);

  if (!invitation) {
    resultCard.className = 'rounded-2xl p-4 border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 space-y-3';
    resultCard.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xl flex-shrink-0">
          <i class="fa-solid fa-circle-xmark"></i>
        </div>
        <div>
          <h5 class="text-sm font-black text-rose-700 dark:text-rose-300">دعوة غير صالحة أو غير موجودة!</h5>
          <p class="text-xs text-rose-600/90 dark:text-rose-400">الكود الممسوح (${escapeHtml(ticketId)}) غير مسجل بالنظام.</p>
        </div>
      </div>
    `;
    showToast.error(`الكود (${ticketId}) غير مسجل في النظام!`, 'دعوة غير صالحة');
    return;
  }

  const isVip = invitation.type === 'VIP';
  const isValid = invitation.status === 'صالحة';

  if (isValid) {
    resultCard.className = 'rounded-2xl p-4 border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 space-y-3.5';
    resultCard.innerHTML = `
      <div class="flex items-start justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900/60 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/30 flex-shrink-0">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white mb-1">
              تذكرة صالحة ومؤكدة &check;
            </span>
            <h5 class="text-base font-black text-slate-900 dark:text-white">${escapeHtml(invitation.guestName)}</h5>
          </div>
        </div>
        <div>
          ${isVip 
            ? '<span class="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500 text-white shadow-sm flex items-center gap-1"><i class="fa-solid fa-crown text-[10px]"></i> VIP</span>' 
            : '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">عادية</span>'}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <span class="text-slate-400 block text-[10px]">رقم الدعوة:</span>
          <strong class="font-mono text-indigo-600 dark:text-indigo-400">${invitation.id}</strong>
        </div>
        <div class="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <span class="text-slate-400 block text-[10px]">الداعي:</span>
          <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(invitation.graduateName)}</strong>
        </div>
        <div class="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <span class="text-slate-400 block text-[10px]">رقم الهاتف:</span>
          <strong class="font-mono dir-ltr inline-block text-slate-700 dark:text-slate-300">${escapeHtml(invitation.phone || '-')}</strong>
        </div>
        <div class="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
          <span class="text-slate-400 block text-[10px]">الفعالية والمناسبة:</span>
          <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(invitation.event || 'حفل')}</strong>
        </div>
      </div>

      <div class="pt-2 flex gap-2">
        <button onclick="markTicketAsUsed('${invitation.id}')" class="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition">
          <i class="fa-solid fa-check-double"></i>
          <span>تسجيل دخول الضيف وتعيين التذكرة كمستخدمة</span>
        </button>
      </div>
    `;
    showToast.success(`التذكرة صالحة للدخول! الضيف: ${invitation.guestName}`, 'تأكيد الصلاحية');
  } else {
    // التذكرة مستخدمة مسبقاً
    resultCard.className = 'rounded-2xl p-4 border bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 space-y-3';
    resultCard.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-500/30 flex-shrink-0">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div>
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white mb-1">
            تم استخدام هذه التذكرة مسبقاً!
          </span>
          <h5 class="text-sm font-black text-slate-900 dark:text-white">${escapeHtml(invitation.guestName)}</h5>
          <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">رقم الدعوة: <span class="font-mono font-bold">${invitation.id}</span> | الداعي: ${escapeHtml(invitation.graduateName)}</p>
        </div>
      </div>
      <div class="pt-1 flex justify-end">
        <button onclick="resetTicketToValid('${invitation.id}')" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
          إعادة تعيين التذكرة كصالحة مجدداً
        </button>
      </div>
    `;
    showToast.warning(`تنبيه: تم استخدام هذه التذكرة مسبقاً (${invitation.guestName})!`, 'تذكرة مستخدمة');
  }
}

// تسجيل دخول الضيف وتغيير حالة الدعوة إلى مستخدمة
window.markTicketAsUsed = async function(id) {
  const success = await updateInvitation(id, { status: 'مستخدمة' });
  if (success) {
    showToast.success('تم تأكيد دخول الضيف وتحديث حالة التذكرة إلى مستخدمة بنجاح!', 'تم تسجيل الدخول');
    renderAdminInvitationsTable();
    await verifyTicketCode(id);
  } else {
    showToast.error('تعذر تحديث حالة التذكرة.', 'خطأ');
  }
};

// إعادة تعيين التذكرة إلى صالحة (في حال الخطأ)
window.resetTicketToValid = async function(id) {
  const success = await updateInvitation(id, { status: 'صالحة' });
  if (success) {
    showToast.info('تمت إعادة تعيين التذكرة كصالحة للدخول بنجاح.', 'تم التحديث');
    renderAdminInvitationsTable();
    await verifyTicketCode(id);
  }
};

// تسجيل خروج المشرف
function setupAdminLogout() {
  const logoutBtn = document.getElementById('btn-admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutUser();
      showToast.info('تم تسجيل الخروج بنجاح. نراك قريباً!', 'تسجيل الخروج');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 350);
    });
  }
}

// حذف الدعوة من قبل المشرف
window.handleAdminDeleteInvitation = async function(invId, guestName) {
  const nameDisplay = guestName ? `دعوة <strong>"${escapeHtml(guestName)}"</strong>` : `الدعوة (<strong>${invId}</strong>)`;

  const confirmed = await showConfirmModal({
    title: 'حذف الدعوة نهائياً',
    message: `هل أنت متأكد من رغبتك في حذف ${nameDisplay} نهائياً؟<br><span class="text-[11px] text-rose-500/80 block mt-1.5">سيتم مسح بيانات التذكرة بالكامل من السحابة ولا يمكن التراجع.</span>`,
    confirmText: 'تأكيد الحذف',
    cancelText: 'إلغاء',
    type: 'danger',
    icon: 'fa-solid fa-trash-can'
  });

  if (!confirmed) return;

  const success = await deleteInvitation(invId);
  if (success) {
    const successMsg = guestName ? `تم حذف دعوة (${guestName}) نهائياً بنجاح.` : 'تم حذف الدعوة نهائياً بنجاح.';
    showToast.success(successMsg, 'تم الحذف');
    renderAdminInvitationsTable();
  } else {
    showToast.error('تعذر حذف الدعوة، يرجى إعادة المحاولة لاحقاً.', 'خطأ في الحذف');
  }
};

// حذف حساب الخريج بواسطة المشرف
window.handleAdminDeleteUser = async function(userId, userName) {
  const displayName = userName ? `حساب الخريج <strong>"${escapeHtml(userName)}"</strong>` : 'هذا الحساب';

  const confirmed = await showConfirmModal({
    title: 'حذف حساب الخريج',
    message: `هل أنت متأكد من رغبتك في حذف ${displayName} وجميع الدعوات الصادرة منه نهائياً؟<br><span class="text-[11px] text-rose-500/80 block mt-1.5">لا يمكن التراجع عن هذه الخطوة إطلاقاً.</span>`,
    confirmText: 'تأكيد حذف الحساب',
    cancelText: 'إلغاء',
    type: 'danger',
    icon: 'fa-solid fa-user-xmark'
  });

  if (!confirmed) return;

  const result = await deleteUserByAdmin(userId);
  if (result.success) {
    showToast.success(`تم حذف حساب (${userName || 'الخريج'}) وكافة دعواته بنجاح!`, 'تم الحذف');
    renderUsersTable();
    renderAdminInvitationsTable();
  } else {
    showToast.error(result.message || 'تعذر حذف الحساب.', 'خطأ في الحذف');
  }
};

// إعداد زر حذف كافة الدعوات
function setupDeleteAllInvitations() {
  const btn = document.getElementById('btn-admin-delete-all');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const invs = getInvitations();
    if (!invs || invs.length === 0) {
      showToast.info('سجل الدعوات فارغ بالفعل، لا توجد أي دعوات لحذفها.', 'سجل فارغ');
      return;
    }

    const confirmed = await showConfirmModal({
      title: 'حذف كافة الدعوات',
      message: `⚠️ <strong>تحذير أمني هام:</strong><br>هل أنت متأكد من رغبتك في مسح وحذف جميع الدعوات (<strong>${invs.length} دعوة</strong>) نهائياً؟<br><span class="text-[11px] text-rose-500 font-bold block mt-1.5">سيتم مسح كافة التذاكر من السحابة والنظام ولا يمكن استرجاعها!</span>`,
      confirmText: 'نعم، احذف كافة الدعوات',
      cancelText: 'تراجع وإلغاء',
      type: 'danger',
      icon: 'fa-solid fa-triangle-exclamation'
    });

    if (!confirmed) return;

    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>جاري الحذف...</span>';

    try {
      const success = await deleteAllInvitations();
      if (success) {
        showToast.success('تم مسح وحذف كافة الدعوات والتذاكر بنجاح من قاعدة البيانات والنظام!', 'تم الحذف الشامل');
        renderAdminInvitationsTable();
        renderUsersTable();
      } else {
        showToast.error('حدث خطأ أثناء محاولة حذف جميع الدعوات.', 'خطأ');
      }
    } catch (err) {
      console.error('Delete all invitations error:', err);
      showToast.error('تعذر إكمال العملية، يرجى المحاولة لاحقاً.', 'خطأ');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });
}


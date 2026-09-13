/**
 * admin.js - منطق لوحة المشرف لإدارة المستخدمين، الكوتا، وإعدادات Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
  initStore();
  setupSupabaseConfig();
  renderUsersTable();
  renderAdminInvitationsTable();
  setupCreateUserForm();
  setupQuotaModal();
  setupCsvExport();

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const name = document.getElementById('new-fullname').value.trim();
    const major = document.getElementById('new-major').value.trim();
    const regularQuota = parseInt(document.getElementById('new-quota-regular').value, 10) || 0;
    const vipQuota = parseInt(document.getElementById('new-quota-vip').value, 10) || 0;

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
    document.getElementById('new-quota-regular').value = 30;
    document.getElementById('new-quota-vip').value = 0;
    renderUsersTable();
    showToast.success(`تم إنشاء حساب الخريج (${name}) بنجاح!\nاسم الدخول: ${username}`, 'تم إنشاء الحساب');
  });
}

// 3. عرض جدول المستخدمين
function renderUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  const users = getUsers();
  const allInvitations = getInvitations();

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400">لا يوجد مستخدمون مسجلون</td></tr>`;
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
          <button onclick="promptEditUserQuota('${user.id}', '${escapeHtml(user.name)}', ${regQuota}, ${vipQuota})" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg transition hover:bg-indigo-100">
            تعديل الكوتا
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// نافذة تعديل الكوتا الحديثة
window.promptEditUserQuota = function(userId, userName, currentReg, currentVip) {
  const modal = document.getElementById('quota-modal');
  if (!modal) return;

  document.getElementById('quota-modal-userid').value = userId;
  document.getElementById('quota-modal-username').textContent = userName;
  document.getElementById('quota-modal-reg').value = currentReg;
  document.getElementById('quota-modal-vip').value = currentVip;

  modal.classList.remove('hidden');
};

function setupQuotaModal() {
  const modal = document.getElementById('quota-modal');
  const form = document.getElementById('quota-modal-form');
  const closeBtn = document.getElementById('close-quota-modal');
  const cancelBtn = document.getElementById('cancel-quota-modal');

  const closeModal = () => modal?.classList.add('hidden');

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('quota-modal-userid').value;
    const userName = document.getElementById('quota-modal-username').textContent;
    const newReg = parseInt(document.getElementById('quota-modal-reg').value, 10);
    const newVip = parseInt(document.getElementById('quota-modal-vip').value, 10);

    if (isNaN(newReg) || newReg < 0 || isNaN(newVip) || newVip < 0) {
      showToast.warning('يرجى إدخال أرقام صحيحة أكبر من أو تساوي الصفر.', 'تنبيه');
      return;
    }

    await updateUserQuota(userId, newReg, newVip);
    renderUsersTable();
    closeModal();
    showToast.success(`تم تعديل كوتا (${userName}) بنجاح:\n- عادية: ${newReg} | VIP: ${newVip}`, 'تم تعديل الكوتا');
  });
}

// 4. عرض جميع الدعوات الصادرة
function renderAdminInvitationsTable() {
  const tbody = document.getElementById('admin-invitations-table-body');
  if (!tbody) return;

  const invitations = getInvitations();
  if (invitations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400">لا توجد أي دعوات صادرة حتى الآن (قاعدة البيانات نظيفة)</td></tr>`;
    return;
  }

  tbody.innerHTML = invitations.map(inv => {
    const ticketUrl = `ticket.html?id=${inv.id}`;
    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-4 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">${inv.id}</td>
        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${escapeHtml(inv.guestName)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr text-right">${escapeHtml(inv.phone)}</td>
        <td class="py-3 px-4 text-slate-700 dark:text-slate-300">${escapeHtml(inv.graduateName)}</td>
        <td class="py-3 px-4">${inv.type === 'VIP' ? '<span class="badge-vip text-[10px]">VIP</span>' : '<span class="text-xs text-slate-500">عادية</span>'}</td>
        <td class="py-3 px-4"><span class="badge-status-valid text-xs">صالحة</span></td>
        <td class="py-3 px-4 text-xs text-slate-400">${new Date(inv.createdAt).toLocaleDateString('ar-SA')}</td>
        <td class="py-3 px-4 text-center">
          <a href="${ticketUrl}" target="_blank" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            معاينة &larr;
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. تصدير CSV
function setupCsvExport() {
  document.getElementById('btn-export-admin-csv')?.addEventListener('click', () => {
    const invitations = getInvitations();
    if (invitations.length === 0) {
      showToast.info('لا توجد دعوات لتصديرها حالياً.', 'سجل فارغ');
      return;
    }

    let csv = "\uFEFFرقم الدعوة,اسم المدعو,رقم الهاتف,الخريج الداعي,النوع,الحالة,تاريخ الإنشاء\n";
    invitations.forEach(i => {
      csv += `"${i.id}","${i.guestName}","${i.phone}","${i.graduateName}","${i.type}","${i.status}","${i.createdAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل_دعوات_حفل_التخرج_${new Date().toISOString().substring(0,10)}.csv`;
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

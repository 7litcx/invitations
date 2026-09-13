/**
 * admin.js - منطق لوحة المشرف لإدارة المستخدمين، الكوتا، وإعدادات Supabase
 */

document.addEventListener('DOMContentLoaded', () => {
  initStore();
  setupSupabaseConfig();
  renderUsersTable();
  renderAdminInvitationsTable();
  setupCreateUserForm();
  setupCsvExport();
});

// 1. إعداد واختبار اتصال Supabase
function setupSupabaseConfig() {
  const form = document.getElementById('supabase-config-form');
  const urlInput = document.getElementById('sb-url');
  const keyInput = document.getElementById('sb-key');
  const statusBadge = document.getElementById('supabase-status-badge');

  const config = getSupabaseConfig();
  if (urlInput) urlInput.value = config.url || '';
  if (keyInput) keyInput.value = config.anonKey || '';

  if (config.url && config.anonKey) {
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
    const quota = parseInt(document.getElementById('new-quota').value, 10) || 30;

    const res = await createUserByAdmin({
      username,
      password,
      name,
      major,
      quota,
      role: 'user'
    });

    if (!res.success) {
      alert(res.message);
      return;
    }

    form.reset();
    document.getElementById('new-quota').value = 30;
    renderUsersTable();
    alert(`تم إنشاء حساب الخريج (${name}) بنجاح!\nاسم الدخول: ${username}\nكلمة المرور: ${password}\nالكوتا المخصصة: ${quota} دعوة.`);
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
    const usedCount = userInvs.length;
    const quota = user.regularQuota !== undefined ? user.regularQuota : 30;
    const remaining = Math.max(0, quota - usedCount);

    return `
      <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${escapeHtml(user.name)}</td>
        <td class="py-3 px-4 font-mono font-bold text-indigo-700 dark:text-indigo-400 dir-ltr text-right">${escapeHtml(user.username)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr text-right">${escapeHtml(user.password)}</td>
        <td class="py-3 px-4 text-slate-600 dark:text-slate-300">${escapeHtml(user.major)}</td>
        <td class="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">${quota} دعوة</td>
        <td class="py-3 px-4 font-semibold font-mono text-blue-600 dark:text-blue-400">${usedCount}</td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${remaining > 0 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'}">
            ${remaining} متبقية
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="promptEditUserQuota('${user.id}', '${escapeHtml(user.name)}', ${quota})" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1">
            تعديل الكوتا
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.promptEditUserQuota = async function(userId, userName, currentQuota) {
  const input = prompt(`أدخل عدد الدعوات (الكوتا) الجديد للخريج (${userName}):`, currentQuota);
  if (input !== null) {
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 0) {
      alert('يرجى إدخال رقم صحيح.');
      return;
    }
    await updateUserQuota(userId, num);
    renderUsersTable();
    alert(`تم تعديل كوتا الخريج (${userName}) إلى ${num} دعوة.`);
  }
};

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
      alert('لا توجد دعوات لتصديرها.');
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

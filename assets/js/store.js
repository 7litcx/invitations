/**
 * store.js - مدير البيانات ونظام المصادقة والربط الحقيقي مع Supabase
 * تم حذف كافة البيانات الوهمية تماماً
 * كوتا كل خريج جديد: 30 دعوة افتراضياً
 */

const STORAGE_KEYS = {
  USERS: 'grad_real_users_v4',
  INVITATIONS: 'grad_real_invitations_v4',
  TRANSFERS: 'grad_real_transfers_v4',
  CURRENT_USER: 'grad_real_current_user_v4',
  EVENTS: 'grad_real_events_v4'
};

// الفعالية الافتراضية
const DEFAULT_EVENTS = [
  {
    id: 'EVT-01',
    name: 'حفل تخرج الدفعة السادسة تقنية معلومات',
    date: '2026-09-06',
    dateDisplay: '06-09-2026',
    timeDisplay: '00:00:00',
    venue: 'قاعة الاحتفالات الكبرى - كلية الحاسبات',
    city: 'المكلا'
  }
];

// الحساب المبدئي الوحيد للمشرف لتسجيل الدخول والبدء بإنشاء المستخدمين
const INITIAL_ADMIN = {
  id: 'admin_root',
  username: 'admin',
  password: 'admin123',
  name: 'مشرف النظام',
  initials: 'مش',
  major: 'إدارة الحفل',
  role: 'admin',
  regularQuota: 999,
  vipQuota: 999
};

// تهيئة التخزين النظيف بدون أي بيانات وهمية
function initStore() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([INITIAL_ADMIN]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVITATIONS)) {
    localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSFERS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify([]));
  }
}

// ----------------------------------------------------------------
// 1. نظام تسجيل الدخول والمصادقة (اسم المستخدم + كلمة المرور فقط)
// ----------------------------------------------------------------

async function loginUser(username, password) {
  initStore();
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // فحص عبر Supabase إن كان مفعلاً
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .single();

      if (!error && data) {
        const mappedUser = {
          id: data.id,
          username: data.username,
          password: data.password,
          name: data.name,
          initials: data.name.substring(0, 2),
          major: data.major,
          role: data.role || 'user',
          regularQuota: data.quota_regular !== undefined ? data.quota_regular : 30,
          vipQuota: data.quota_vip !== undefined ? data.quota_vip : 0
        };
        saveLocalUser(mappedUser);
        setCurrentUser(mappedUser);
        return { success: true, user: mappedUser };
      }
    } catch (e) {
      console.warn('Supabase login check fallback to local:', e);
    }
  }

  // فحص محلي
  const users = getUsers();
  const found = users.find(u => u.username === cleanUsername && u.password === cleanPassword);

  if (found) {
    setCurrentUser(found);
    return { success: true, user: found };
  }

  return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
}

function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    return u || null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ----------------------------------------------------------------
// 2. إدارة المستخدمين وإنشاء يوزر جديد (كوتا 30 لكل خريج)
// ----------------------------------------------------------------

function getUsers() {
  initStore();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [INITIAL_ADMIN];
  } catch {
    return [INITIAL_ADMIN];
  }
}

function getUser(id) {
  const users = getUsers();
  return users.find(u => u.id === id || u.username === id);
}

function saveLocalUser(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id || u.username === user.username);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * إنشاء مستخدم جديد من قبل الأدمن
 * لكل خريج كوتا 30 دعوة افتراضياً
 */
async function createUserByAdmin({ username, password, name, major, quota = 30, role = 'user' }) {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();
  const cleanName = name.trim();
  const cleanMajor = major.trim();
  const quotaNum = parseInt(quota, 10) || 30;

  // التحقق من عدم تكرار اسم المستخدم
  const existing = getUser(cleanUsername);
  if (existing) {
    return { success: false, message: 'اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر.' };
  }

  const newUserId = `usr_${Date.now()}`;
  const newUser = {
    id: newUserId,
    username: cleanUsername,
    password: cleanPassword,
    name: cleanName,
    initials: cleanName.length >= 2 ? cleanName.substring(0, 2) : 'خر',
    major: cleanMajor,
    role,
    regularQuota: quotaNum,
    vipQuota: 0
  };

  // الحفظ في Supabase
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('users').insert([{
        id: newUserId,
        username: cleanUsername,
        password: cleanPassword,
        name: cleanName,
        major: cleanMajor,
        role,
        quota_regular: quotaNum,
        quota_vip: 0
      }]);
    } catch (e) {
      console.warn('Error syncing user to Supabase:', e);
    }
  }

  // الحفظ المحلي
  saveLocalUser(newUser);

  return { success: true, user: newUser };
}

async function updateUserQuota(userId, newQuota) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.regularQuota = parseInt(newQuota, 10) || 30;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('users').update({ quota_regular: user.regularQuota }).eq('id', userId);
      } catch (e) {
        console.warn('Supabase update quota error:', e);
      }
    }
    return true;
  }
  return false;
}

// ----------------------------------------------------------------
// 3. إدارة كوتا وإحصائيات المستخدم
// ----------------------------------------------------------------

function getUserStats(userId) {
  const user = getUser(userId);
  if (!user) return { regularAllowed: 30, regularUsed: 0, regularRemaining: 30, vipAllowed: 0, vipUsed: 0, vipRemaining: 0 };

  const invitations = getInvitations({ userId });
  const regularUsed = invitations.filter(i => i.type === 'عادية').length;
  const vipUsed = invitations.filter(i => i.type === 'VIP').length;

  const regularAllowed = user.regularQuota !== undefined ? user.regularQuota : 30;
  const vipAllowed = user.vipQuota !== undefined ? user.vipQuota : 0;

  return {
    regularAllowed,
    regularUsed,
    regularRemaining: Math.max(0, regularAllowed - regularUsed),
    vipAllowed,
    vipUsed,
    vipRemaining: Math.max(0, vipAllowed - vipUsed)
  };
}

// ----------------------------------------------------------------
// 4. إدارة الدعوات الحقيقية (إنشاء، تعديل، حذف)
// ----------------------------------------------------------------

function getInvitations(filter = {}) {
  initStore();
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVITATIONS)) || [];
  } catch {
    list = [];
  }

  if (filter.userId) {
    list = list.filter(i => i.userId === filter.userId);
  }
  return list;
}

// مزامنة دعوات المستخدم مع Supabase
async function syncUserInvitations(userId) {
  const sb = getSupabase();
  if (!sb) return getInvitations({ userId });

  try {
    let query = sb.from('invitations').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(d => ({
        id: d.id,
        userId: d.user_id,
        guestName: d.guest_name,
        phone: d.phone,
        graduateName: d.graduate_name,
        event: d.event,
        peopleCount: d.people_count || 1,
        type: d.type || 'عادية',
        status: d.status || 'صالحة',
        notes: d.notes || '',
        createdAt: d.created_at
      }));

      // دمج وحفظ محلي
      const local = getInvitations();
      const mergedMap = new Map();
      local.forEach(item => mergedMap.set(item.id, item));
      mapped.forEach(item => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(mergedList));
      return userId ? mergedList.filter(i => i.userId === userId) : mergedList;
    }
  } catch (e) {
    console.warn('Sync invitations error:', e);
  }
  return getInvitations({ userId });
}

function getInvitation(id) {
  const list = getInvitations();
  return list.find(i => i.id === id);
}

// دالة جلب الدعوة السحابية والمحلية لصفحة التذكرة
async function fetchInvitationById(id) {
  // 1. فحص محلي أولاً
  let inv = getInvitation(id);
  if (inv) return inv;

  // 2. فحص سحابي في Supabase
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('invitations')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        inv = {
          id: data.id,
          userId: data.user_id,
          guestName: data.guest_name,
          phone: data.phone,
          graduateName: data.graduate_name,
          event: data.event,
          peopleCount: data.people_count || 1,
          type: data.type || 'عادية',
          status: data.status || 'صالحة',
          notes: data.notes || '',
          createdAt: data.created_at
        };
        // حفظ محلي لسرعة الوصول لاحقاً
        const all = getInvitations();
        if (!all.find(i => i.id === inv.id)) {
          all.push(inv);
          localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));
        }
        return inv;
      }
    } catch (e) {
      console.warn('Error fetching invitation from Supabase:', e);
    }
  }
  return null;
}

async function createInvitation(userId, data) {
  const user = getUser(userId);
  if (!user) return { success: false, message: 'المستخدم غير مسجل.' };

  const stats = getUserStats(userId);
  const type = data.type || 'عادية';

  // فرض كوتا الـ 30 دعوة الصارمة
  if (type === 'عادية' && stats.regularRemaining <= 0) {
    return { success: false, message: `عذراً، لقد استنفذت كامل كوتا الدعوات المسموحة لك (${stats.regularAllowed} دعوة). تواصل مع الإدارة لزيادة الكوتا.` };
  }
  if (type === 'VIP' && stats.vipRemaining <= 0) {
    return { success: false, message: 'عذراً، لا تملك رصيد دعوات VIP كافٍ.' };
  }

  const all = getInvitations();
  const nextNum = String(all.length + 1).padStart(6, '0');
  const newInv = {
    id: `INV-${nextNum}`,
    userId: user.id,
    guestName: data.guestName.trim(),
    phone: data.phone.trim(),
    graduateName: data.graduateName || user.name,
    event: data.event || DEFAULT_EVENTS[0].name,
    peopleCount: 1,
    type,
    status: 'صالحة',
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  };

  // الحفظ في Supabase
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('invitations').insert([{
        id: newInv.id,
        user_id: newInv.userId,
        guest_name: newInv.guestName,
        phone: newInv.phone,
        graduate_name: newInv.graduateName,
        event: newInv.event,
        people_count: newInv.peopleCount,
        type: newInv.type,
        status: newInv.status,
        notes: newInv.notes
      }]);
    } catch (e) {
      console.warn('Supabase insert invitation error:', e);
    }
  }

  all.unshift(newInv);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

  return { success: true, invitation: newInv };
}

async function updateInvitation(id, updatedData) {
  const all = getInvitations();
  const idx = all.findIndex(i => i.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updatedData };
    localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('invitations').update({
          guest_name: all[idx].guestName,
          phone: all[idx].phone,
          graduate_name: all[idx].graduateName,
          people_count: all[idx].peopleCount,
          type: all[idx].type,
          status: all[idx].status,
          notes: all[idx].notes
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase update invitation error:', e);
      }
    }
    return true;
  }
  return false;
}

function deleteInvitation(id) {
  let all = getInvitations();
  all = all.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

  const sb = getSupabase();
  if (sb) {
    sb.from('invitations').delete().eq('id', id).then(() => {});
  }
  return true;
}

// ----------------------------------------------------------------
// 5. سجل التحويلات بين المستخدمين
// ----------------------------------------------------------------

function getTransfers(userId) {
  initStore();
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSFERS)) || [];
  } catch {
    list = [];
  }

  if (userId) {
    list = list.filter(t => t.fromUserId === userId || t.toUserId === userId);
  }
  return list;
}

async function transferInvitations(fromUserId, toUserId, count, type, eventName, notes = '') {
  const fromUser = getUser(fromUserId);
  const toUser = getUser(toUserId);

  if (!fromUser || !toUser) {
    return { success: false, message: 'يرجى اختيار المستخدم المستقبل.' };
  }
  if (fromUserId === toUserId) {
    return { success: false, message: 'لا يمكنك تحويل الدعوات إلى نفسك.' };
  }

  const countNum = parseInt(count, 10);
  if (isNaN(countNum) || countNum <= 0) {
    return { success: false, message: 'يرجى إدخال عدد صحيح من الدعوات.' };
  }

  const stats = getUserStats(fromUserId);
  if (type === 'عادية' && stats.regularRemaining < countNum) {
    return { success: false, message: `رصيدك المتاح من الدعوات العادية هو ${stats.regularRemaining} فقط.` };
  }
  if (type === 'VIP' && stats.vipRemaining < countNum) {
    return { success: false, message: `رصيدك المتاح من دعوات VIP هو ${stats.vipRemaining} فقط.` };
  }

  // تعديل الكوتا
  const users = getUsers();
  const uFrom = users.find(u => u.id === fromUserId);
  const uTo = users.find(u => u.id === toUserId);

  if (type === 'VIP') {
    uFrom.vipQuota = Math.max(0, (uFrom.vipQuota || 0) - countNum);
    uTo.vipQuota = (uTo.vipQuota || 0) + countNum;
  } else {
    uFrom.regularQuota = Math.max(0, (uFrom.regularQuota || 30) - countNum);
    uTo.regularQuota = (uTo.regularQuota || 30) + countNum;
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  const newTransfer = {
    id: `TR-${Date.now()}`,
    fromUserId,
    toUserId,
    fromUserName: fromUser.name,
    toUserName: toUser.name,
    direction: 'sent',
    count: countNum,
    type,
    event: eventName || DEFAULT_EVENTS[0].name,
    notes,
    dateDisplay: 'الآن',
    timeDisplay: new Date().toLocaleTimeString('ar-SA')
  };

  const transfers = getTransfers();
  transfers.unshift(newTransfer);
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));

  // مزامنة Supabase
  const sb = getSupabase();
  if (sb) {
    sb.from('transfers').insert([{
      id: newTransfer.id,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      from_user_name: fromUser.name,
      to_user_name: toUser.name,
      count: countNum,
      type,
      event: newTransfer.event,
      notes
    }]).then(() => {});
  }

  return { success: true, message: `تم تحويل ${countNum} دعوة بنجاح إلى ${toUser.name}!` };
}

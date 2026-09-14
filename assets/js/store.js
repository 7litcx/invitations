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
  REMEMBER_USER: 'grad_real_remembered_username_v4',
  EVENTS: 'grad_real_events_v4'
};

// فئات وأنواع المناسبات المعتمدة
const EVENT_CATEGORIES = {
  wedding: {
    id: 'wedding',
    name: 'حفل زواج',
    icon: 'fa-ring',
    badgeText: 'حفل زواج',
    hostLabel: 'اسم العريس / الداعي',
    hostPlaceholder: 'اسم العريس أو عائلة الداعي',
    detailLabel: 'المناسبة',
    defaultTitle: 'حفل زفاف مبارك',
    tagClass: 'badge-event-wedding'
  },
  private: {
    id: 'private',
    name: 'مناسبة خاصة',
    icon: 'fa-sparkles',
    badgeText: 'مناسبة خاصة',
    hostLabel: 'صاحب المناسبة / الداعي',
    hostPlaceholder: 'اسم صاحب الدعوة أو المنظم',
    detailLabel: 'نوع الفعالية',
    defaultTitle: 'مناسبة خاصة واحتفال VIP',
    tagClass: 'badge-event-private'
  },
  graduation: {
    id: 'graduation',
    name: 'حفل تخرج',
    icon: 'fa-graduation-cap',
    badgeText: 'حفل تخرج',
    hostLabel: 'اسم الخريج (الداعي)',
    hostPlaceholder: 'اسم الخريج الداعي',
    detailLabel: 'التخصص',
    defaultTitle: 'حفل التخرج 2026',
    tagClass: 'badge-event-grad'
  }
};

// الفعاليات الافتراضية
const DEFAULT_EVENTS = [
  {
    id: 'EVT-01',
    name: 'حفل التخرج 2026',
    type: 'graduation',
    categoryName: 'حفل تخرج',
    date: '2026-09-06',
    dateDisplay: '2026-09-06',
    timeDisplay: '08:00:00',
    venue: 'قاعة الاحتفالات الكبرى',
    city: 'المكلا'
  },
  {
    id: 'EVT-02',
    name: 'حفل زفاف مبارك',
    type: 'wedding',
    categoryName: 'حفل زواج',
    date: '2026-10-15',
    dateDisplay: '2026-10-15',
    timeDisplay: '20:00:00',
    venue: 'قصر الأفراح الملكي',
    city: 'الرياض'
  },
  {
    id: 'EVT-03',
    name: 'مناسبة خاصة واحتفال VIP',
    type: 'private',
    categoryName: 'مناسبة خاصة',
    date: '2026-11-01',
    dateDisplay: '2026-11-01',
    timeDisplay: '19:30:00',
    venue: 'قاعة كبار الشخصيات',
    city: 'جدة'
  }
];

// دالة الكشف التلقائي عن نوع المناسبة بناءً على الاسم أو المدخلات
function detectEventType(name = '') {
  const str = String(name || '').toLowerCase();
  if (str.includes('زواج') || str.includes('زفاف') || str.includes('عرس') || str.includes('قران') || str.includes('wedding')) {
    return 'wedding';
  }
  if (str.includes('خاص') || str.includes('احتفال') || str.includes('عشاء') || str.includes('مأدبة') || str.includes('private') || str.includes('vip')) {
    return 'private';
  }
  return 'graduation';
}

function getEventCategories() {
  return EVENT_CATEGORIES;
}

// استنتاج ومطابقة مناسبة ونوع مناسبة المستخدم تلقائياً
function resolveUserOccasion(user) {
  if (!user) {
    return {
      eventType: 'graduation',
      eventName: 'حفل التخرج 2026',
      majorLabel: 'حفل تخرج'
    };
  }

  let eventType = user.eventType;
  let eventName = user.event;

  // استنتاج نوع المناسبة
  if (!eventType) {
    const raw = ((user.major || '') + ' ' + (user.event || '')).toLowerCase();
    if (raw.includes('زواج') || raw.includes('زفاف') || raw.includes('عرس') || raw.includes('wedding')) {
      eventType = 'wedding';
    } else if (raw.includes('خاصة') || raw.includes('vip') || raw.includes('private')) {
      eventType = 'private';
    } else {
      eventType = 'graduation';
    }
  }

  // استنتاج اسم المناسبة / الفعالية
  if (!eventName || eventName.trim() === '') {
    if (user.major && !['حفل تخرج', 'زواج', 'مناسبة خاصة', 'عام', 'خريج', 'إدارة الحفل'].includes(user.major.trim())) {
      eventName = user.major.trim();
    } else if (eventType === 'wedding') {
      eventName = 'حفل زفاف مبارك';
    } else if (eventType === 'private') {
      eventName = 'مناسبة خاصة واحتفال VIP';
    } else {
      eventName = 'حفل التخرج 2026';
    }
  }

  return {
    eventType,
    eventName,
    majorLabel: eventType === 'wedding' ? 'زواج' : (eventType === 'private' ? 'مناسبة خاصة' : 'حفل تخرج')
  };
}
window.resolveUserOccasion = resolveUserOccasion;

function getEventsList() {
  initStore();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS));
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return DEFAULT_EVENTS;
}

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
// 1. نظام تسجيل الدخول والمصادقة (اسم المستخدم + كلمة المرور فقط + تذكرني)
// ----------------------------------------------------------------

async function loginUser(username, password, remember = true) {
  initStore();
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // حفظ أو مسح اسم المستخدم حسب خيار تذكرني
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_USER, cleanUsername);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
  }

  // فحص عبر Supabase إن كان مفعلاً
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('users')
        .select('*')
        .or(`username.ilike.${cleanUsername},name.eq.${cleanUsername}`)
        .eq('password', cleanPassword);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const occ = resolveUserOccasion({ major: row.major, event: row.event, eventType: row.event_type });
        const mappedUser = {
          id: row.id,
          username: row.username,
          password: row.password,
          name: row.name,
          initials: row.name && row.name.length >= 2 ? row.name.substring(0, 2) : 'خر',
          major: row.major || occ.majorLabel,
          event: row.event || occ.eventName,
          eventType: row.event_type || occ.eventType,
          role: row.role || 'user',
          regularQuota: row.quota_regular !== undefined && row.quota_regular !== null ? row.quota_regular : 27,
          vipQuota: row.quota_vip !== undefined && row.quota_vip !== null ? row.quota_vip : 3
        };
        saveLocalUser(mappedUser);
        setCurrentUser(mappedUser, remember);
        return { success: true, user: mappedUser };
      }
    } catch (e) {
      console.warn('Supabase login check fallback to local:', e);
    }
  }

  // فحص محلي
  const users = getUsers();
  const found = users.find(u => 
    (u.username.toLowerCase() === cleanUsername.toLowerCase() || (u.name && u.name.trim() === cleanUsername)) && 
    u.password === cleanPassword
  );

  if (found) {
    setCurrentUser(found, remember);
    return { success: true, user: found };
  }

  return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
}

function getCurrentUser() {
  try {
    const fromLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    if (fromLocal) return fromLocal;
    const fromSession = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    return fromSession || null;
  } catch {
    return null;
  }
}

function setCurrentUser(user, remember = true) {
  if (user) {
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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
 * يحدد المشرف عدد الدعوات العادية وعدد دعوات VIP
 */
async function createUserByAdmin({ username, password, name, major, event = '', regularQuota = 27, vipQuota = 3, role = 'user' }) {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();
  const cleanName = name.trim();
  const cleanMajor = major.trim();
  const occ = resolveUserOccasion({ major: cleanMajor, event });
  const cleanEvent = (event || '').trim() || occ.eventName;
  const userEventType = occ.eventType;
  const regNum = parseInt(regularQuota, 10) || 0;
  const vipNum = parseInt(vipQuota, 10) || 0;

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
    event: cleanEvent,
    eventType: userEventType,
    role,
    regularQuota: regNum,
    vipQuota: vipNum
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
        quota_regular: regNum,
        quota_vip: vipNum
      }]);
    } catch (e) {
      console.warn('Error syncing user to Supabase:', e);
    }
  }

  // الحفظ المحلي
  saveLocalUser(newUser);

  return { success: true, user: newUser };
}

async function updateUserByAdmin(userId, updates = {}) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: 'المستخدم غير موجود' };
  }

  const cleanUsername = updates.username ? updates.username.trim() : user.username;
  const cleanPassword = updates.password ? updates.password.trim() : user.password;
  const cleanName = updates.name ? updates.name.trim() : user.name;
  const cleanMajor = updates.major !== undefined ? updates.major.trim() : (user.major || '');
  const regNum = updates.regularQuota !== undefined && updates.regularQuota !== null ? (parseInt(updates.regularQuota, 10) || 0) : (user.regularQuota !== undefined ? user.regularQuota : 30);
  const vipNum = updates.vipQuota !== undefined && updates.vipQuota !== null ? (parseInt(updates.vipQuota, 10) || 0) : (user.vipQuota !== undefined ? user.vipQuota : 0);

  // التحقق من عدم تكرار اسم المستخدم إذا تم تعديله
  if (cleanUsername.toLowerCase() !== user.username.toLowerCase()) {
    const isTaken = users.some(u => u.id !== userId && u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (isTaken) {
      return { success: false, message: 'اسم المستخدم هذا مسجل مسبقاً لمستخدم آخر، يرجى اختيار اسم مستخدم مختلف.' };
    }
  }

  const oldName = user.name;
  user.username = cleanUsername;
  user.password = cleanPassword;
  user.name = cleanName;
  user.initials = cleanName.length >= 2 ? cleanName.substring(0, 2) : 'خر';
  user.major = cleanMajor;
  if (updates.event !== undefined) {
    user.event = updates.event.trim();
  }
  if (updates.eventType !== undefined) {
    user.eventType = updates.eventType;
  } else {
    user.eventType = cleanMajor === 'زواج' ? 'wedding' : (cleanMajor === 'مناسبة خاصة' ? 'private' : 'graduation');
  }
  user.regularQuota = regNum;
  user.vipQuota = vipNum;

  // الحفظ المحلي
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // تحديث بيانات الجلسة إذا كان المستخدم مسجلاً دخوله حالياً
  const curUser = getCurrentUser();
  if (curUser && curUser.id === userId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // تحديث اسم الخريج في الدعوات إذا تغير الاسم
  if (oldName && oldName !== cleanName) {
    let allInvs = getInvitations();
    let updatedInvs = false;
    allInvs.forEach(inv => {
      if (inv.userId === userId) {
        inv.graduateName = cleanName;
        updatedInvs = true;
      }
    });
    if (updatedInvs) {
      localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(allInvs));
    }
  }

  // التحديث في Supabase
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('users').update({ 
        username: cleanUsername,
        password: cleanPassword,
        name: cleanName,
        major: cleanMajor,
        quota_regular: regNum,
        quota_vip: vipNum
      }).eq('id', userId);

      if (oldName && oldName !== cleanName) {
        await sb.from('invitations').update({ graduate_name: cleanName }).eq('user_id', userId);
      }
    } catch (e) {
      console.warn('Supabase update user error:', e);
    }
  }

  return { success: true, user };
}

async function updateUserQuota(userId, newRegular, newVip) {
  const res = await updateUserByAdmin(userId, { regularQuota: newRegular, vipQuota: newVip });
  return res.success;
}

// مزامنة كافة المستخدمين من Supabase وحفظهم محلياً
async function syncUsersFromSupabase() {
  const sb = getSupabase();
  if (!sb) return getUsers();

  try {
    const { data, error } = await sb.from('users').select('*');
    if (!error && data && data.length > 0) {
      const mappedUsers = data.map(d => ({
        id: d.id,
        username: d.username,
        password: d.password,
        name: d.name,
        initials: d.name && d.name.length >= 2 ? d.name.substring(0, 2) : 'خر',
        major: d.major || '',
        role: d.role || 'user',
        regularQuota: d.quota_regular !== undefined && d.quota_regular !== null ? d.quota_regular : 27,
        vipQuota: d.quota_vip !== undefined && d.quota_vip !== null ? d.quota_vip : 3
      }));

      // الحفاظ على المشرف الافتراضي
      if (!mappedUsers.find(u => u.username === 'admin')) {
        mappedUsers.unshift(INITIAL_ADMIN);
      }

      // اعتماد المستخدمين من Supabase كمرجع نهائي موحد لجميع الأجهزة
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mappedUsers));

      // تحديث كوتا المستخدم الحالي إن كان مسجلاً
      const curUser = getCurrentUser();
      if (curUser) {
        const fresh = mappedUsers.find(u => u.id === curUser.id || u.username === curUser.username);
        if (fresh) {
          setCurrentUser(fresh);
        }
      }

      return mappedUsers;
    }
  } catch (e) {
    console.warn('Sync users error:', e);
  }
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
        eventType: d.event_type || d.eventType || detectEventType(d.event),
        peopleCount: d.people_count || 1,
        type: d.type || 'عادية',
        status: d.status || 'صالحة',
        notes: d.notes || '',
        createdAt: d.created_at
      }));

      // ترتيب الدعوات دائماً بحسب تاريخ الإنشاء (الأحدث أولاً)
      mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (userId) {
        // لمستخدم معين: تحديث دعواته من السحابة مع الحفاظ على دعوات الآخرين إن وجدت
        const local = getInvitations();
        const otherUsersInvs = local.filter(i => i.userId !== userId);
        const updatedList = [...mapped, ...otherUsersInvs];
        localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(updatedList));
        return mapped;
      } else {
        // للمشرف (Admin): استبدال القائمة بالكامل بالقائمة الرسمية المعتمدة من Supabase لضمان تطابق الجوال واللابتوب
        localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(mapped));
        return mapped;
      }
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

// دالة توليد معرّف فريد عالمياً للدعوة (يمنع أي تضارب بين المستخدمين والأجهزة)
async function generateUniqueInvitationId() {
  const sb = getSupabase();
  const localList = getInvitations();

  for (let attempt = 0; attempt < 15; attempt++) {
    // كود عشوائي فريد مكون من 6 أرقام مميزة (مثال: INV-682194)
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const candidateId = `INV-${randomCode}`;

    // التحقق من عدم وجوده محلياً
    if (localList.some(inv => inv.id === candidateId)) {
      continue;
    }

    // التحقق من عدم وجوده في Supabase
    if (sb) {
      try {
        const { data, error } = await sb
          .from('invitations')
          .select('id')
          .eq('id', candidateId)
          .maybeSingle();

        if (!error && data) {
          // المعرّف مستخدم مسبقاً، محاولة أخرى
          continue;
        }
      } catch (e) {
        // تجاوز الفحص السحابي في حال تعذر الاتصال
      }
    }

    return candidateId;
  }

  // كاحتياطي أخير غير قابل للتكرار
  return `INV-${Date.now().toString().slice(-6)}`;
}

// دالة جلب الدعوة السحابية والمحلية لصفحة التذكرة
async function fetchInvitationById(id) {
  if (!id) return null;

  // 1. فحص سحابي في Supabase أولاً لجلب أدق وأحدث بيانات
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('invitations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const inv = {
          id: data.id,
          userId: data.user_id,
          guestName: data.guest_name,
          phone: data.phone,
          graduateName: data.graduate_name,
          event: data.event,
          eventType: data.event_type || data.eventType || detectEventType(data.event),
          peopleCount: data.people_count || 1,
          type: data.type || 'عادية',
          status: data.status || 'صالحة',
          notes: data.notes || '',
          createdAt: data.created_at
        };
        // حفظ وتحديث محلي لسرعة الوصول
        const all = getInvitations();
        const existingIdx = all.findIndex(i => i.id === inv.id);
        if (existingIdx !== -1) {
          all[existingIdx] = inv;
        } else {
          all.push(inv);
        }
        localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));
        return inv;
      }
    } catch (e) {
      console.warn('Error fetching invitation from Supabase:', e);
    }
  }

  // 2. فحص محلي كاحتياطي في حال عدم توفر اتصال بالإنترنت
  let inv = getInvitation(id);
  if (inv) return inv;

  return null;
}

// دوال توحيد النصوص والأرقام للتحقق من عدم تكرار الدعوات لنفس الضيف
function normalizeArabicText(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/[إأآا]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه')      // توحيد التاء المربوطة
    .replace(/[يى]/g, 'ي')   // توحيد الياء والألف المقصورة
    .replace(/\s+/g, ' ')    // إزالة المسافات الزائدة
    .toLowerCase();
}

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).trim().replace(/[\s\-\(\)\.]/g, '');
  // تحويل الأرقام المكتوبة بالصيغة العربية-الهندية إلى صيغة رقمية موحدة
  clean = clean.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  // إزالة مفاتيح الاتصال الدولي الشائعة والأصفار البادئة لضمان التطابق الدقيق
  clean = clean.replace(/^(\+?967|00967)/, '');
  clean = clean.replace(/^(\+?966|00966)/, '');
  clean = clean.replace(/^0+/, '');
  return clean;
}

async function createInvitation(userId, data) {
  const user = getUser(userId);
  if (!user) return { success: false, message: 'المستخدم غير مسجل.' };

  const stats = getUserStats(userId);
  const type = data.type || 'عادية';

  // فرض كوتا الدعوات الصارمة
  if (type === 'عادية' && stats.regularRemaining <= 0) {
    return { success: false, message: `عذراً، لقد استنفذت كامل كوتا الدعوات المسموحة لك (${stats.regularAllowed} دعوة). تواصل مع الإدارة لزيادة الكوتا.` };
  }
  if (type === 'VIP' && stats.vipRemaining <= 0) {
    return { success: false, message: 'عذراً، لا تملك رصيد دعوات VIP كافٍ.' };
  }

  const cleanGuestName = data.guestName ? data.guestName.trim() : '';
  const cleanPhone = data.phone ? data.phone.trim() : '';

  if (!cleanGuestName || !cleanPhone) {
    return { success: false, message: 'يرجى إدخال اسم المدعو ورقم الهاتف بشكل كامل.' };
  }

  // منع تكرار الدعوة لنفس الاسم ورقم الهاتف لنفس الخريج الداعي
  const normName = normalizeArabicText(cleanGuestName);
  const normPhone = normalizePhoneNumber(cleanPhone);

  // 1. الفحص السحابي في Supabase لدعوات نفس الخريج الحالي
  const sb = getSupabase();
  if (sb) {
    try {
      const { data: dbInvs, error: checkErr } = await sb
        .from('invitations')
        .select('id, user_id, guest_name, phone')
        .eq('user_id', user.id);

      if (!checkErr && dbInvs && dbInvs.length > 0) {
        const duplicate = dbInvs.find(inv => 
          normalizeArabicText(inv.guest_name) === normName &&
          normalizePhoneNumber(inv.phone) === normPhone
        );

        if (duplicate) {
          return {
            success: false,
            message: `ممنوع تكرار الدعوة: لقد قمت مسبقاً بإنشاء دعوة لهذا الضيف بنفس الاسم (${duplicate.guest_name}) ونفس رقم الهاتف (${duplicate.phone}).`
          };
        }
      }
    } catch (e) {
      console.warn('Supabase duplicate check warning:', e);
    }
  }

  // 2. الفحص المحلي في المتصفح لدعوات نفس الخريج الحالي
  const localList = getInvitations({ userId: user.id });
  const localDuplicate = localList.find(inv => 
    normalizeArabicText(inv.guestName) === normName &&
    normalizePhoneNumber(inv.phone) === normPhone
  );

  if (localDuplicate) {
    return {
      success: false,
      message: `ممنوع تكرار الدعوة: لقد قمت مسبقاً بإنشاء دعوة لهذا الضيف بنفس الاسم (${localDuplicate.guestName}) ونفس رقم الهاتف (${localDuplicate.phone}).`
    };
  }

  // توليد معرّف فريد عالمياً لا يتكرر ولا يتصادم بين المستخدمين إطلاقاً
  const uniqueId = await generateUniqueInvitationId();

  const chosenEvent = data.event || DEFAULT_EVENTS[0].name;
  const chosenType = data.eventType || detectEventType(chosenEvent);

  const newInv = {
    id: uniqueId,
    userId: user.id,
    guestName: cleanGuestName,
    phone: cleanPhone,
    graduateName: data.graduateName || user.name,
    major: data.major || user.major || 'عام',
    event: chosenEvent,
    eventType: chosenType,
    peopleCount: 1,
    type,
    status: 'صالحة',
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  };

  // الحفظ في Supabase
  if (sb) {
    try {
      const { error } = await sb.from('invitations').insert([{
        id: newInv.id,
        user_id: newInv.userId,
        guest_name: newInv.guestName,
        phone: newInv.phone,
        graduate_name: newInv.graduateName,
        event: newInv.event,
        event_type: newInv.eventType,
        people_count: newInv.peopleCount,
        type: newInv.type,
        status: newInv.status,
        notes: newInv.notes
      }]);

      if (error) {
        console.error('Supabase insert invitation error:', error);
        return { success: false, message: 'تعذر حفظ الدعوة في قاعدة البيانات: ' + (error.message || 'يرجى المحاولة مرة أخرى') };
      }
    } catch (e) {
      console.warn('Supabase insert invitation exception:', e);
    }
  }

  const all = getInvitations();
  all.unshift(newInv);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

  return { success: true, invitation: newInv };
}

async function updateInvitation(id, updatedData) {
  const all = getInvitations();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) {
    return { success: false, message: 'الدعوة غير موجودة' };
  }

  const currentInv = all[idx];
  const newGuestName = updatedData.guestName !== undefined ? updatedData.guestName.trim() : currentInv.guestName;
  const newPhone = updatedData.phone !== undefined ? updatedData.phone.trim() : currentInv.phone;

  // التحقق من عدم التكرار عند تعديل الاسم أو الهاتف لنفس الخريج الداعي
  if (newGuestName && newPhone) {
    const normName = normalizeArabicText(newGuestName);
    const normPhone = normalizePhoneNumber(newPhone);
    const invUserId = currentInv.userId;

    const sb = getSupabase();
    if (sb && invUserId) {
      try {
        const { data: dbInvs, error: checkErr } = await sb
          .from('invitations')
          .select('id, user_id, guest_name, phone')
          .eq('user_id', invUserId)
          .neq('id', id);

        if (!checkErr && dbInvs) {
          const dup = dbInvs.find(inv => 
            normalizeArabicText(inv.guest_name) === normName &&
            normalizePhoneNumber(inv.phone) === normPhone
          );
          if (dup) {
            return {
              success: false,
              message: `ممنوع تكرار الدعوة: لديك دعوة أخرى مسجلة مسبقاً لهذا الضيف بنفس الاسم (${dup.guest_name}) ونفس رقم الهاتف (${dup.phone}).`
            };
          }
        }
      } catch (e) {
        console.warn('Supabase duplicate check in update warning:', e);
      }
    }

    const localDup = all.find(inv => 
      inv.userId === invUserId &&
      inv.id !== id &&
      normalizeArabicText(inv.guestName) === normName &&
      normalizePhoneNumber(inv.phone) === normPhone
    );
    if (localDup) {
      return {
        success: false,
        message: `ممنوع تكرار الدعوة: لديك دعوة أخرى مسجلة مسبقاً لهذا الضيف بنفس الاسم (${localDup.guestName}) ونفس رقم الهاتف (${localDup.phone}).`
      };
    }
  }

  all[idx] = { ...all[idx], ...updatedData };
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

  const sb = getSupabase();
  if (sb) {
    try {
      const updatePayload = {};
      if (updatedData.guestName !== undefined) updatePayload.guest_name = all[idx].guestName;
      if (updatedData.phone !== undefined) updatePayload.phone = all[idx].phone;
      if (updatedData.graduateName !== undefined) updatePayload.graduate_name = all[idx].graduateName;
      if (updatedData.peopleCount !== undefined) updatePayload.people_count = all[idx].peopleCount;
      if (updatedData.event !== undefined) updatePayload.event = all[idx].event;
      if (updatedData.eventType !== undefined) updatePayload.event_type = all[idx].eventType;
      if (updatedData.type !== undefined) updatePayload.type = all[idx].type;
      if (updatedData.status !== undefined) updatePayload.status = all[idx].status;
      if (updatedData.notes !== undefined) updatePayload.notes = all[idx].notes;

      await sb.from('invitations').update(updatePayload).eq('id', id);
    } catch (e) {
      console.warn('Supabase update invitation error:', e);
    }
  }
  return { success: true };
}

async function deleteInvitation(id) {
  let all = getInvitations();
  const exists = all.some(i => i.id === id);
  if (!exists) return false;

  all = all.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(all));

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('invitations').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete invitation error:', e);
    }
  }
  return true;
}

// حذف كافة الدعوات بالكامل من النظام والسحابة
async function deleteAllInvitations() {
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify([]));

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('invitations').delete().neq('id', '___dummy_never_match___');
    } catch (e) {
      console.warn('Supabase delete all invitations error:', e);
    }
  }
  return true;
}

// حذف مستخدم بواسطة المشرف
async function deleteUserByAdmin(userId) {
  let users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, message: 'المستخدم غير موجود' };

  if (user.role === 'admin' || user.username === 'admin') {
    return { success: false, message: 'لا يمكن حذف حساب المشرف الرئيسي.' };
  }

  // حذف المستخدم محلياً
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // حذف دعوات المستخدم محلياً أيضاً
  let invs = getInvitations();
  invs = invs.filter(i => i.userId !== userId);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(invs));

  // الحذف من Supabase
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('invitations').delete().eq('user_id', userId);
      await sb.from('users').delete().eq('id', userId);
    } catch (e) {
      console.warn('Supabase delete user error:', e);
    }
  }

  return { success: true };
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

// مزامنة سجل التحويلات من Supabase
async function syncTransfersFromSupabase(userId) {
  const sb = getSupabase();
  if (!sb) return getTransfers(userId);

  try {
    let query = sb.from('transfers').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(d => ({
        id: d.id,
        fromUserId: d.from_user_id,
        toUserId: d.to_user_id,
        fromUserName: d.from_user_name,
        toUserName: d.to_user_name,
        direction: d.from_user_id === userId ? 'sent' : 'received',
        count: d.count,
        type: d.type || 'عادية',
        event: d.event,
        notes: d.notes || '',
        dateDisplay: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : 'الآن',
        timeDisplay: d.created_at ? new Date(d.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
      }));

      // دمج وحفظ محلي
      const local = getTransfers();
      const mergedMap = new Map();
      local.forEach(item => mergedMap.set(item.id, item));
      mapped.forEach(item => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values());
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(mergedList));
      return userId ? mergedList.filter(t => t.fromUserId === userId || t.toUserId === userId) : mergedList;
    }
  } catch (e) {
    console.warn('Sync transfers error:', e);
  }
  return getTransfers(userId);
}

async function transferInvitations(fromUserId, toUserId, count, type, eventName, notes = '') {
  // التأكد من جلب أحدث المستخدمين
  const fromUser = getUser(fromUserId);
  const toUser = getUser(toUserId);

  if (!fromUser || !toUser) {
    return { success: false, message: 'يرجى اختيار المستخدم المستقبل للدعوات.' };
  }
  if (fromUserId === toUserId) {
    return { success: false, message: 'لا يمكنك تحويل الدعوات إلى نفسك.' };
  }

  const countNum = parseInt(count, 10);
  if (isNaN(countNum) || countNum <= 0) {
    return { success: false, message: 'يرجى إدخال عدد صحيح موجب من الدعوات (1 فأكثر).' };
  }

  const stats = getUserStats(fromUserId);
  if (type === 'VIP') {
    if (stats.vipRemaining < countNum) {
      return { success: false, message: `رصيدك المتاح من دعوات VIP هو ${stats.vipRemaining} فقط، لا يمكنك تحويل ${countNum}.` };
    }
  } else {
    if (stats.regularRemaining < countNum) {
      return { success: false, message: `رصيدك المتاح من الدعوات العادية هو ${stats.regularRemaining} فقط، لا يمكنك تحويل ${countNum}.` };
    }
  }

  // حساب الكوتا الجديدة
  let newFromReg = fromUser.regularQuota !== undefined ? fromUser.regularQuota : 30;
  let newFromVip = fromUser.vipQuota !== undefined ? fromUser.vipQuota : 0;
  let newToReg = toUser.regularQuota !== undefined ? toUser.regularQuota : 30;
  let newToVip = toUser.vipQuota !== undefined ? toUser.vipQuota : 0;

  if (type === 'VIP') {
    newFromVip = Math.max(0, newFromVip - countNum);
    newToVip = newToVip + countNum;
  } else {
    newFromReg = Math.max(0, newFromReg - countNum);
    newToReg = newToReg + countNum;
  }

  // 1. تحديث جدول المستخدمين المحلي
  const users = getUsers();
  const uFrom = users.find(u => u.id === fromUserId);
  const uTo = users.find(u => u.id === toUserId);
  if (uFrom) {
    uFrom.regularQuota = newFromReg;
    uFrom.vipQuota = newFromVip;
  }
  if (uTo) {
    uTo.regularQuota = newToReg;
    uTo.vipQuota = newToVip;
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // 2. تحديث كائن المستخدم الحالي في التخزين المحلي فوراً
  const curUser = getCurrentUser();
  if (curUser && curUser.id === fromUserId) {
    curUser.regularQuota = newFromReg;
    curUser.vipQuota = newFromVip;
    setCurrentUser(curUser);
  }

  // 3. إنشاء سجل التحويل
  const newTransfer = {
    id: `TR-${Date.now()}`,
    fromUserId,
    toUserId,
    fromUserName: fromUser.name,
    toUserName: toUser.name,
    direction: 'sent',
    count: countNum,
    type,
    event: eventName || (DEFAULT_EVENTS[0]?.name || 'حفل التخرج 2026'),
    notes: notes || '',
    dateDisplay: new Date().toISOString().split('T')[0],
    timeDisplay: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };

  const transfers = getTransfers();
  transfers.unshift(newTransfer);
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));

  // 4. مزامنة سحابية مع Supabase (تحديث كوتا الطرفين وإضافة سجل التحويل)
  const sb = getSupabase();
  if (sb) {
    try {
      await Promise.all([
        sb.from('users').update({ quota_regular: newFromReg, quota_vip: newFromVip }).eq('id', fromUserId),
        sb.from('users').update({ quota_regular: newToReg, quota_vip: newToVip }).eq('id', toUserId),
        sb.from('transfers').insert([{
          id: newTransfer.id,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          from_user_name: fromUser.name,
          to_user_name: toUser.name,
          count: countNum,
          type,
          event: newTransfer.event,
          notes: notes || ''
        }])
      ]);
    } catch (err) {
      console.warn('Supabase transfer sync warning:', err);
    }
  }

  return { 
    success: true, 
    message: `تم تحويل ${countNum} دعوة (${type}) بنجاح إلى ${toUser.name}!` 
  };
}

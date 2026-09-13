/**
 * إعدادات وبيانات حفل التخرج الافتراضية
 * مع دوال التعامل مع التخزين المحلي (LocalStorage)
 */

const STORAGE_KEYS = {
  EVENT_DATA: 'grad_invitation_event_data_v1',
  RSVP_LIST: 'grad_invitation_rsvp_list_v1',
  GUESTBOOK: 'grad_invitation_guestbook_v1',
  THEME: 'grad_invitation_theme_v1'
};

// البيانات الافتراضية لحفل التخرج
const DEFAULT_EVENT_DATA = {
  graduateName: 'م. فهد بن عبدالله القحطاني',
  degree: 'بكالوريوس هندسة البرمجيات مع مرتبة الشرف',
  university: 'جامعة الملك سعود - كلية علوم الحاسب والمعلومات',
  hostName: 'عائلة القحطاني الكريمة',
  eventDate: '2026-11-20T19:30:00', // التاريخ والوقت
  eventDateDisplay: 'يوم الجمعة، 20 نوفمبر 2026',
  eventTimeDisplay: 'الساعة 7:30 مساءً',
  venue: 'قاعة التاج الكبرى للاحتفالات - طريق الملك فهد',
  city: 'الرياض، المملكة العربية السعودية',
  mapUrl: 'https://maps.google.com/?q=King+Saud+University+Riyadh',
  welcomeNote: 'بمشاعر تفيض فرحاً وفخراً بما حققه من جد واجتهاد، يسرنا ويشرفنا دعوتكم لمشاركتنا فرحة تخرج نجلنا، ونسعد بحضوركم الذي يزيده بهجة وسروراً.',
  quranVerse: '﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُم وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾',
  program: [
    { time: '07:30 م', title: 'استقبال الضيوف الكرام والترحيب' },
    { time: '08:15 م', title: 'انطلاق مسيرة التخرج الرسمية' },
    { time: '08:45 م', title: 'كلمة الخريج وتكريم الداعمين' },
    { time: '09:15 م', title: 'عرض الذكريات والتقاط الصور التذكارية' },
    { time: '09:45 م', title: 'تناول طعام العشاء والاحتفال' }
  ],
  theme: 'navy'
};

// عينات افتراضية لسجل التهاني
const DEFAULT_GUESTBOOK = [
  {
    name: 'د. خالد بن سلطان',
    message: 'ألف مبارك التخرج يا مهندس فهد! نسأل الله لك التوفيق والنجاح الدائم في حياتك المهنية والعلمية.',
    date: 'منذ يومين'
  },
  {
    name: 'عبدالرحمن العتيبي',
    message: 'مبارك ومنها للأعلى يا رب، ثمرة تعب وسهر أعوام تكللت بهذا الإنجاز المشرف. فخورون بك!',
    date: 'أمس'
  },
  {
    name: 'سعود بن عبدالعزيز',
    message: 'أجمل التهاني والتبريكات لوالدك ولعائلتك الكريمة، حضورنا مؤكد بإذن الله لمشاركتكم الفرحة.',
    date: 'اليوم'
  }
];

// استرجاع بيانات الحفل من التخزين المحلي أو الافتراضي
function getEventData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENT_DATA);
    if (saved) {
      return { ...DEFAULT_EVENT_DATA, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error reading from localStorage', e);
  }
  return { ...DEFAULT_EVENT_DATA };
}

// حفظ بيانات الحفل
function saveEventData(data) {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENT_DATA, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving event data', e);
    return false;
  }
}

// استرجاع قائمة تأكيدات الحضور (RSVP)
function getRsvpList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RSVP_LIST);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading RSVP list', e);
  }
  return [];
}

// إضافة تأكيد حضور جديد
function addRsvpEntry(entry) {
  try {
    const list = getRsvpList();
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.RSVP_LIST, JSON.stringify(list));
    return newEntry;
  } catch (e) {
    console.error('Error adding RSVP', e);
    return null;
  }
}

// استرجاع سجل التهاني (Guestbook)
function getGuestbook() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GUESTBOOK);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading guestbook', e);
  }
  return [...DEFAULT_GUESTBOOK];
}

// إضافة رسالة تهنئة جديدة
function addGuestbookMessage(messageData) {
  try {
    const list = getGuestbook();
    list.unshift({
      id: Date.now(),
      date: 'الآن',
      ...messageData
    });
    localStorage.setItem(STORAGE_KEYS.GUESTBOOK, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Error adding guestbook entry', e);
    return false;
  }
}

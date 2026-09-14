-- ===================================================
-- كود إنشاء جداول نظام الدعوات الإلكترونية في Supabase
-- قم بنسخ هذا الكود بالكامل ولصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ===================================================

-- 1. جدول المستخدمين والخريجين (Users Table)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    major TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin' أو 'user'
    quota_regular INT DEFAULT 30, -- 30 دعوة لكل شخص افتراضياً
    quota_vip INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. جدول الدعوات والتذاكر (Invitations Table)
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    graduate_name TEXT NOT NULL, -- اسم الداعي / الخريج / العريس
    event TEXT NOT NULL,
    event_type TEXT DEFAULT 'graduation', -- نوع المناسبة: 'wedding' أو 'private' أو 'graduation'
    people_count INT DEFAULT 1,
    type TEXT DEFAULT 'عادية', -- 'عادية' أو 'VIP'
    status TEXT DEFAULT 'صالحة', -- 'صالحة' أو 'مستخدمة'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- في حال كان الجدول موجوداً مسبقاً، يمكنك تشغيل هذا السطر لإضافة العمود:
-- ALTER TABLE invitations ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'graduation';

-- 3. جدول سجل التحويلات بين المستخدمين (Transfers Table)
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    from_user_id TEXT,
    to_user_id TEXT,
    from_user_name TEXT,
    to_user_name TEXT,
    count INT NOT NULL,
    type TEXT DEFAULT 'عادية',
    event TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. إتاحة الصلاحيات الكاملة (Row Level Security / Policies)
-- للسماح بإجراء العمليات (قراءة، إضافة، تعديل، حذف) عبر مفتاح anon key
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;

-- 5. إنشاء حساب المشرف الافتراضي (Admin Account)
INSERT INTO users (id, username, password, name, major, role, quota_regular, quota_vip)
VALUES ('admin_root', 'admin', 'admin123', 'مشرف النظام', 'إدارة الحفل', 'admin', 999, 999)
ON CONFLICT (username) DO NOTHING;


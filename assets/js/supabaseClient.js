/**
 * supabaseClient.js - إعداد عميل Supabase وإدارة الاتصال بقاعدة البيانات السحابية
 */

const SUPABASE_STORAGE_KEY = 'grad_invitation_supabase_config_v1';

// الإعدادات الافتراضية المجهزة لمشروع Supabase الخاص بك
const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://kfivaixgwbpmwzvjlqem.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaXZhaXhnd2JwbXd6dmpscWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODczMzEsImV4cCI6MjEwNDg2MzMzMX0.3OmJUIMS3i1aD-fNrUHf1slJ3EeBBPry6VeyZyxhjkg'
};

function getSupabaseConfig() {
  try {
    const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SUPABASE_CONFIG;
}

function saveSupabaseConfig(url, anonKey) {
  const config = { url: url.trim(), anonKey: anonKey.trim() };
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
  _supabaseInstance = null; // إعادة تعيين العميل
  return config;
}

let _supabaseInstance = null;

function getSupabase() {
  if (_supabaseInstance) return _supabaseInstance;

  const config = getSupabaseConfig();
  if (config.url && config.anonKey && typeof supabase !== 'undefined' && supabase.createClient) {
    try {
      _supabaseInstance = supabase.createClient(config.url, config.anonKey);
      return _supabaseInstance;
    } catch (e) {
      console.warn('Supabase initialization failed, running in local mode:', e);
    }
  }
  return null;
}

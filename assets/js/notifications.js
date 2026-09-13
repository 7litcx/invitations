/**
 * notifications.js - نظام الإشعارات والتنبيهات العصرية الفاخرة
 * يدعم التنبيهات المنبثقة (Toast Notifications) مع أيقونات تفاعلية وشريط وقت وأصوات بصرية أنيقة
 */

(function () {
  'use strict';

  // إنشاء حاوية التوست تلقائياً في الصفحة
  function getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const TOAST_ICONS = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info'
  };

  const DEFAULT_TITLES = {
    success: 'تم بنجاح',
    error: 'خطأ',
    warning: 'تنبيه',
    info: 'معلومة'
  };

  // سجل لمنع تكرار الإشعارات المتطابقة في نفس اللحظة (Deduplication)
  const recentToasts = new Map();

  /**
   * عرض إشعار توست حديث وأنيق مع منع التكرار الذكي
   */
  function showToast(options, type = 'success', title = '', duration = 4000) {
    let config = {
      message: '',
      type: 'success',
      title: '',
      duration: 4000
    };

    if (typeof options === 'string') {
      config.message = options;
      config.type = type || 'success';
      config.title = title || DEFAULT_TITLES[config.type] || '';
      config.duration = duration || 4000;
    } else if (typeof options === 'object' && options !== null) {
      config = { ...config, ...options };
      if (!config.title) {
        config.title = DEFAULT_TITLES[config.type] || '';
      }
    }

    // فحص منع التكرار: إذا كان نفس الإشعار ونفس الرسالة قد ظهرت قبل أقل من ثانيتين يتم تجاهل التكرار
    const toastKey = `${config.type}_${config.title}_${config.message}`;
    const now = Date.now();
    if (recentToasts.has(toastKey) && (now - recentToasts.get(toastKey)) < 2000) {
      return null;
    }
    recentToasts.set(toastKey, now);

    const container = getOrCreateToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast-card toast-' + config.type;

    const iconClass = TOAST_ICONS[config.type] || TOAST_ICONS.info;

    toast.innerHTML = 
      '<div class=\"toast-icon-wrap\">' +
        '<i class=\"' + iconClass + '\"></i>' +
      '</div>' +
      '<div class=\"toast-content\">' +
        '<div class=\"toast-title\">' + escapeToastHtml(config.title) + '</div>' +
        '<div class=\"toast-msg\">' + escapeToastHtml(config.message).replace(/\n/g, '<br>') + '</div>' +
      '</div>' +
      '<button class=\"toast-close-btn\" title=\"إغلاق\">' +
        '<i class=\"fa-solid fa-xmark\"></i>' +
      '</button>' +
      '<div class=\"toast-progress-bar\">' +
        '<div class=\"toast-progress-fill\" style=\"animation-duration: ' + config.duration + 'ms;\"></div>' +
      '</div>';

    container.appendChild(toast);

    let dismissTimeout;
    const startDismiss = () => {
      dismissTimeout = setTimeout(() => {
        dismissToast(toast);
      }, config.duration);
    };

    startDismiss();

    // إيقاف المؤقت عند المرور بالماوس
    toast.addEventListener('mouseenter', () => {
      clearTimeout(dismissTimeout);
      const fill = toast.querySelector('.toast-progress-fill');
      if (fill) fill.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      const fill = toast.querySelector('.toast-progress-fill');
      if (fill) fill.style.animationPlayState = 'running';
      startDismiss();
    });

    // زر الإغلاق اليدوي
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(dismissTimeout);
        dismissToast(toast);
      });
    }

    return toast;
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('toast-hiding')) return;
    toast.classList.add('toast-hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    }, { once: true });
  }

  function escapeToastHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  // دوال الاختصار
  showToast.success = (msg, title) => showToast(msg, 'success', title);
  showToast.error = (msg, title) => showToast(msg, 'error', title);
  showToast.warning = (msg, title) => showToast(msg, 'warning', title);
  showToast.info = (msg, title) => showToast(msg, 'info', title);

  /**
   * نافذة تأكيد عصرية وفاخرة بديلة عن window.confirm
   * ترجع Promise<boolean>
   */
  function showConfirmModal(options) {
    return new Promise((resolve) => {
      let config = {
        title: 'تأكيد الإجراء',
        message: 'هل أنت متأكد من رغبتك في المتابعة؟',
        confirmText: 'نعم، تأكيد',
        cancelText: 'إلغاء',
        type: 'danger', // 'danger' | 'warning' | 'info'
        icon: 'fa-solid fa-trash-can'
      };

      if (typeof options === 'string') {
        config.message = options;
      } else if (typeof options === 'object' && options !== null) {
        config = { ...config, ...options };
      }

      // إزالة أي نافذة تأكيد سابقة
      const existing = document.getElementById('custom-confirm-modal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'custom-confirm-modal';
      overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-200';

      const iconBg = config.type === 'danger'
        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-rose-500/20'
        : (config.type === 'warning'
          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-amber-500/20'
          : 'bg-purple-500/15 text-purple-500 border border-purple-500/30 shadow-purple-500/20');

      const confirmBtnBg = config.type === 'danger'
        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
        : (config.type === 'warning'
          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
          : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30');

      overlay.innerHTML = `
        <div class="bg-white dark:bg-[#110d1d] border border-slate-200 dark:border-[#241d3b] max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 text-center transform transition-all scale-100 animate-scaleUp">
          <div class="w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center text-2xl mx-auto shadow-md">
            <i class="${config.icon}"></i>
          </div>
          <div class="space-y-1.5">
            <h4 class="text-base font-black text-slate-900 dark:text-white">${config.title}</h4>
            <div class="text-xs text-slate-500 dark:text-slate-300 leading-relaxed font-medium">${config.message}</div>
          </div>
          <div class="pt-2 flex items-center gap-2.5">
            <button id="confirm-modal-cancel" class="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#191428] dark:hover:bg-[#241d3b] text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer">
              ${config.cancelText}
            </button>
            <button id="confirm-modal-ok" class="flex-1 py-2.5 px-4 rounded-xl ${confirmBtnBg} text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
              <i class="${config.icon} text-xs"></i>
              <span>${config.confirmText}</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const cleanup = (result) => {
        document.removeEventListener('keydown', handleKey);
        overlay.classList.add('opacity-0');
        setTimeout(() => {
          overlay.remove();
        }, 150);
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          cleanup(false);
        } else if (e.key === 'Enter') {
          cleanup(true);
        }
      };

      document.addEventListener('keydown', handleKey);

      overlay.querySelector('#confirm-modal-cancel')?.addEventListener('click', () => cleanup(false));
      overlay.querySelector('#confirm-modal-ok')?.addEventListener('click', () => cleanup(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });
    });
  }

  // استبدال window.alert القياسي بالنظام العصري
  window.showToast = showToast;
  window.showConfirmModal = showConfirmModal;
  window.confirmModal = showConfirmModal;
  window.alert = function (msg) {
    if (!msg) return;
    const str = String(msg);
    if (str.includes('خطأ') || str.includes('تعذر') || str.includes('لا يمكن')) {
      showToast.error(str);
    } else if (str.includes('يرجى') || str.includes('تنبيه') || str.includes('حدد')) {
      showToast.warning(str);
    } else {
      showToast.success(str);
    }
  };

})();

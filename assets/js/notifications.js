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

  /**
   * عرض إشعار توست حديث وأنيق
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

  // استبدال window.alert القياسي بالنظام العصري
  window.showToast = showToast;
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

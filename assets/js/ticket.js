/**
 * ticket.js - منطق تذكرة الدعوة الإلكترونية المخصصة بالباركود الملكي
 */

document.addEventListener('DOMContentLoaded', async () => {
  initStore();
  
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('id');

  if (!ticketId) {
    showErrorState('لم يتم العثور على كود الدعوة في الرابط.');
    return;
  }

  // جلب الدعوة من الذاكرة المحلية أو من Supabase مباشرة
  const invitation = await fetchInvitationById(ticketId);
  if (!invitation) {
    showErrorState('عذراً، هذه الدعوة غير موجودة في النظام أو تم إلغاؤها.');
    return;
  }

  renderTicket(invitation);
  generateTicketQR(invitation);
  setupTicketActions(invitation);
});

function renderTicket(invitation) {
  document.getElementById('ticket-loading').classList.add('hidden');
  document.getElementById('ticket-content').classList.remove('hidden');

  // تعيين خلفية بطاقة التخرج بحسب النوع (عادية أو VIP)
  const visualCard = document.getElementById('ticket-visual-card');
  const isVip = invitation.type === 'VIP';

  if (visualCard) {
    const bgImage = isVip
      ? 'assets/images/ticket_template_vip.jpg'
      : 'assets/images/ticket_template_regular.jpg';
    visualCard.style.backgroundImage = `url('${bgImage}')`;
  }

  // البيانات في الكرت والتفاصيل
  document.getElementById('ticket-code').textContent = invitation.id;
  document.getElementById('ticket-guest-name').textContent = invitation.guestName;
  document.getElementById('ticket-event-name').textContent = invitation.event || 'حفل التخرج';
  document.getElementById('ticket-grad-name').textContent = invitation.graduateName;

  const phoneEl = document.getElementById('ticket-detail-phone');
  if (phoneEl) phoneEl.textContent = invitation.phone || '-';

  // شارة نوع الدعوة
  const typeContainer = document.getElementById('ticket-type-badge-container');
  if (typeContainer) {
    if (isVip) {
      typeContainer.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-sm border border-amber-400/50">
          <i class="fa-solid fa-crown text-[11px]"></i> دعوة VIP خاصة
        </span>
      `;
    } else {
      typeContainer.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-amber-200 border border-amber-500/30">
          <i class="fa-solid fa-graduation-cap text-xs"></i> دعوة عادية
        </span>
      `;
    }
  }

  // شارة حالة التذكرة
  const statusEl = document.getElementById('ticket-status-badge');
  if (statusEl) {
    if (invitation.status === 'صالحة') {
      statusEl.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-600/50';
      statusEl.textContent = 'تذكرة صالحة للدخول';
    } else {
      statusEl.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-600/50';
      statusEl.textContent = 'تم استخدام التذكرة مسبقاً';
    }
  }
}

/**
 * توليد الباركود QR بدقة وموثوقية عالية
 * يستخدم QRCode.js ويدعم النسخ الاحتياطي عبر صورة مباشرة لضمان الظهور الفوري 100%
 */
function generateTicketQR(invitation) {
  const container = document.getElementById('ticket-qrcode-container');
  if (!container) return;
  container.innerHTML = '';

  const fullUrl = window.location.href;

  let qrGenerated = false;

  // المحاولة 1: عبر مكتبة QRCode.js
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: fullUrl,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      qrGenerated = true;
    } catch (e) {
      console.warn('QRCode lib error, falling back:', e);
    }
  }

  // المحاولة 2 (احتياطي دائم): إذا لم تظهر مكتبة JS يولد الباركود عبر صورة سريعة
  if (!qrGenerated || container.children.length === 0) {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=000000&bgcolor=ffffff&data=${encodeURIComponent(fullUrl)}`;
    qrImg.alt = `QR-${invitation.id}`;
    qrImg.className = 'w-full h-full object-contain';
    container.appendChild(qrImg);
  }
}

function setupTicketActions(invitation) {
  // زر واتساب
  document.getElementById('btn-ticket-whatsapp')?.addEventListener('click', () => {
    const text = `🎓 *بطاقة دعوة رسمية لحضور حفل التخرج*\n\nالمكرم/ة: *${invitation.guestName}*\nبدعوة من: *${invitation.graduateName}*\nنوع الدعوة: *${invitation.type}*\nرقم التذكرة: *${invitation.id}*\n\nيرجى فتح الرابط لإبراز بطاقة الدعوة والباركود المخصص عند بوابة الدخول:\n${window.location.href}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  // زر نسخ الرابط
  document.getElementById('btn-ticket-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast.success('تم نسخ رابط بطاقة الدعوة إلى الحافظة بنجاح!', 'تم النسخ');
    });
  });

  // زر الطباعة
  document.getElementById('btn-ticket-print')?.addEventListener('click', () => {
    window.print();
  });
}

function showErrorState(msg) {
  document.getElementById('ticket-loading')?.classList.add('hidden');
  const err = document.getElementById('ticket-error');
  if (err) {
    err.classList.remove('hidden');
    document.getElementById('error-text').textContent = msg;
  }
}


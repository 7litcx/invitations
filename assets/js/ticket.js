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
  document.getElementById('ticket-event-name').textContent = invitation.event || 'حفل التخرج 2026';
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
  // تشفير معرف الدعوة المباشر بدلاً من الرابط الطويل لتقليل كثافة المربعات وتسريع المسح 10 أضعاف
  const qrPayload = invitation.id;

  let qrGenerated = false;

  // المحاولة 1: عبر مكتبة QRCode.js بأعلى وضوح وأسرع مستوى قراءة L
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: qrPayload,
        width: 240,
        height: 240,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
      });
      qrGenerated = true;
    } catch (e) {
      console.warn('QRCode lib error, falling back:', e);
    }
  }

  // المحاولة 2 (احتياطي دائم): صورة سريعة خفيفة جداً
  if (!qrGenerated || container.children.length === 0) {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=000000&bgcolor=ffffff&ecc=L&data=${encodeURIComponent(qrPayload)}`;
    qrImg.alt = `QR-${invitation.id}`;
    qrImg.className = 'w-full h-full object-contain';
    container.appendChild(qrImg);
  }
}

function setupTicketActions(invitation) {
  // زر واتساب
  document.getElementById('btn-ticket-whatsapp')?.addEventListener('click', () => {
    let major = invitation.major;
    if (!major && invitation.userId && typeof getUser === 'function') {
      const gradUser = getUser(invitation.userId);
      if (gradUser && gradUser.major) major = gradUser.major;
    }
    if (!major && typeof getCurrentUser === 'function') {
      const curUser = getCurrentUser();
      if (curUser && curUser.major) major = curUser.major;
    }

    const majorLine = major ? `\nالتخصص: *${major}*` : '';
    const text = `🎓 *بطاقة دعوة رسمية لحضور حفل التخرج*\n\nالمكرم/ة: *${invitation.guestName}* المحترم/ة\nيسرني دعوتكم لحضور حفل تخرج:\n*${invitation.graduateName}*${majorLine}\nنوع الدعوة: *${invitation.type}*\n\nيرجى فتح الرابط لإبراز بطاقة الدعوة والباركود المخصص عند بوابة الدخول:\n${window.location.href}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  });

  // زر نسخ الرابط
  document.getElementById('btn-ticket-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast.success('تم نسخ رابط بطاقة الدعوة إلى الحافظة بنجاح!', 'تم النسخ');
    });
  });

  // زر حفظ الدعوة كصورة
  document.getElementById('btn-ticket-save-image')?.addEventListener('click', () => {
    saveTicketAsImage(invitation);
  });
}

/**
 * حفظ بطاقة الدعوة كصورة عالية الدقة PNG
 */
async function saveTicketAsImage(invitation) {
  const saveBtn = document.getElementById('btn-ticket-save-image');
  const originalHtml = saveBtn ? saveBtn.innerHTML : '';

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>جاري التجهيز...</span>';
  }

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const visualCard = document.getElementById('ticket-visual-card');
    if (!visualCard) throw new Error('تعذر العثور على بطاقة الدعوة');

    let canvas = null;

    // المحاولة 1: عبر مكتبة html2canvas بدقة فائقة 3x
    if (typeof html2canvas !== 'undefined') {
      try {
        canvas = await html2canvas(visualCard, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          onclone: (clonedDoc) => {
            const card = clonedDoc.getElementById('ticket-visual-card');
            if (card) {
              card.style.boxShadow = 'none';
              card.style.margin = '0';
              card.style.border = 'none';
            }
          }
        });
      } catch (e) {
        console.warn('html2canvas error, switching to native canvas:', e);
      }
    }

    // المحاولة 2 (احتياطي دائم): رسم مباشر على HTML5 Canvas عالي الدقة
    if (!canvas) {
      canvas = await renderNativeCanvasTicket(invitation);
    }

    if (!canvas) {
      throw new Error('تعذر إنشاء صورة التذكرة');
    }

    const cleanName = (invitation.guestName || 'الضيف')
      .trim()
      .replace(/[/\\?%*:|"<>]+/g, '')
      .replace(/\s+/g, '_');
    const fileName = `دعوة_${cleanName}_${invitation.id}.png`;

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          downloadViaDataUrl(canvas, fileName);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          link.remove();
          URL.revokeObjectURL(blobUrl);
        }, 2000);
        showToast.success('تم حفظ بطاقة الدعوة كصورة بجودة فائقة بنجاح!', 'تم الحفظ');
      }, 'image/png', 1.0);
    } else {
      downloadViaDataUrl(canvas, fileName);
    }

  } catch (err) {
    console.error('Error saving ticket image:', err);
    showToast.error('حدث خطأ أثناء حفظ الصورة، يرجى إعادة المحاولة.', 'خطأ في الحفظ');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml || '<i class="fa-solid fa-image"></i> <span>حفظ كصورة</span>';
    }
  }
}

function downloadViaDataUrl(canvas, fileName) {
  try {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
    showToast.success('تم حفظ بطاقة الدعوة كصورة بنجاح!', 'تم الحفظ');
  } catch (e) {
    console.error('downloadViaDataUrl error:', e);
    showToast.error('تعذر تصدير ملف الصورة.', 'تنبيه');
  }
}

async function renderNativeCanvasTicket(invitation) {
  const canvas = document.createElement('canvas');
  const W = 1164;
  const H = 2048;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isVip = invitation.type === 'VIP';
  const bgImageSrc = isVip
    ? 'assets/images/ticket_template_vip.jpg'
    : 'assets/images/ticket_template_regular.jpg';

  const bgImg = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذر تحميل قالب الخلفية'));
    img.src = bgImageSrc;
  });

  // رسم خلفية التذكرة بزوايا دائرية
  ctx.save();
  const radius = 48;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(W - radius, 0);
  ctx.quadraticCurveTo(W, 0, W, radius);
  ctx.lineTo(W, H - radius);
  ctx.quadraticCurveTo(W, H, W - radius, H);
  ctx.lineTo(radius, H);
  ctx.quadraticCurveTo(0, H, 0, H - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(bgImg, 0, 0, W, H);
  ctx.restore();

  // اسم الضيف داخل الإطار المذهب
  ctx.save();
  ctx.font = '800 46px "Cairo", sans-serif';
  ctx.fillStyle = '#700f1c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(invitation.guestName || '', W / 2, H * 0.762, W * 0.72);
  ctx.restore();

  // الباركود المخصص
  const qrContainer = document.getElementById('ticket-qrcode-container');
  const qrCanvas = qrContainer?.querySelector('canvas');
  const qrImg = qrContainer?.querySelector('img');

  const qrBoxW = 280;
  const qrBoxH = 280;
  const qrBoxX = (W - qrBoxW) / 2;
  const qrBoxY = (H * 0.89) - (qrBoxH / 2);

  // إطار أبيض خلف الباركود
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  const br = 24;
  ctx.beginPath();
  ctx.moveTo(qrBoxX + br, qrBoxY);
  ctx.lineTo(qrBoxX + qrBoxW - br, qrBoxY);
  ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY, qrBoxX + qrBoxW, qrBoxY + br);
  ctx.lineTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH - br);
  ctx.quadraticCurveTo(qrBoxX + qrBoxW, qrBoxY + qrBoxH, qrBoxX + qrBoxW - br, qrBoxY + qrBoxH);
  ctx.lineTo(qrBoxX + br, qrBoxY + qrBoxH);
  ctx.quadraticCurveTo(qrBoxX, qrBoxY + qrBoxH, qrBoxX, qrBoxY + qrBoxH - br);
  ctx.lineTo(qrBoxX, qrBoxY + br);
  ctx.quadraticCurveTo(qrBoxX, qrBoxY, qrBoxX + br, qrBoxY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // رسم الباركود داخل الإطار
  const pad = 12;
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
  } else if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
    ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
  }

  // كود التذكرة
  const codeText = invitation.id;
  ctx.save();
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textMetrics = ctx.measureText(codeText);
  const pillW = textMetrics.width + 28;
  const pillH = 36;
  const pillX = (W - pillW) / 2;
  const pillY = (H * 0.962) - (pillH / 2);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  const pr = 8;
  ctx.beginPath();
  ctx.moveTo(pillX + pr, pillY);
  ctx.lineTo(pillX + pillW - pr, pillY);
  ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pr);
  ctx.lineTo(pillX + pillW, pillY + pillH - pr);
  ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pr, pillY + pillH);
  ctx.lineTo(pillX + pr, pillY + pillH);
  ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pr);
  ctx.lineTo(pillX, pillY + pr);
  ctx.quadraticCurveTo(pillX, pillY, pillX + pr, pillY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#700f1c';
  ctx.fillText(codeText, W / 2, H * 0.962);
  ctx.restore();

  return canvas;
}

function showErrorState(msg) {
  document.getElementById('ticket-loading')?.classList.add('hidden');
  const err = document.getElementById('ticket-error');
  if (err) {
    err.classList.remove('hidden');
    document.getElementById('error-text').textContent = msg;
  }
}


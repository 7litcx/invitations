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

  const eventType = invitation.eventType || (typeof detectEventType === 'function' ? detectEventType(invitation.event) : 'graduation');
  const isVip = invitation.type === 'VIP';
  const visualCard = document.getElementById('ticket-visual-card');

  const weddingLayout = document.getElementById('wedding-card-layout');
  const privateLayout = document.getElementById('private-card-layout');
  const gradLayout = document.getElementById('graduation-card-layout');

  // إخفاء كافة القوالب أولاً
  weddingLayout?.classList.add('hidden');
  privateLayout?.classList.add('hidden');
  gradLayout?.classList.add('hidden');

  if (eventType === 'wedding') {
    // 💍 قالب حفل الزفاف الملكي
    weddingLayout?.classList.remove('hidden');
    if (visualCard) {
      visualCard.style.backgroundImage = 'none';
      visualCard.style.backgroundColor = '#0a1f15';
    }

    const hostEl = document.getElementById('wedding-host-name');
    const guestEl = document.getElementById('wedding-guest-name');
    const codeEl = document.getElementById('wedding-ticket-code');

    if (hostEl) hostEl.textContent = invitation.graduateName || 'أهل العرس الكرام';
    if (guestEl) guestEl.textContent = invitation.guestName;
    if (codeEl) codeEl.textContent = invitation.id;

    // تفاصيل الجدول
    const hostLabel = document.getElementById('ticket-host-label');
    if (hostLabel) hostLabel.textContent = 'الداعي / العريس:';

    const catBadge = document.getElementById('ticket-category-badge');
    if (catBadge) {
      catBadge.innerHTML = `<span class="badge-event-wedding"><i class="fa-solid fa-ring"></i> حفل زواج</span>`;
    }

    const venueTime = document.getElementById('ticket-venue-time');
    if (venueTime) venueTime.textContent = 'قصر الأفراح الملكي - 8:00 مساءً';

  } else if (eventType === 'private') {
    // ✨ قالب المناسبة والاحتفال الخاص
    privateLayout?.classList.remove('hidden');
    if (visualCard) {
      visualCard.style.backgroundImage = 'none';
      visualCard.style.backgroundColor = '#0e0a19';
    }

    const titleEl = document.getElementById('private-event-title');
    const hostEl = document.getElementById('private-host-name');
    const guestEl = document.getElementById('private-guest-name');
    const codeEl = document.getElementById('private-ticket-code');

    if (titleEl) titleEl.textContent = invitation.event || 'مناسبة خاصة واحتفال VIP';
    if (hostEl) hostEl.textContent = invitation.graduateName || 'صاحب الدعوة الكريمة';
    if (guestEl) guestEl.textContent = invitation.guestName;
    if (codeEl) codeEl.textContent = invitation.id;

    const hostLabel = document.getElementById('ticket-host-label');
    if (hostLabel) hostLabel.textContent = 'صاحب المناسبة / الداعي:';

    const catBadge = document.getElementById('ticket-category-badge');
    if (catBadge) {
      catBadge.innerHTML = `<span class="badge-event-private"><i class="fa-solid fa-sparkles"></i> مناسبة خاصة</span>`;
    }

    const venueTime = document.getElementById('ticket-venue-time');
    if (venueTime) venueTime.textContent = 'قاعة كبار الشخصيات VIP - 7:30 مساءً';

  } else {
    // 🎓 قالب حفل التخرج (الافتراضي القائم)
    gradLayout?.classList.remove('hidden');

    if (visualCard) {
      const bgImage = isVip
        ? 'assets/images/ticket_template_vip.jpg'
        : 'assets/images/ticket_template_regular.jpg';
      visualCard.style.backgroundImage = `url('${bgImage}')`;
    }

    const guestEl = document.getElementById('ticket-guest-name');
    const codeEl = document.getElementById('ticket-code');

    if (guestEl) guestEl.textContent = invitation.guestName;
    if (codeEl) codeEl.textContent = invitation.id;

    const hostLabel = document.getElementById('ticket-host-label');
    if (hostLabel) hostLabel.textContent = 'الخريج الداعي:';

    const catBadge = document.getElementById('ticket-category-badge');
    if (catBadge) {
      catBadge.innerHTML = `<span class="badge-event-grad"><i class="fa-solid fa-graduation-cap"></i> حفل تخرج</span>`;
    }

    const venueTime = document.getElementById('ticket-venue-time');
    if (venueTime) venueTime.textContent = 'قاعة الاحتفالات الكبرى - 8:00 صباحاً';
  }

  // البيانات المشتركة في كرت التفاصيل
  const gradNameEl = document.getElementById('ticket-grad-name');
  if (gradNameEl) gradNameEl.textContent = invitation.graduateName || '-';

  const eventNameEl = document.getElementById('ticket-event-name');
  if (eventNameEl) eventNameEl.textContent = invitation.event || (eventType === 'wedding' ? 'حفل زواج مبارك' : 'حفل التخرج 2026');

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
      const icon = eventType === 'wedding' ? 'fa-ring' : (eventType === 'private' ? 'fa-sparkles' : 'fa-ticket');
      typeContainer.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-amber-200 border border-amber-500/30">
          <i class="fa-solid ${icon} text-xs"></i> دعوة رسمية عادية
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
 * توليد الباركود QR بدقة وموثوقية عالية داخل الحاوية المناسبة لنوع المناسبة
 */
function generateTicketQR(invitation) {
  const eventType = invitation.eventType || (typeof detectEventType === 'function' ? detectEventType(invitation.event) : 'graduation');

  let container = null;
  if (eventType === 'wedding') {
    container = document.getElementById('wedding-qrcode-slot');
  } else if (eventType === 'private') {
    container = document.getElementById('private-qrcode-slot');
  } else {
    container = document.getElementById('ticket-qrcode-container');
  }

  if (!container) return;
  container.innerHTML = ''; // مسح أي محتوى سابق

  const qrPayload = invitation.id;
  let qrGenerated = false;

  // المحاولة 1: عبر مكتبة QRCode.js
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
  // زر واتساب الذكي المتكيف مع نوع المناسبة
  document.getElementById('btn-ticket-whatsapp')?.addEventListener('click', () => {
    const eventType = invitation.eventType || (typeof detectEventType === 'function' ? detectEventType(invitation.event) : 'graduation');

    let text = '';
    if (eventType === 'wedding') {
      text = `💍 *بطاقة دعوة رسمية لحضور حفل زفاف مبارك*\n\n﴿ بَارَكَ اللَّهُ لَهُمَا وَبَارَكَ عَلَيْهِمَا وَجَمَعَ بَيْنَهُمَا فِي خَيْرٍ ﴾\n\nالمكرم/ة: *${invitation.guestName}* المحترم/ة\nيسرنا ويشرفنا دعوتكم لمشاركتنا فرحة العمر بمناسبة زفاف:\n*${invitation.graduateName}*\nنوع الدعوة: *${invitation.type}*\n\nيرجى فتح الرابط لإبراز بطاقة الدعوة ورمز الدخول الذكي QR عند بوابة الحفل:\n${window.location.href}`;
    } else if (eventType === 'private') {
      text = `✨ *بطاقة دعوة خاصة وحصرية | VIP*\n\nالمكرم/ة: *${invitation.guestName}* المحترم/ة\nيسرنا دعوتكم لحضور ومشاركتنا:\n*${invitation.event || 'المناسبة الخاصة'}*\nبدعوة كريمة من: *${invitation.graduateName}*\nنوع الدعوة: *${invitation.type}*\n\nيرجى فتح الرابط لإبراز بطاقة الدعوة والباركود المخصص عند بوابة الدخول:\n${window.location.href}`;
    } else {
      let major = invitation.major;
      if (!major && invitation.userId && typeof getUser === 'function') {
        const gradUser = getUser(invitation.userId);
        if (gradUser && gradUser.major) major = gradUser.major;
      }
      const majorLine = major ? `\nالتخصص: *${major}*` : '';
      text = `🎓 *بطاقة دعوة رسمية لحضور حفل التخرج*\n\nالمكرم/ة: *${invitation.guestName}* المحترم/ة\nيسرني دعوتكم لحضور حفل تخرج:\n*${invitation.graduateName}*${majorLine}\nنوع الدعوة: *${invitation.type}*\n\nيرجى فتح الرابط لإبراز بطاقة الدعوة والباركود المخصص عند بوابة الدخول:\n${window.location.href}`;
    }

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

  const eventType = invitation.eventType || (typeof detectEventType === 'function' ? detectEventType(invitation.event) : 'graduation');
  const isVip = invitation.type === 'VIP';

  // دالة مساعدة لرسم مستطيل بحواف دائرية
  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  if (eventType === 'wedding') {
    // 💍 رسم بطاقة زفاف ملكية زمردية مذهبة
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#091f15');
    grad.addColorStop(0.4, '#103827');
    grad.addColorStop(1, '#07170f');

    ctx.save();
    drawRoundedRect(0, 0, W, H, 48);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    // إطار ذهبي خارجي وداخلي
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    drawRoundedRect(30, 30, W - 60, H - 60, 36);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 3;
    drawRoundedRect(50, 50, W - 100, H - 100, 28);
    ctx.stroke();

    // البسملة والآية الكريمة
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Cairo", sans-serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', W / 2, 160);

    ctx.font = 'bold 64px "Cairo", sans-serif';
    ctx.fillText('💍', W / 2, 260);

    ctx.font = 'bold 34px "Cairo", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('﴿ بَارَكَ اللَّهُ لَهُمَا وَبَارَكَ عَلَيْهِمَا وَجَمَعَ بَيْنَهُمَا فِي خَيْرٍ ﴾', W / 2, 350);

    // عنوان البطاقة
    ctx.fillStyle = '#d4af37';
    ctx.font = '900 52px "Cairo", sans-serif';
    ctx.fillText('دعوة حفل زفاف مبارك', W / 2, 470);

    // اسم الداعي
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 36px "Cairo", sans-serif';
    ctx.fillText('يتشرف الداعي الكريم', W / 2, 600);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 58px "Cairo", sans-serif';
    ctx.fillText(invitation.graduateName || 'أهل العرس', W / 2, 690);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 34px "Cairo", sans-serif';
    ctx.fillText('بدعوة كريم خلقكم لمشاركتنا فرحة العمر', W / 2, 780);

    // شريط اسم الضيف
    const ribbonY = 920;
    const ribbonH = 180;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
    drawRoundedRect(120, ribbonY, W - 240, ribbonH, 28);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    drawRoundedRect(120, ribbonY, W - 240, ribbonH, 28);
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 32px "Cairo", sans-serif';
    ctx.fillText('المكرم / المكرمة:', W / 2, ribbonY + 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px "Cairo", sans-serif';
    ctx.fillText(invitation.guestName || '', W / 2, ribbonY + 130, W - 320);

    // الباركود
    const qrContainer = document.getElementById('wedding-qrcode-slot');
    const qrCanvas = qrContainer?.querySelector('canvas');
    const qrImg = qrContainer?.querySelector('img');

    const qrBoxW = 340;
    const qrBoxH = 340;
    const qrBoxX = (W - qrBoxW) / 2;
    const qrBoxY = 1340;

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
    ctx.stroke();

    const pad = 18;
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    } else if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    }

    // كود التذكرة
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(invitation.id, W / 2, 1750);
    ctx.restore();

    return canvas;

  } else if (eventType === 'private') {
    // ✨ رسم بطاقة مناسبة خاصة ملكية ليلية VIP
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0c0717');
    grad.addColorStop(0.4, '#1e1136');
    grad.addColorStop(1, '#090512');

    ctx.save();
    drawRoundedRect(0, 0, W, H, 48);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    ctx.strokeStyle = '#bda6e3';
    ctx.lineWidth = 10;
    drawRoundedRect(30, 30, W - 60, H - 60, 36);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(189, 166, 227, 0.35)';
    ctx.lineWidth = 3;
    drawRoundedRect(50, 50, W - 100, H - 100, 28);
    ctx.stroke();

    ctx.font = 'bold 68px "Cairo", sans-serif';
    ctx.fillStyle = '#bda6e3';
    ctx.textAlign = 'center';
    ctx.fillText('✨', W / 2, 220);

    ctx.font = '900 40px "Cairo", sans-serif';
    ctx.fillText('VIP SPECIAL INVITATION', W / 2, 310);

    ctx.fillStyle = '#fde047';
    ctx.font = '900 56px "Cairo", sans-serif';
    ctx.fillText(invitation.event || 'مناسبة خاصة واحتفال VIP', W / 2, 420);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 36px "Cairo", sans-serif';
    ctx.fillText('يسرنا ويشرفنا دعوتكم بدعوة كريمة من:', W / 2, 580);

    ctx.fillStyle = '#e9d5ff';
    ctx.font = '900 58px "Cairo", sans-serif';
    ctx.fillText(invitation.graduateName || 'صاحب الدعوة', W / 2, 670);

    // شريط اسم الضيف
    const ribbonY = 880;
    const ribbonH = 180;
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    drawRoundedRect(120, ribbonY, W - 240, ribbonH, 28);
    ctx.fill();
    ctx.strokeStyle = '#bda6e3';
    ctx.lineWidth = 4;
    drawRoundedRect(120, ribbonY, W - 240, ribbonH, 28);
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 32px "Cairo", sans-serif';
    ctx.fillText('المكرم / المكرمة:', W / 2, ribbonY + 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px "Cairo", sans-serif';
    ctx.fillText(invitation.guestName || '', W / 2, ribbonY + 130, W - 320);

    // الباركود
    const qrContainer = document.getElementById('private-qrcode-slot');
    const qrCanvas = qrContainer?.querySelector('canvas');
    const qrImg = qrContainer?.querySelector('img');

    const qrBoxW = 340;
    const qrBoxH = 340;
    const qrBoxX = (W - qrBoxW) / 2;
    const qrBoxY = 1320;

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
    ctx.fill();
    ctx.strokeStyle = '#bda6e3';
    ctx.lineWidth = 6;
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
    ctx.stroke();

    const pad = 18;
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    } else if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    }

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(invitation.id, W / 2, 1730);
    ctx.restore();

    return canvas;

  } else {
    // 🎓 رسم بطاقة التخرج عبر قالب الصورة الأصلي
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

    ctx.save();
    drawRoundedRect(0, 0, W, H, 48);
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

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 24);
    ctx.fill();
    ctx.restore();

    const pad = 12;
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    } else if (qrImg && qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.drawImage(qrImg, qrBoxX + pad, qrBoxY + pad, qrBoxW - (pad * 2), qrBoxH - (pad * 2));
    }

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
    drawRoundedRect(pillX, pillY, pillW, pillH, 8);
    ctx.fill();

    ctx.fillStyle = '#700f1c';
    ctx.fillText(codeText, W / 2, H * 0.962);
    ctx.restore();

    return canvas;
  }
}

function showErrorState(msg) {
  document.getElementById('ticket-loading')?.classList.add('hidden');
  const err = document.getElementById('ticket-error');
  if (err) {
    err.classList.remove('hidden');
    document.getElementById('error-text').textContent = msg;
  }
}


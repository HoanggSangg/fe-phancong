import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

export const LABEL_W_MM = 60;
export const LABEL_H_MM = 40;
export const QR_PARTS = 6;
export const TOTAL_PARTS = 10;

const PRINT_DPI = 300;
export const LABEL_PX_W = Math.round((LABEL_W_MM / 25.4) * PRINT_DPI);
export const LABEL_PX_H = Math.round((LABEL_H_MM / 25.4) * PRINT_DPI);

const LABEL_BG_SRC = '/labels/ba-thanh-qr-bg.png';
const BLUE = '#1A5BB5';
const PILL_BLUE = '#073894';
const RED = '#C62828';
const DARK = '#37474F';

// Vùng QR / ô mã trên ảnh mẫu 1916×821 — không đè logo Bá Thành.
const QR_PANEL = { x: 0.499, y: 0.071, w: 0.472, h: 0.855 };
const PILL = { x: 0.062, y: 0.78, w: 0.381, h: 0.152 };

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tạo được mã QR.'));
    img.src = src;
  });

let bgCache;
const loadLabelBackground = () => {
  if (!bgCache) {
    bgCache = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = LABEL_BG_SRC;
    });
  }
  return bgCache;
};

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawSmilingCar = (ctx, cx, cy, scale) => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.moveTo(-42, 8);
  ctx.quadraticCurveTo(-46, -6, -28, -14);
  ctx.lineTo(22, -16);
  ctx.quadraticCurveTo(44, -14, 46, 6);
  ctx.lineTo(40, 18);
  ctx.lineTo(-36, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-8, -2, 11, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(16, -2, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(-8, 0, 5.5, 0, Math.PI * 2);
  ctx.arc(16, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-6, -2, 2, 0, Math.PI * 2);
  ctx.arc(18, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawCodePill = (ctx, text, x, y, w, h, fill) => {
  roundRect(ctx, x, y, w, h, h * 0.28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fontSize = Math.floor(h * 0.48);
  ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  while (fontSize > 10 && ctx.measureText(text).width > w * 0.9) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  }
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.5, w * 0.92);
};

const drawFallbackBrand = (ctx, w, h, qrImg, text) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const pad = h * 0.055;
  const radius = h * 0.08;
  roundRect(ctx, pad * 0.4, pad * 0.4, w - pad * 0.8, h - pad * 0.8, radius);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(2, h * 0.018);
  ctx.stroke();
  roundRect(ctx, pad * 0.85, pad * 0.85, w - pad * 1.7, h - pad * 1.7, radius * 0.75);
  ctx.lineWidth = Math.max(1.5, h * 0.01);
  ctx.stroke();

  const qrColW = w * (QR_PARTS / TOTAL_PARTS);
  const leftW = w - qrColW;
  const framePad = pad * 1.15;
  const qrBoxX = leftW + pad * 0.2;
  const qrBoxY = framePad;
  const qrBoxH = h - framePad * 2;
  const qrBoxW = w - qrBoxX - framePad;

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, h * 0.04);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(1.5, h * 0.012);
  ctx.stroke();

  const qrInner = Math.min(qrBoxW, qrBoxH) * 0.9;
  ctx.drawImage(
    qrImg,
    qrBoxX + (qrBoxW - qrInner) / 2,
    qrBoxY + (qrBoxH - qrInner) / 2,
    qrInner,
    qrInner,
  );

  const leftCx = pad * 1.6 + (leftW - pad * 2.4) / 2;
  ctx.fillStyle = DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.floor(h * 0.09)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('Make Your Car Smile', leftCx, h * 0.13);

  drawSmilingCar(ctx, leftCx, h * 0.34, h / 210);

  ctx.fillStyle = RED;
  ctx.font = `800 ${Math.floor(h * 0.145)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('BÁ THÀNH', leftCx, h * 0.54);

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(1, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(leftCx - leftW * 0.32, h * 0.635);
  ctx.lineTo(leftCx - leftW * 0.08, h * 0.635);
  ctx.moveTo(leftCx + leftW * 0.08, h * 0.635);
  ctx.lineTo(leftCx + leftW * 0.32, h * 0.635);
  ctx.stroke();
  ctx.fillStyle = BLUE;
  ctx.font = `700 ${Math.floor(h * 0.08)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('QUÉT MÃ', leftCx, h * 0.638);

  const badgeH = h * 0.175;
  const badgeW = leftW - pad * 2.4;
  drawCodePill(ctx, text, pad * 1.5, h - pad * 1.35 - badgeH, badgeW, badgeH, BLUE);
};

const drawFromTemplate = (ctx, w, h, bgImg, qrImg, text) => {
  ctx.drawImage(bgImg, 0, 0, w, h);

  const qx = w * QR_PANEL.x;
  const qy = h * QR_PANEL.y;
  const qw = w * QR_PANEL.w;
  const qh = h * QR_PANEL.h;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qx, qy, qw, qh);

  const qrSize = Math.min(qw, qh) * 0.92;
  ctx.drawImage(
    qrImg,
    qx + (qw - qrSize) / 2,
    qy + (qh - qrSize) / 2,
    qrSize,
    qrSize,
  );

  drawCodePill(
    ctx,
    text,
    w * PILL.x,
    h * PILL.y,
    w * PILL.w,
    h * PILL.h,
    PILL_BLUE,
  );
};

export const parseLabelCodes = (raw) => {
  const seen = new Set();
  return String(raw || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
};

export const renderQrLabelCanvas = async (code) => {
  const text = String(code || '').trim();
  if (!text) {
    throw new Error('Nhập mã hàng hóa để tạo tem.');
  }

  const qrUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 1024,
    color: { dark: '#111111', light: '#ffffff' },
  });
  const [qrImg, bgImg] = await Promise.all([loadImage(qrUrl), loadLabelBackground()]);

  const w = LABEL_PX_W;
  const h = LABEL_PX_H;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (bgImg) {
    drawFromTemplate(ctx, w, h, bgImg, qrImg, text);
  } else {
    drawFallbackBrand(ctx, w, h, qrImg, text);
  }

  return canvas;
};

export const exportQrLabelsPdf = async (codes) => {
  const list = Array.isArray(codes) ? codes.map((item) => String(item).trim()).filter(Boolean) : [];
  if (!list.length) {
    throw new Error('Nhập ít nhất một mã hàng hóa.');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [LABEL_W_MM, LABEL_H_MM],
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 0; i < list.length; i += 1) {
    if (i > 0) doc.addPage([LABEL_W_MM, LABEL_H_MM], 'landscape');
    const canvas = await renderQrLabelCanvas(list[i]);
    doc.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      pageW,
      pageH,
      undefined,
      'FAST',
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = list.length === 1
    ? `tem-qr-${list[0].replace(/[^\w.-]+/g, '_')}.pdf`
    : `tem-qr-${list.length}-tem-${stamp}.pdf`;
  doc.save(name);
  return name;
};

const waitForImages = (doc) =>
  new Promise((resolve) => {
    const imgs = Array.from(doc.images || []);
    if (!imgs.length) {
      resolve();
      return;
    }
    let pending = imgs.length;
    const mark = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };
    imgs.forEach((img) => {
      if (img.complete) mark();
      else {
        img.addEventListener('load', mark, { once: true });
        img.addEventListener('error', mark, { once: true });
      }
    });
  });

export const printQrLabels = async (codes) => {
  const list = Array.isArray(codes) ? codes.map((item) => String(item).trim()).filter(Boolean) : [];
  if (!list.length) {
    throw new Error('Nhập ít nhất một mã hàng hóa.');
  }

  const images = [];
  for (const code of list) {
    const canvas = await renderQrLabelCanvas(code);
    images.push(canvas.toDataURL('image/png'));
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = [
    'position:fixed',
    `width:${LABEL_W_MM}mm`,
    `height:${LABEL_H_MM}mm`,
    'left:-100vw',
    'top:0',
    'border:0',
    'opacity:0',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error('Không mở được hộp thoại in.');
  }

  const labelsHtml = images
    .map((src) => `<div class="label"><img src="${src}" alt="" /></div>`)
    .join('');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>In tem QR ${LABEL_W_MM}x${LABEL_H_MM}mm</title>
  <style>
    @page { size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${LABEL_W_MM}mm;
      background: #fff;
    }
    .label {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    img {
      width: ${LABEL_W_MM}mm;
      height: ${LABEL_H_MM}mm;
      display: block;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  </style>
</head>
<body>${labelsHtml}</body>
</html>`);
  doc.close();

  await waitForImages(doc);
  await new Promise((resolve) => window.setTimeout(resolve, 80));

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    throw new Error('Không mở được hộp thoại in.');
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  win.addEventListener('afterprint', cleanup);
  win.focus();
  win.print();
  window.setTimeout(cleanup, 120000);
};

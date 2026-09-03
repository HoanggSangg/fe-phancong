import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

export const LABEL_W_MM = 60;
export const LABEL_H_MM = 40;

const PRINT_DPI = 300;
export const LABEL_PX_W = Math.round((LABEL_W_MM / 25.4) * PRINT_DPI);
export const LABEL_PX_H = Math.round((LABEL_H_MM / 25.4) * PRINT_DPI);

const LABEL_BG_SRC = '/labels/ba-thanh-qr-bg.png';
const BLUE = '#1A5BB5';
const PILL_BLUE = '#073894';
const RED = '#C62828';
const DARK = '#37474F';

// Vùng QR trên ảnh mẫu 1916×821. Logo trái crop tới trước ô mã cũ.
const QR_PANEL = { x: 0.52, y: 0.075, w: 0.43, h: 0.85 };
const BRAND_SRC = { x: 0.03, y: 0.04, w: 0.44, h: 0.58 };

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

const breakLongToken = (ctx, word, maxWidth) => {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const parts = [];
  let buf = '';
  Array.from(word).forEach((ch) => {
    const test = buf + ch;
    if (buf && ctx.measureText(test).width > maxWidth) {
      parts.push(buf);
      buf = ch;
    } else {
      buf = test;
    }
  });
  if (buf) parts.push(buf);
  return parts.length ? parts : [word];
};

const wrapNameLines = (ctx, text, maxWidth) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['—'];
  const lines = [];
  let current = '';
  const pushPiece = (piece) => {
    const test = current ? `${current} ${piece}` : piece;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
      return;
    }
    if (current) lines.push(current);
    current = piece;
  };
  words.forEach((word) => {
    breakLongToken(ctx, word, maxWidth).forEach(pushPiece);
  });
  if (current) lines.push(current);
  return lines;
};

const drawNameBlock = (ctx, text, x, y, w, h, fill) => {
  const radius = Math.min(h * 0.1, w * 0.06, 14);
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();

  const padX = Math.max(8, w * 0.08);
  const padY = Math.max(6, h * 0.1);
  const maxWidth = Math.max(8, w - padX * 2);
  const maxHeight = Math.max(8, h - padY * 2);
  const raw = String(text || '').trim() || '—';

  let fontSize = Math.min(Math.floor(h * 0.2), 32);
  const minSize = 8;
  let lines = [raw];
  let lineH = fontSize * 1.16;

  while (fontSize >= minSize) {
    ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
    lines = wrapNameLines(ctx, raw, maxWidth);
    lineH = fontSize * 1.16;
    const fitsWidth = lines.every((line) => ctx.measureText(line).width <= maxWidth + 0.5);
    const fitsHeight = lines.length * lineH <= maxHeight;
    if (fitsWidth && fitsHeight) break;
    fontSize -= 1;
  }

  ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const blockH = lines.length * lineH;
  const cx = x + w / 2;
  let ty = y + padY + Math.max(0, (maxHeight - blockH) / 2) + lineH / 2;
  lines.forEach((line) => {
    ctx.fillText(line, cx, ty);
    ty += lineH;
  });
  ctx.restore();
};

const drawOuterFrame = (ctx, w, h) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const pad = h * 0.045;
  const radius = h * 0.07;
  roundRect(ctx, pad * 0.4, pad * 0.4, w - pad * 0.8, h - pad * 0.8, radius);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(2, h * 0.016);
  ctx.stroke();
  roundRect(ctx, pad * 0.85, pad * 0.85, w - pad * 1.7, h - pad * 1.7, radius * 0.75);
  ctx.lineWidth = Math.max(1.4, h * 0.009);
  ctx.stroke();
};

const drawQrCaption = (ctx, code, x, y, w, h) => {
  const caption = String(code || '').trim();
  if (!caption) return;
  const maxWidth = Math.max(8, w * 0.94);
  let fontSize = Math.min(Math.floor(h * 0.72), 22);
  ctx.fillStyle = DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let lines = [caption];
  while (fontSize >= 8) {
    ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
    lines = wrapNameLines(ctx, caption, maxWidth);
    const lineH = fontSize * 1.12;
    const fits = lines.every((line) => ctx.measureText(line).width <= maxWidth + 0.5)
      && lines.length * lineH <= h;
    if (fits) break;
    fontSize -= 1;
  }
  ctx.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  const lineH = fontSize * 1.12;
  let ty = y + (h - lineH * lines.length) / 2 + lineH / 2;
  lines.forEach((line) => {
    ctx.fillText(line, x + w / 2, ty);
    ty += lineH;
  });
};

const drawQrPanel = (ctx, qrImg, x, y, boxW, boxH, code) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, boxW, boxH);
  roundRect(ctx, x, y, boxW, boxH, boxH * 0.04);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(1.5, boxH * 0.012);
  ctx.stroke();

  const captionH = Math.max(20, boxH * 0.16);
  const qrAreaH = boxH - captionH;
  const qrInner = Math.min(boxW, qrAreaH) * 0.9;
  ctx.drawImage(
    qrImg,
    x + (boxW - qrInner) / 2,
    y + (qrAreaH - qrInner) / 2,
    qrInner,
    qrInner,
  );
  drawQrCaption(ctx, code, x, y + qrAreaH, boxW, captionH);
};

const drawSmallVectorBrand = (ctx, leftCx, leftW, h, topY) => {
  ctx.fillStyle = DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.floor(h * 0.055)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('Make Your Car Smile', leftCx, topY + h * 0.04);

  drawSmilingCar(ctx, leftCx, topY + h * 0.12, h / 380);

  ctx.fillStyle = RED;
  ctx.font = `800 ${Math.floor(h * 0.07)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('BÁ THÀNH', leftCx, topY + h * 0.20);

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(1, h * 0.006);
  ctx.beginPath();
  ctx.moveTo(leftCx - leftW * 0.28, topY + h * 0.238);
  ctx.lineTo(leftCx - leftW * 0.07, topY + h * 0.238);
  ctx.moveTo(leftCx + leftW * 0.07, topY + h * 0.238);
  ctx.lineTo(leftCx + leftW * 0.28, topY + h * 0.238);
  ctx.stroke();
  ctx.fillStyle = BLUE;
  ctx.font = `700 ${Math.floor(h * 0.042)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText('QUÉT MÃ', leftCx, topY + h * 0.24);
};

const drawFallbackBrand = (ctx, w, h, qrImg, productName, code) => {
  drawOuterFrame(ctx, w, h);

  const pad = h * 0.055;
  const leftW = w * QR_PANEL.x;
  const leftCx = pad * 1.4 + (leftW - pad * 2.2) / 2;
  drawSmallVectorBrand(ctx, leftCx, leftW, h, pad);

  const nameX = pad * 1.35;
  const nameY = h * 0.38;
  const nameW = leftW - pad * 2.2;
  const nameH = h - pad * 1.35 - nameY;
  drawNameBlock(ctx, productName, nameX, nameY, nameW, nameH, BLUE);

  drawQrPanel(
    ctx,
    qrImg,
    w * QR_PANEL.x,
    h * QR_PANEL.y,
    w * QR_PANEL.w,
    h * QR_PANEL.h,
    code,
  );
};

const drawFromTemplate = (ctx, w, h, bgImg, qrImg, productName, code) => {
  drawOuterFrame(ctx, w, h);

  const srcW = bgImg.naturalWidth || bgImg.width;
  const srcH = bgImg.naturalHeight || bgImg.height;
  const pad = h * 0.055;
  const leftW = w * QR_PANEL.x - pad * 1.6;
  const innerX = pad * 1.15;
  const innerY = pad * 1.05;
  const bottom = h - pad * 1.35;
  const gap = h * 0.03;
  const minNameH = h * 0.44;

  const sx = srcW * BRAND_SRC.x;
  const sy = srcH * BRAND_SRC.y;
  const sw = srcW * BRAND_SRC.w;
  const sh = srcH * BRAND_SRC.h;
  const logoMaxH = Math.max(h * 0.2, bottom - innerY - gap - minNameH);
  const logoMaxW = leftW * 0.94;
  const scale = Math.min(logoMaxW / sw, logoMaxH / sh);
  const logoW = sw * scale;
  const logoH = sh * scale;
  const logoX = innerX + (leftW - logoW) / 2;
  const logoY = innerY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(logoX, logoY, logoW, logoH);
  ctx.clip();
  ctx.drawImage(bgImg, sx, sy, sw, sh, logoX, logoY, logoW, logoH);
  ctx.restore();

  const nameX = innerX + leftW * 0.03;
  const nameY = logoY + logoH + gap;
  const nameW = leftW * 0.94;
  const nameH = bottom - nameY;
  drawNameBlock(ctx, productName, nameX, nameY, nameW, Math.max(8, nameH), PILL_BLUE);

  drawQrPanel(
    ctx,
    qrImg,
    w * QR_PANEL.x,
    h * QR_PANEL.y,
    w * QR_PANEL.w,
    h * QR_PANEL.h,
    code,
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

const toLabelItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (item && typeof item === 'object') {
        return {
          code: String(item.code || '').trim(),
          name: String(item.name || '').trim(),
        };
      }
      return { code: String(item || '').trim(), name: '' };
    })
    .filter((item) => item.code);
};

export const renderQrLabelCanvas = async (code, productName = '') => {
  const qrPayload = String(code || '').trim();
  if (!qrPayload) {
    throw new Error('Nhập mã hàng hóa để tạo tem.');
  }
  const labelName = String(productName || '').trim();
  if (!labelName) {
    throw new Error(`Chưa có tên sản phẩm cho mã '${qrPayload}'.`);
  }

  const qrUrl = await QRCode.toDataURL(qrPayload, {
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
    drawFromTemplate(ctx, w, h, bgImg, qrImg, labelName, qrPayload);
  } else {
    drawFallbackBrand(ctx, w, h, qrImg, labelName, qrPayload);
  }

  return canvas;
};

export const exportQrLabelsPdf = async (items) => {
  const list = toLabelItems(items);
  if (!list.length) {
    throw new Error('Nhập ít nhất một mã hàng hóa.');
  }
  const missing = list.find((item) => !item.name);
  if (missing) {
    throw new Error(`Chưa có tên sản phẩm cho mã '${missing.code}'.`);
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
    const canvas = await renderQrLabelCanvas(list[i].code, list[i].name);
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
    ? `tem-qr-${list[0].code.replace(/[^\w.-]+/g, '_')}.pdf`
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

export const printQrLabels = async (items) => {
  const list = toLabelItems(items);
  if (!list.length) {
    throw new Error('Nhập ít nhất một mã hàng hóa.');
  }
  const missing = list.find((item) => !item.name);
  if (missing) {
    throw new Error(`Chưa có tên sản phẩm cho mã '${missing.code}'.`);
  }

  const images = [];
  for (const item of list) {
    const canvas = await renderQrLabelCanvas(item.code, item.name);
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

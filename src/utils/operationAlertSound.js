import { ROLE_LABELS } from './permissions';

const VOICE_STORAGE_KEY = 'operationHistoryVoiceEnabled';

export const VOICE_ALERT_MODULES = ['car', 'worker', 'woker'];

export const isVoiceAlertLog = (log) => VOICE_ALERT_MODULES.includes(log?.module);

export const filterVoiceAlertLogs = (logs = []) => logs.filter(isVoiceAlertLog);

export const isCarOperationLog = (log) => log?.module === 'car';

export const filterCarOperationLogs = (logs = []) => logs.filter(isCarOperationLog);

let audioContext;
let voiceEnabled = true;
let voicesReady = false;

export const isOperationVoiceEnabled = () => voiceEnabled;

export const initOperationVoiceSetting = () => {
  if (typeof window === 'undefined') return true;
  voiceEnabled = localStorage.getItem(VOICE_STORAGE_KEY) !== 'false';
  return voiceEnabled;
};

export const setOperationVoiceEnabled = (enabled) => {
  voiceEnabled = !!enabled;

  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_STORAGE_KEY, String(voiceEnabled));
    if (!voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
};

const MODULE_LABELS = {
  auth: 'Xác thực',
  user: 'Tài khoản',
  car: 'Xe',
  worker: 'Thợ',
  woker: 'Công việc thợ',
  location: 'Địa điểm',
  supervisor: 'Giám sát',
  team: 'Tổ',
};

const ACTION_LABELS = {
  login: 'Đăng nhập',
  register: 'Đăng ký',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  update_status: 'Đổi trạng thái',
  assign_workers: 'Phân công',
  manual_items: 'Hạng mục sửa chữa',
  import: 'Import',
  toggle_revenue: 'Doanh thu',
  add_job: 'Thêm việc',
  remove_job: 'Xóa việc',
  add_member: 'Thêm thành viên',
  remove_member: 'Xóa thành viên',
  ktv_notify: 'Báo admin',
};

const sanitizeForSpeech = (text) => {
  if (!text) return '';

  return String(text)
    .replace(/→/g, ', gán ')
    .replace(/\[/g, 'nhóm ')
    .replace(/\]/g, ', ')
    .replace(/%/g, ' phần trăm')
    .replace(/@/g, ' ')
    .replace(/_/g, ' ')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const buildOperationSpeechText = (log) => {
  if (!log) return '';

  const actor = log.fullName || log.username;
  const role = ROLE_LABELS[log.role] || log.role;
  const moduleLabel = MODULE_LABELS[log.module] || log.module;
  const actionLabel = ACTION_LABELS[log.action] || log.action;
  const details = Array.isArray(log.metadata?.details)
    ? log.metadata.details.map(sanitizeForSpeech).filter(Boolean)
    : [];

  const parts = ['Thao tác mới'];

  if (actor) {
    parts.push(role ? `Người thực hiện ${actor}, vai trò ${role}` : `Người thực hiện ${actor}`);
  }

  if (moduleLabel) parts.push(`Nhóm ${moduleLabel}`);
  if (actionLabel) parts.push(`Hành động ${actionLabel}`);
  if (log.targetLabel) parts.push(`Đối tượng ${sanitizeForSpeech(log.targetLabel)}`);
  if (log.description) parts.push(sanitizeForSpeech(log.description));

  if (details.length === 1) {
    parts.push(`Chi tiết ${details[0]}`);
  } else if (details.length > 1) {
    parts.push(`Gồm ${details.length} mục`);
    details.forEach((line, index) => {
      parts.push(`Mục ${index + 1}, ${line}`);
    });
  }

  return parts.join('. ');
};

const getAudioContext = () => {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
};

const getVietnameseVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === 'vi-VN')
    || voices.find((voice) => voice.lang.startsWith('vi'))
    || voices.find((voice) => /vietnam|vietnamese/i.test(voice.name))
    || null
  );
};

const ensureVoicesReady = () => new Promise((resolve) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    resolve(false);
    return;
  }

  if (voicesReady && window.speechSynthesis.getVoices().length > 0) {
    resolve(true);
    return;
  }

  const finish = () => {
    voicesReady = window.speechSynthesis.getVoices().length > 0;
    resolve(voicesReady);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    finish();
    return;
  }

  const onVoicesChanged = () => {
    window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    finish();
  };

  window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  window.setTimeout(finish, 500);
});

export const playNotificationTone = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Bỏ qua nếu trình duyệt chặn autoplay
  }
};

const speakTextsInQueue = async (texts = []) => {
  if (!texts.length || typeof window === 'undefined' || !window.speechSynthesis) return;

  await ensureVoicesReady();

  let index = 0;
  const viVoice = getVietnameseVoice();

  const speakNext = () => {
    if (index >= texts.length) return;

    const utterance = new SpeechSynthesisUtterance(texts[index]);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (viVoice) utterance.voice = viVoice;

    utterance.onend = () => {
      index += 1;
      window.setTimeout(speakNext, 120);
    };
    utterance.onerror = () => {
      index += 1;
      window.setTimeout(speakNext, 120);
    };

    window.speechSynthesis.speak(utterance);
  };

  window.speechSynthesis.cancel();
  window.setTimeout(speakNext, 150);
};

export const speakOperationLog = (log) => {
  const text = buildOperationSpeechText(log);
  if (!text || !voiceEnabled) return;
  speakTextsInQueue([text]);
};

export const speakPlainText = (text) => {
  if (!text || !voiceEnabled) return;
  speakTextsInQueue([text]);
};

export const alertNewOperationLogs = (logs = []) => {
  if (!logs.length || !voiceEnabled) return;

  playNotificationTone();

  const texts = logs
    .map(buildOperationSpeechText)
    .filter(Boolean);

  window.setTimeout(() => {
    speakTextsInQueue(texts);
  }, 420);
};

export const unlockOperationAudio = () => {
  getAudioContext();
  ensureVoicesReady();

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.resume?.();
  }
};

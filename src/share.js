/**
 * share.js — تحويل السيرة إلى رابط مشاركة والعكس.
 *
 * الفكرة: بدل قاعدة بيانات، نخزّن السيرة **داخل الرابط نفسه**:
 * JSON ← ضغط deflate ← ترميز base64url ← يوضع بعد # في العنوان.
 * النتيجة: مشاركة كاملة بدون خادم وبدون حساب، والبيانات لا تغادر جهاز صاحبها
 * إلا حين يرسل الرابط بنفسه.
 */

const V_DEFLATE = '1';
const V_PLAIN = '0';

/** Uint8Array يتحول إلى نص base64 عادي */
function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  const CHUNK = 0x8000; // نقسّم لتفادي تجاوز حد وسائط الدالة
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** نص base64 يتحول إلى Uint8Array */
function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** base64 عادي يتحول إلى صيغة آمنة داخل الروابط */
export function toBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** العملية العكسية */
export function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

const canCompress = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * تحويل السيرة إلى رمز نصي صالح للوضع في الرابط.
 * أول حرف يحدد الطريقة، حتى نستطيع تغيير آلية الضغط مستقبلًا
 * دون كسر الروابط القديمة.
 */
export async function encodeResume(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  if (canCompress()) {
    try {
      return V_DEFLATE + toBase64Url(await deflate(bytes));
    } catch {
      /* نكمل بالطريقة العادية */
    }
  }
  return V_PLAIN + toBase64Url(bytes);
}

/** قراءة السيرة من رمز الرابط */
export async function decodeResume(token) {
  if (!token || typeof token !== 'string' || token.length < 2) {
    throw new Error('رابط المشاركة غير صالح');
  }
  const version = token[0];
  const body = fromBase64Url(token.slice(1));
  let bytes = body;
  if (version === V_DEFLATE) {
    if (!canCompress()) throw new Error('هذا المتصفح لا يدعم فك ضغط الرابط');
    bytes = await inflate(body);
  } else if (version !== V_PLAIN) {
    throw new Error('نسخة رابط غير معروفة');
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** الرابط الكامل الجاهز للمشاركة */
export async function buildShareUrl(data, baseUrl) {
  const token = await encodeResume(data);
  const base = String(baseUrl).split('#')[0];
  return `${base}#cv=${token}`;
}

/** استخراج الرمز من عنوان يحتوي #cv=... */
export function readTokenFromHash(hash = '') {
  const m = /[#&]cv=([A-Za-z0-9\-_]+)/.exec(hash);
  return m ? m[1] : null;
}

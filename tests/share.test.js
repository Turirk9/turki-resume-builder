import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toBase64Url, fromBase64Url, encodeResume, decodeResume,
  buildShareUrl, readTokenFromHash,
} from '../src/share.js';
import { sampleResume, emptyResume, normalize } from '../src/model.js';

test('base64url ذهابًا وإيابًا', () => {
  const bytes = new TextEncoder().encode('مرحبا world ~!@#$%^&*()');
  const enc = toBase64Url(bytes);
  assert.ok(!/[+/=]/.test(enc), 'يجب ألا يحتوي رموزًا تكسر الروابط');
  assert.deepEqual(Array.from(fromBase64Url(enc)), Array.from(bytes));
});

test('base64url يتعامل مع البيانات الفارغة', () => {
  assert.equal(toBase64Url(new Uint8Array(0)), '');
  assert.equal(fromBase64Url('').length, 0);
});

test('ترميز السيرة وفك ترميزها يحفظ كل البيانات', async () => {
  const cv = sampleResume();
  const token = await encodeResume(cv);
  const back = await decodeResume(token);
  assert.deepEqual(back, cv, 'يجب أن تعود السيرة كما هي حرفًا بحرف');
});

test('الرمز يبدأ برقم النسخة ولا يحتوي رموزًا غير آمنة', async () => {
  const token = await encodeResume(emptyResume());
  assert.match(token[0], /[01]/);
  assert.match(token, /^[01][A-Za-z0-9\-_]*$/);
});

test('الضغط يقلّص حجم السير الكبيرة', async () => {
  const cv = normalize(sampleResume());
  // نكرّر الخبرات لتصير السيرة أطول
  cv.experience = Array.from({ length: 8 }, () => ({ ...cv.experience[0] }));
  const json = JSON.stringify(cv);
  const token = await encodeResume(cv);
  assert.ok(token.length < json.length, `الرمز (${token.length}) يجب أن يكون أصغر من JSON (${json.length})`);
});

test('decodeResume يرفض المدخلات التالفة', async () => {
  await assert.rejects(() => decodeResume(''), /غير صالح/);
  await assert.rejects(() => decodeResume(null), /غير صالح/);
  await assert.rejects(() => decodeResume('9abc'), /نسخة رابط غير معروفة/);
});

test('رابط المشاركة يُبنى ويُقرأ بشكل صحيح', async () => {
  const cv = sampleResume();
  const url = await buildShareUrl(cv, 'https://example.com/app/#cv=قديم');
  assert.ok(url.startsWith('https://example.com/app/#cv='), 'يستبدل أي رمز قديم');
  const token = readTokenFromHash(url.slice(url.indexOf('#')));
  const back = await decodeResume(token);
  assert.equal(back.basics.name, cv.basics.name);
});

test('readTokenFromHash يعيد null إذا لم يوجد رمز', () => {
  assert.equal(readTokenFromHash(''), null);
  assert.equal(readTokenFromHash('#other=1'), null);
  assert.equal(readTokenFromHash('#cv=abc123'), 'abc123');
});

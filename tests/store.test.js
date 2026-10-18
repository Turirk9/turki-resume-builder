import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStore, addResume, updateActive, activeResume, setActive,
  renameResume, duplicateResume, deleteResume, migrateLegacy,
} from '../src/store.js';
import { sampleResume, emptyResume } from '../src/model.js';

test('مخزن جديد يبدأ فارغًا', () => {
  const s = emptyStore();
  assert.deepEqual(s.resumes, []);
  assert.equal(s.activeId, null);
  assert.equal(activeResume(s), null);
});

test('إضافة سيرة تجعلها النشطة وتضعها في المقدمة', () => {
  let s = addResume(emptyStore(), { name: 'الأولى' });
  s = addResume(s, { name: 'الثانية' });
  assert.equal(s.resumes.length, 2);
  assert.equal(s.resumes[0].name, 'الثانية');
  assert.equal(activeResume(s).name, 'الثانية');
  assert.ok(activeResume(s).id && activeResume(s).createdAt);
});

test('الاسم الفارغ يعود إلى الافتراضي', () => {
  const s = addResume(emptyStore(), { name: '   ' });
  assert.equal(s.resumes[0].name, 'سيرتي');
});

test('updateActive يحدّث النشطة فقط', () => {
  let s = addResume(emptyStore(), { name: 'أ' });
  const firstId = s.activeId;
  s = addResume(s, { name: 'ب' });
  const data = sampleResume();
  s = updateActive(s, data);
  assert.equal(activeResume(s).data.basics.name, data.basics.name);
  assert.equal(s.resumes.find((r) => r.id === firstId).data.basics.name, '', 'الأخرى لم تتغيّر');
});

test('updateActive بلا سيرة نشطة ينشئ واحدة', () => {
  const s = updateActive(emptyStore(), sampleResume());
  assert.equal(s.resumes.length, 1);
  assert.ok(s.activeId);
});

test('إعادة التسمية تتجاهل الفراغ', () => {
  let s = addResume(emptyStore(), { name: 'قديم' });
  const id = s.activeId;
  s = renameResume(s, id, 'جديد');
  assert.equal(s.resumes[0].name, 'جديد');
  s = renameResume(s, id, '   ');
  assert.equal(s.resumes[0].name, 'جديد', 'الاسم الفارغ لا يُحفظ');
});

test('النسخة مستقلة تمامًا عن الأصل', () => {
  let s = addResume(emptyStore(), { name: 'أصل', data: sampleResume() });
  const id = s.activeId;
  s = duplicateResume(s, id);
  assert.equal(s.resumes.length, 2);
  assert.equal(s.resumes[1].name, 'أصل (نسخة)');
  assert.equal(s.activeId, s.resumes[1].id, 'النسخة تصير النشطة');
  s.resumes[1].data.basics.name = 'تغيير';
  assert.notEqual(s.resumes[0].data.basics.name, 'تغيير', 'تعديل النسخة لا يمس الأصل');
});

test('النسخة تُوضع مباشرة بعد الأصل', () => {
  let s = addResume(emptyStore(), { name: 'أ' });
  s = addResume(s, { name: 'ب' });
  const idA = s.resumes.find((r) => r.name === 'أ').id;
  s = duplicateResume(s, idA);
  assert.deepEqual(s.resumes.map((r) => r.name), ['ب', 'أ', 'أ (نسخة)']);
});

test('duplicateResume بمعرّف غير موجود لا يغيّر شيئًا', () => {
  const s = addResume(emptyStore(), { name: 'أ' });
  assert.deepEqual(duplicateResume(s, 'nope'), s);
});

test('الحذف ينقل النشاط ولا يترك المخزن معلّقًا', () => {
  let s = addResume(emptyStore(), { name: 'أ' });
  s = addResume(s, { name: 'ب' });
  s = deleteResume(s, s.activeId);
  assert.equal(s.resumes.length, 1);
  assert.equal(activeResume(s).name, 'أ');
  s = deleteResume(s, s.activeId);
  assert.equal(s.activeId, null, 'بعد حذف الأخيرة لا توجد نشطة');
});

test('setActive يتجاهل المعرّف غير الموجود', () => {
  const s = addResume(emptyStore(), { name: 'أ' });
  assert.equal(setActive(s, 'nope').activeId, s.activeId);
});

test('ترقية البيانات القديمة (سيرة واحدة) إلى المخزن الجديد', () => {
  const legacy = sampleResume();
  const s = migrateLegacy(legacy);
  assert.equal(s.resumes.length, 1);
  assert.equal(s.resumes[0].data.basics.name, legacy.basics.name);
  assert.equal(migrateLegacy(null), null);
});

test('المخزن يطبّع أي بيانات ناقصة', () => {
  const s = addResume(emptyStore(), { data: { basics: { name: 'أصيل' } } });
  const d = activeResume(s).data;
  assert.equal(d.basics.name, 'أصيل');
  assert.deepEqual(d.experience, []);
  assert.equal(d.meta.template, 'classic');
  assert.deepEqual(emptyResume().skills, []);
});

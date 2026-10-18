import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize, emptyResume, sampleResume, formatMonth, formatRange,
  monthsBetween, durationText, toBullets, parseSkills, safeUrl,
  displayUrl, completeness, CHECKS, TEMPLATES, ACCENTS, FONTS,
  CATEGORIES, DEFAULT_ORDER, orderOf, BLANKS,
} from '../src/model.js';

test('normalize يكمل الحقول الناقصة', () => {
  const d = normalize({});
  assert.equal(d.basics.name, '');
  assert.deepEqual(d.experience, []);
  assert.equal(d.meta.template, 'classic');
});

test('normalize يصحّح القيم غير الصالحة', () => {
  const d = normalize({ meta: { template: 'hacker', density: 'huge', lang: 'fr' } });
  assert.equal(d.meta.template, 'classic');
  assert.equal(d.meta.density, 'normal');
  assert.equal(d.meta.lang, 'ar');
});

test('normalize يعطي معرّفًا لكل صف ويحافظ على الموجود', () => {
  const d = normalize({ experience: [{ role: 'مطوّرة' }, { id: 'keep', role: 'أخرى' }] });
  assert.ok(d.experience[0].id);
  assert.equal(d.experience[1].id, 'keep');
  assert.equal(d.experience[0].company, '', 'الحقول الناقصة تُملأ فارغة');
});

test('normalize يتجاهل المدخلات الغريبة بلا انهيار', () => {
  const d = normalize({ skills: 'ليست مصفوفة', experience: null });
  assert.deepEqual(d.skills, []);
  assert.deepEqual(d.experience, []);
});

test('formatMonth بالعربية والإنجليزية', () => {
  assert.equal(formatMonth('2024-03'), 'مارس 2024');
  assert.equal(formatMonth('2024-03', 'en'), 'March 2024');
  assert.equal(formatMonth(''), '');
  assert.equal(formatMonth('2024-13'), '2024-13', 'شهر غير صالح يُعاد كما هو');
});

test('formatRange يتعامل مع «حتى الآن» والحقول الناقصة', () => {
  assert.equal(formatRange('2022-01', '2023-06', false), 'يناير 2022 — يونيو 2023');
  assert.equal(formatRange('2022-01', '', true), 'يناير 2022 — حتى الآن');
  assert.equal(formatRange('2022-01', '', true, 'en'), 'January 2022 — Present');
  assert.equal(formatRange('', '', false), '');
  assert.equal(formatRange('2022-01', '', false), 'يناير 2022');
});

test('monthsBetween يحسب المدة شاملة شهر البداية', () => {
  assert.equal(monthsBetween('2022-01', '2022-01'), 1);
  assert.equal(monthsBetween('2022-01', '2022-12'), 12);
  assert.equal(monthsBetween('2021-06', '2022-12'), 19);
  assert.equal(monthsBetween('2022-12', '2022-01'), 0, 'الترتيب المعكوس يعطي صفرًا');
  assert.equal(monthsBetween('', '2022-01'), 0);
});

test('durationText يطبّق التثنية والجمع العربي', () => {
  assert.equal(durationText(12), 'سنة');
  assert.equal(durationText(24), 'سنتان');
  assert.equal(durationText(36), '3 سنوات');
  assert.equal(durationText(132), '11 سنة', 'ما فوق العشرة يعود للمفرد');
  assert.equal(durationText(1), 'شهر');
  assert.equal(durationText(2), 'شهران');
  assert.equal(durationText(5), '5 أشهر');
  assert.equal(durationText(13), 'سنة وشهر');
  assert.equal(durationText(0), '');
  assert.equal(durationText(13, 'en'), '1 year 1 month');
});

test('toBullets ينظّف رموز التعداد والأسطر الفارغة', () => {
  assert.deepEqual(toBullets('- أولى\n\n• ثانية\n   \n* ثالثة'), ['أولى', 'ثانية', 'ثالثة']);
  assert.deepEqual(toBullets(''), []);
});

test('parseSkills يفصل بالفاصلتين ويمنع التكرار', () => {
  assert.deepEqual(parseSkills('React، Vue, React\nCSS'), ['React', 'Vue', 'CSS']);
  assert.deepEqual(parseSkills('  '), []);
});

test('safeUrl يمنع الروابط الخطرة ويكمل البروتوكول', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '', 'يجب رفض javascript:');
  assert.equal(safeUrl('data:text/html,x'), '');
  assert.equal(safeUrl('github.com/user'), 'https://github.com/user');
  assert.equal(safeUrl('https://x.dev'), 'https://x.dev');
  assert.equal(safeUrl('نص عادي'), '');
});

test('displayUrl يختصر الرابط للعرض', () => {
  assert.equal(displayUrl('https://www.github.com/user/'), 'github.com/user');
});

test('completeness يحسب النسبة ويسمّي الناقص', () => {
  const empty = completeness(emptyResume());
  assert.equal(empty.percent, 0);
  assert.equal(empty.missing.length, CHECKS.length);

  const full = completeness(sampleResume());
  assert.equal(full.percent, 100);
  assert.deepEqual(full.missing, []);
});

test('completeness يعطي وزنًا لكل فحص', () => {
  const d = emptyResume();
  d.basics.name = 'أصيل';
  const c = completeness(d);
  assert.equal(c.percent, Math.round((1 / CHECKS.length) * 100));
  assert.ok(c.done.includes('name'));
});

test('كل قالب يشير إلى تخطيط معروف', () => {
  const layouts = new Set(['stack', 'sidebar', 'centered', 'columns']);
  assert.equal(TEMPLATES.length, 14);
  for (const t of TEMPLATES) {
    assert.ok(t.id && t.name && t.hint, `القالب ${t.id} ينقصه وصف`);
    assert.ok(layouts.has(t.layout), `تخطيط غير معروف: ${t.layout}`);
  }
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 14, 'المعرّفات يجب أن تكون فريدة');
});

test('الألوان الجاهزة صالحة وفريدة', () => {
  assert.equal(ACCENTS.length, 12);
  assert.equal(new Set(ACCENTS).size, 12);
  for (const c of ACCENTS) assert.match(c, /^#[0-9a-f]{6}$/, `لون غير صالح: ${c}`);
});

test('الخطوط لها معرّف ومكدّس ومعامل حجم', () => {
  assert.equal(FONTS.length, 5);
  for (const f of FONTS) {
    assert.ok(f.id && f.name && f.stack);
    assert.ok(f.scale > 0.8 && f.scale < 1.3, `معامل حجم غير منطقي: ${f.scale}`);
  }
});

test('normalize يصحّح الخط غير الصالح ويحفظ الصالح', () => {
  assert.equal(normalize({ meta: { font: 'comic' } }).meta.font, 'plex');
  assert.equal(normalize({ meta: { font: 'amiri' } }).meta.font, 'amiri');
  assert.equal(normalize({}).meta.font, 'plex', 'الخط الافتراضي');
});

test('normalize يقبل كل القوالب الثمانية', () => {
  for (const t of TEMPLATES) {
    assert.equal(normalize({ meta: { template: t.id } }).meta.template, t.id);
  }
});

test('كل قالب يعلن تصنيفًا معروفًا', () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  for (const t of TEMPLATES) {
    assert.ok(ids.has(t.category), `تصنيف غير معروف في ${t.id}: ${t.category}`);
    assert.equal(typeof t.ats, 'boolean');
  }
  assert.ok(TEMPLATES.filter((t) => t.ats).length >= 4, 'يجب توفّر قوالب متوافقة مع ATS');
});

test('ترتيب الأقسام يغطي كل الأقسام بلا تكرار', () => {
  const all = new Set(DEFAULT_ORDER);
  assert.equal(all.size, DEFAULT_ORDER.length, 'لا تكرار في الترتيب الافتراضي');
  for (const t of TEMPLATES) {
    const order = orderOf(t.id);
    assert.equal(new Set(order).size, order.length, `تكرار في ترتيب ${t.id}`);
    for (const k of order) assert.ok(all.has(k), `قسم غير معروف في ${t.id}: ${k}`);
  }
});

test('القوالب ذات الترتيب الخاص تقدّم أقسامها فعلًا', () => {
  assert.ok(orderOf('student').indexOf('education') < orderOf('student').indexOf('experience'));
  assert.ok(orderOf('tech').indexOf('skills') < orderOf('tech').indexOf('experience'));
  assert.deepEqual(orderOf('classic'), DEFAULT_ORDER, 'القالب العادي يستخدم الترتيب الافتراضي');
});

test('الأقسام الجديدة موجودة في النموذج الفارغ', () => {
  const e = emptyResume();
  assert.deepEqual(e.courses, []);
  assert.deepEqual(e.achievements, []);
  assert.ok(BLANKS.courses().id && BLANKS.achievements().id);
});

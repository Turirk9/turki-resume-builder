import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResume, esc } from '../src/templates.js';
import { TEMPLATES, sampleResume, emptyResume, normalize, orderOf } from '../src/model.js';

const rich = () => {
  const d = normalize(sampleResume());
  d.courses = [{ id: 'c1', name: 'أساسيات UX', provider: 'Coursera', year: '2024' }];
  d.achievements = [{ id: 'a1', title: 'المركز الأول', description: 'من بين ٤٠ فريقًا', year: '2025' }];
  return d;
};

test('كل القوالب الأربعة عشر تُرسم بمحتوى حقيقي', () => {
  const d = rich();
  for (const t of TEMPLATES) {
    d.meta.template = t.id;
    const html = renderResume(d);
    assert.ok(html.length > 1500, `${t.id} أنتج ناتجًا قصيرًا`);
    assert.ok(html.includes(d.basics.name), `${t.id} لا يعرض الاسم`);
    assert.ok(html.includes('cv-section'), `${t.id} بلا أقسام`);
  }
});

test('القالب الفارغ يعرض رسالة إرشادية لا صفحة بيضاء', () => {
  const html = renderResume(emptyResume());
  assert.ok(html.includes('cv-empty'));
  assert.ok(html.includes('ابدأ'));
});

test('الأقسام الفارغة لا تُرسم عناوينها', () => {
  const d = normalize(emptyResume());
  d.basics.name = 'أصيل';
  const html = renderResume(d);
  assert.ok(!html.includes('الخبرات العملية'), 'قسم فارغ يجب ألا يظهر');
  assert.ok(!html.includes('اللغات'));
});

test('ترتيب الأقسام يتبع القالب', () => {
  const d = rich();
  d.meta.template = 'student';
  const html = renderResume(d);
  assert.ok(html.indexOf('التعليم') < html.indexOf('الخبرات العملية'), 'قالب الطالب يقدّم التعليم');
  assert.ok(orderOf('student')[1] === 'education');
});

test('تخطيط الأعمدة يوزّع الأقسام على عمودين', () => {
  const d = rich();
  d.meta.template = 'compact';
  const html = renderResume(d);
  assert.equal((html.match(/cv-duo-col/g) || []).length, 2);
});

test('الشريط الجانبي يفصل المهارات عن العمود الرئيسي', () => {
  const d = rich();
  d.meta.template = 'modern';
  const html = renderResume(d);
  const aside = html.slice(html.indexOf('cv-aside'), html.indexOf('cv-main'));
  assert.ok(aside.includes('المهارات'), 'المهارات في الشريط الجانبي');
  assert.ok(!aside.includes('الخبرات العملية'), 'الخبرات ليست في الشريط الجانبي');
});

test('كل نص من المستخدم مُهرَّب ضد الحقن', () => {
  const d = normalize(emptyResume());
  d.basics.name = '<img src=x onerror=alert(1)>';
  d.basics.title = '"><script>bad()</script>';
  d.experience = [{ id: 'e', role: '<b>خطر</b>', company: 'ش', city: '', from: '', to: '', present: false, bullets: '<i>نقطة</i>' }];
  const html = renderResume(d);
  assert.ok(!html.includes('<img'), 'وسم img مُهرَّب');
  assert.ok(!html.includes('<script'), 'وسم script مُهرَّب');
  assert.ok(!html.includes('<b>خطر'), 'وسوم المستخدم مُهرَّبة');
  assert.ok(html.includes('&lt;img'), 'يظهر كنص لا كوسم');
});

test('الروابط الخطرة لا تُرسم', () => {
  const d = normalize(emptyResume());
  d.basics.name = 'أصيل';
  d.projects = [{ id: 'p', name: 'مشروع', url: 'javascript:alert(1)', description: '' }];
  const html = renderResume(d);
  assert.ok(!html.includes('javascript:'), 'رابط javascript مرفوض');
});

test('اللغة الإنجليزية تبدّل عناوين الأقسام', () => {
  const d = rich();
  d.meta.lang = 'en';
  const html = renderResume(d);
  assert.ok(html.includes('Experience') && html.includes('Education'));
  assert.ok(!html.includes('الخبرات العملية'));
});

test('esc يهرّب كل الرموز الخطرة', () => {
  assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(esc(''), '');
});

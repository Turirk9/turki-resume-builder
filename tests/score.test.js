import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResume, STRONG_VERBS } from '../src/score.js';
import { emptyResume, sampleResume, normalize } from '../src/model.js';

test('السيرة الفارغة تحصل على صفر واقتراحات', () => {
  const a = analyzeResume(emptyResume());
  assert.equal(a.total, 0);
  assert.equal(a.tone, 'low');
  assert.ok(a.tips.length >= 3, 'يجب أن تقترح خطوات عملية');
});

test('السيرة النموذجية قوية', () => {
  const a = analyzeResume(sampleResume());
  assert.ok(a.total >= 85, `النتيجة ${a.total} يجب أن تتجاوز 85`);
  assert.equal(a.tone, 'high');
  assert.equal(a.level, 'ممتازة');
});

test('مجموع الأوزان مئة بالضبط', () => {
  const a = analyzeResume(sampleResume());
  assert.equal(a.groups.reduce((s, g) => s + g.max, 0), 100);
  assert.ok(a.groups.every((g) => g.score <= g.max), 'لا تتجاوز أي مجموعة سقفها');
});

test('الأرقام في الإنجازات ترفع الدرجة', () => {
  const base = normalize(emptyResume());
  base.experience = [{ id: 'e1', role: 'مطوّرة', company: 'شركة', from: '2022-01', to: '2023-01', present: false, bullets: 'عملت على الواجهات\nساعدت الفريق\nشاركت في المشاريع' }];
  const withNums = JSON.parse(JSON.stringify(base));
  withNums.experience[0].bullets = 'خفضت زمن التحميل ٦٠٪\nرفعت التغطية إلى ٩٠٪\nدرّبت ٣ متدربين';
  const a = analyzeResume(base);
  const b = analyzeResume(withNums);
  assert.ok(b.total > a.total, `الأرقام والأفعال القوية يجب أن ترفع الدرجة (${a.total} → ${b.total})`);
});

test('النبذة القصيرة والطويلة كلتاهما تُنبَّه', () => {
  const short = normalize(emptyResume());
  short.basics.summary = 'مطوّرة واجهات.';
  const long = normalize(emptyResume());
  long.basics.summary = 'كلمة '.repeat(120);
  assert.ok(analyzeResume(short).tips.some((t) => t.includes('قصيرة')));
  assert.ok(analyzeResume(long).tips.some((t) => t.includes('طويلة')));
});

test('عدد المهارات المبالغ فيه يُنبَّه', () => {
  const d = normalize(sampleResume());
  d.skills = Array.from({ length: 22 }, (_, i) => 'مهارة' + i);
  assert.ok(analyzeResume(d).tips.some((t) => t.includes('كبير')));
});

test('مستويات التقييم تتدرّج', () => {
  const d = normalize(emptyResume());
  assert.equal(analyzeResume(d).level, 'تحتاج عملًا');
  d.basics.name = 'أصيل';
  d.basics.title = 'مطوّرة';
  d.basics.email = 'a@b.co';
  d.basics.summary = 'مطوّرة واجهات بخبرة ٣ سنوات في بناء تطبيقات ويب سريعة وسهلة الوصول، وقدت إعادة بناء منتج يخدم ٥٠ ألف مستخدم بنجاح.';
  d.education = [{ id: 'x', degree: 'بكالوريوس', school: 'جامعة', field: '', from: '2018-09', to: '2022-06', present: false, note: '' }];
  d.skills = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const mid = analyzeResume(d);
  assert.ok(mid.total > 40 && mid.total < 90, `متوقع درجة متوسطة، جاءت ${mid.total}`);
  assert.ok(mid.tips.some((t) => t.includes('خبرة')), 'ينبّه على غياب الخبرة');
});

test('قائمة الأفعال القوية غير فارغة وبلا تكرار', () => {
  assert.ok(STRONG_VERBS.length > 20);
  assert.equal(new Set(STRONG_VERBS).size, STRONG_VERBS.length);
});

test('التحليل لا ينهار على مدخلات ناقصة', () => {
  assert.doesNotThrow(() => analyzeResume({}));
  assert.doesNotThrow(() => analyzeResume({ basics: {} }));
  assert.equal(analyzeResume({}).total, 0);
});

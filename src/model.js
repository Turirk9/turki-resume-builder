/**
 * model.js — نموذج بيانات السيرة الذاتية ودواله النقية.
 * لا يعرف شيئًا عن الـDOM، فيمكن اختباره كاملًا في Node.
 */

/** القوالب — كل قالب يختار تخطيطًا (layout) ثم يُلبسه CSS مظهره الخاص */
/** تصنيفات القوالب — تُستخدم في مرشّحات معرض القوالب */
export const CATEGORIES = [
  { id: 'all', name: 'الكل' },
  { id: 'professional', name: 'احترافي' },
  { id: 'modern', name: 'حديث' },
  { id: 'minimal', name: 'بسيط' },
  { id: 'creative', name: 'إبداعي' },
  { id: 'student', name: 'طلاب' },
  { id: 'tech', name: 'تقني' },
  { id: 'ats', name: 'متوافق ATS' },
  { id: 'academic', name: 'أكاديمي' },
];

/** الترتيب الافتراضي لأقسام السيرة */
export const DEFAULT_ORDER = ['summary', 'experience', 'education', 'skills', 'projects', 'courses', 'certificates', 'achievements', 'languages'];

/**
 * القوالب — كل قالب يختار محرّك تخطيط (layout) وترتيب أقسام (order)
 * ثم يُلبسه CSS هويته البصرية. أربعة محرّكات تكفي لأربعة عشر قالبًا.
 */
export const TEMPLATES = [
  { id: 'classic', name: 'كلاسيكي', layout: 'stack', category: 'professional', ats: true, badge: '',
    hint: 'عمود واحد رسمي يقرأه البشر وأنظمة الفرز بسهولة' },
  { id: 'modern', name: 'عصري', layout: 'sidebar', category: 'modern', ats: false, badge: 'الأكثر استخدامًا',
    hint: 'شريط جانبي ملوّن وترويسة عريضة' },
  { id: 'minimal', name: 'بسيط', layout: 'centered', category: 'minimal', ats: true, badge: '',
    hint: 'مساحات واسعة وتايبوغرافي هادئ' },
  { id: 'executive', name: 'تنفيذي', layout: 'stack', category: 'professional', ats: true, badge: '',
    hint: 'رصين وأنيق للمناصب القيادية' },
  { id: 'timeline', name: 'خط زمني', layout: 'stack', category: 'modern', ats: false, badge: '',
    hint: 'مسار زمني بنقاط تربط محطات مسيرتك' },
  { id: 'creative', name: 'إبداعي', layout: 'sidebar', category: 'creative', ats: false, badge: '',
    hint: 'شريط داكن وتباين قوي للمجالات الإبداعية' },
  { id: 'academic', name: 'أكاديمي', layout: 'stack', category: 'academic', ats: true, badge: '',
    order: ['summary', 'education', 'experience', 'courses', 'certificates', 'projects', 'skills', 'achievements', 'languages'],
    hint: 'ترتيب أكاديمي يقدّم التعليم والأبحاث' },
  { id: 'tech', name: 'تقني', layout: 'sidebar', category: 'tech', ats: false, badge: '',
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'courses', 'certificates', 'achievements', 'languages'],
    hint: 'المهارات أولًا، وشارات ومسافات تشبه لوحات المطوّرين' },
  { id: 'ats', name: 'متوافق ATS', layout: 'stack', category: 'ats', ats: true, badge: 'موصى به',
    hint: 'أبيض وأسود بلا زخارف — أعلى فرصة لتجاوز أنظمة الفرز' },
  { id: 'student', name: 'طالب', layout: 'stack', category: 'student', ats: true, badge: 'جديد',
    order: ['summary', 'education', 'projects', 'courses', 'experience', 'skills', 'certificates', 'achievements', 'languages'],
    hint: 'يقدّم التعليم والمشاريع لمن لا يملك خبرة طويلة' },
  { id: 'corporate', name: 'شركات', layout: 'sidebar', category: 'professional', ats: false, badge: '',
    hint: 'كتل رسمية منظّمة تناسب الشركات الكبرى' },
  { id: 'elegant', name: 'راقٍ', layout: 'centered', category: 'minimal', ats: false, badge: '',
    hint: 'خطوط رفيعة ومسافات مترفة وإحساس مطبوع' },
  { id: 'compact', name: 'مضغوط', layout: 'columns', category: 'professional', ats: false, badge: '',
    hint: 'عمودان يستوعبان خبرة طويلة في صفحة واحدة' },
  { id: 'bold', name: 'جريء', layout: 'stack', category: 'creative', ats: false, badge: '',
    hint: 'ترويسة لونية عريضة وخط قوي يلفت النظر' },
];

/** ترتيب الأقسام الخاص بقالب معيّن، أو الترتيب الافتراضي */
export function orderOf(templateId) {
  const t = TEMPLATES.find((x) => x.id === templateId);
  return (t && t.order) || DEFAULT_ORDER;
}

/** ألوان جاهزة — ويمكن اختيار أي لون آخر من منتقي الألوان */
export const ACCENTS = [
  '#0f766e', '#047857', '#1d4ed8', '#0284c7',
  '#7c3aed', '#a21caf', '#b91c1c', '#be123c',
  '#c2410c', '#a16207', '#0f172a', '#3f3f46',
];

/** خطوط عربية جاهزة، ولكل خط معامل حجم يوازن اختلاف أحجامها الطبيعية */
export const FONTS = [
  { id: 'plex', name: 'بلكس', stack: "'IBM Plex Sans Arabic'", scale: 1 },
  { id: 'cairo', name: 'القاهرة', stack: "'Cairo'", scale: 0.97 },
  { id: 'tajawal', name: 'تجوّل', stack: "'Tajawal'", scale: 1.02 },
  { id: 'kufi', name: 'كوفي', stack: "'Noto Kufi Arabic'", scale: 0.93 },
  { id: 'amiri', name: 'أميري', stack: "'Amiri'", scale: 1.14 },
];

/** كثافة العرض — تتحكم بالمسافات لتناسب صفحة واحدة */
export const DENSITIES = [
  { id: 'comfortable', name: 'مريح' },
  { id: 'normal', name: 'متوسط' },
  { id: 'compact', name: 'مضغوط' },
];

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** معرّف قصير فريد لعناصر القوائم */
export function createId() {
  return 'i' + Math.random().toString(36).slice(2, 9);
}

/** سيرة فارغة جديدة */
export function emptyResume() {
  return {
    meta: { template: 'classic', accent: ACCENTS[0], density: 'normal', lang: 'ar', font: 'plex' },
    basics: {
      name: '', title: '', email: '', phone: '', city: '',
      linkedin: '', github: '', website: '', summary: '',
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    courses: [],
    certificates: [],
    achievements: [],
    languages: [],
  };
}

/** عناصر فارغة لكل قسم متكرر */
export const BLANKS = {
  experience: () => ({ id: createId(), role: '', company: '', city: '', from: '', to: '', present: false, bullets: '' }),
  education: () => ({ id: createId(), degree: '', field: '', school: '', from: '', to: '', present: false, note: '' }),
  projects: () => ({ id: createId(), name: '', url: '', description: '' }),
  courses: () => ({ id: createId(), name: '', provider: '', year: '' }),
  achievements: () => ({ id: createId(), title: '', description: '', year: '' }),
  certificates: () => ({ id: createId(), name: '', issuer: '', year: '', url: '' }),
  languages: () => ({ id: createId(), name: '', level: 'متقدّم' }),
};

/**
 * دمج بيانات محفوظة أو مستوردة مع الشكل الكامل،
 * حتى لا تنكسر السيرة لو كانت من نسخة أقدم أو ناقصة.
 */
export function normalize(data = {}) {
  const base = emptyResume();
  const out = {
    meta: { ...base.meta, ...(data.meta || {}) },
    basics: { ...base.basics, ...(data.basics || {}) },
    skills: Array.isArray(data.skills) ? data.skills.filter((s) => typeof s === 'string') : [],
    experience: [], education: [], projects: [], courses: [], certificates: [], achievements: [], languages: [],
  };
  for (const key of ['experience', 'education', 'projects', 'courses', 'certificates', 'achievements', 'languages']) {
    const rows = Array.isArray(data[key]) ? data[key] : [];
    out[key] = rows.map((row) => ({ ...BLANKS[key](), ...row, id: (row && row.id) || createId() }));
  }
  if (!TEMPLATES.some((t) => t.id === out.meta.template)) out.meta.template = 'classic';
  if (!DENSITIES.some((d) => d.id === out.meta.density)) out.meta.density = 'normal';
  if (!FONTS.some((f) => f.id === out.meta.font)) out.meta.font = 'plex';
  if (out.meta.lang !== 'en') out.meta.lang = 'ar';
  return out;
}

/* ===================== التواريخ ===================== */

/** "2024-03" تصبح "مارس 2024" */
export function formatMonth(value, lang = 'ar') {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  const months = lang === 'en' ? MONTHS_EN : MONTHS_AR;
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return value;
  return `${months[idx]} ${m[1]}`;
}

/** مدى زمني كامل */
export function formatRange(from, to, present, lang = 'ar') {
  const dash = ' — ';
  const now = lang === 'en' ? 'Present' : 'حتى الآن';
  const start = formatMonth(from, lang);
  const end = present ? now : formatMonth(to, lang);
  if (start && end) return start + dash + end;
  return start || end || '';
}

/** عدد الأشهر بين تاريخين (شامل شهر البداية) */
export function monthsBetween(from, to) {
  const p = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec(v || '');
    return m ? Number(m[1]) * 12 + (Number(m[2]) - 1) : null;
  };
  const a = p(from);
  const b = p(to);
  if (a === null || b === null) return 0;
  return Math.max(0, b - a + 1);
}

/**
 * صياغة المدة بالعربية مع التثنية والجمع الصحيحين:
 * ١ سنة، ٢ سنتان، ٣-١٠ سنوات، ١١+ سنة.
 */
export function durationText(months, lang = 'ar') {
  if (!months || months < 1) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (lang === 'en') {
    const parts = [];
    if (y) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
    if (m) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
    return parts.join(' ');
  }
  const word = (n, one, two, few, many) => {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n <= 10) return `${n} ${few}`;
    return `${n} ${many}`;
  };
  const parts = [];
  if (y) parts.push(word(y, 'سنة', 'سنتان', 'سنوات', 'سنة'));
  if (m) parts.push(word(m, 'شهر', 'شهران', 'أشهر', 'شهرًا'));
  return parts.join(' و');
}

/* ===================== مساعدات ===================== */

/** نص متعدد الأسطر يتحول إلى مصفوفة نقاط نظيفة */
export function toBullets(text = '') {
  return String(text)
    .split('\n')
    .map((l) => l.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);
}

/** نص مفصول بفواصل يتحول إلى مصفوفة مهارات بلا تكرار */
export function parseSkills(text = '') {
  const seen = new Set();
  return String(text)
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

/** رابط آمن للعرض: يمنع javascript: ويكمل https */
export function safeUrl(url = '') {
  const s = String(url).trim();
  if (!s) return '';
  if (/^javascript:/i.test(s) || /^data:/i.test(s)) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return 'https://' + s;
  return '';
}

/** تنظيف الرابط للعرض: بدون البروتوكول وwww والشرطة الأخيرة */
export function displayUrl(url = '') {
  return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/* ===================== نسبة الاكتمال ===================== */

/** الفحوصات التي تُبنى منها نسبة اكتمال السيرة */
export const CHECKS = [
  { id: 'name', label: 'الاسم الكامل', test: (d) => !!d.basics.name.trim() },
  { id: 'title', label: 'المسمى الوظيفي', test: (d) => !!d.basics.title.trim() },
  { id: 'contact', label: 'بريد أو رقم تواصل', test: (d) => !!(d.basics.email.trim() || d.basics.phone.trim()) },
  { id: 'summary', label: 'نبذة مختصرة (٤٠ حرفًا فأكثر)', test: (d) => d.basics.summary.trim().length >= 40 },
  { id: 'experience', label: 'خبرة عملية واحدة على الأقل', test: (d) => d.experience.some((e) => e.role.trim() && e.company.trim()) },
  { id: 'education', label: 'مؤهل تعليمي', test: (d) => d.education.some((e) => e.degree.trim() || e.school.trim()) },
  { id: 'skills', label: 'ثلاث مهارات أو أكثر', test: (d) => d.skills.length >= 3 },
];

/** نسبة اكتمال السيرة مع قائمة الناقص */
export function completeness(data) {
  const d = normalize(data);
  const done = [];
  const missing = [];
  for (const c of CHECKS) {
    if (c.test(d)) done.push(c.id);
    else missing.push({ id: c.id, label: c.label });
  }
  return {
    score: done.length / CHECKS.length,
    percent: Math.round((done.length / CHECKS.length) * 100),
    done,
    missing,
  };
}

/* ===================== مثال جاهز ===================== */

/** بيانات نموذجية تعرض إمكانيات الأداة كاملة */
export function sampleResume() {
  return normalize({
    meta: { template: 'modern', accent: '#0f766e', density: 'normal', lang: 'ar' },
    basics: {
      name: 'سارة العبدالله',
      title: 'مطوّرة واجهات أمامية',
      email: 'sara@example.com',
      phone: '05xxxxxxxx',
      city: 'الرياض، السعودية',
      linkedin: 'linkedin.com/in/example',
      github: 'github.com/example',
      website: '',
      summary:
        'مطوّرة واجهات أمامية بخبرة ثلاث سنوات في بناء تطبيقات ويب سريعة وسهلة الوصول. شغوفة بتحسين الأداء وتجربة المستخدم العربية، وسبق أن قدت إعادة بناء واجهة منتج يخدم أكثر من ٥٠ ألف مستخدم.',
    },
    experience: [
      {
        role: 'مطوّرة واجهات أمامية',
        company: 'شركة تقنية',
        city: 'الرياض',
        from: '2023-01', to: '', present: true,
        bullets:
          'قدت إعادة بناء لوحة التحكم فانخفض زمن التحميل من ٤.٢ ثانية إلى ١.١ ثانية\nبنيت مكتبة مكوّنات داخلية تُستخدم في ستة منتجات\nدرّبت متدربَين على أساسيات React ومراجعة الكود',
      },
      {
        role: 'مطوّرة ويب',
        company: 'وكالة رقمية',
        city: 'جدة',
        from: '2021-06', to: '2022-12', present: false,
        bullets:
          'طوّرت أكثر من ١٥ موقعًا لعملاء في قطاعات مختلفة\nرفعت نتيجة Lighthouse للأداء من ٦٠ إلى ٩٥ في المشاريع الرئيسية',
      },
    ],
    education: [
      { degree: 'بكالوريوس', field: 'علوم حاسب', school: 'جامعة الملك سعود', from: '2017-09', to: '2021-05', present: false, note: 'تقدير ممتاز' },
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'CSS', 'الوصولية (a11y)', 'Git', 'اختبارات الوحدة'],
    projects: [
      { name: 'محلّل النص العربي', url: 'github.com/example/arabic-text-toolkit', description: 'أداة متصفح لتحليل النص العربي بصفر اعتماديات وخمسة عشر اختبار وحدة.' },
    ],
    certificates: [
      { name: 'Meta Front-End Developer', issuer: 'Coursera', year: '2023', url: '' },
    ],
    languages: [
      { name: 'العربية', level: 'اللغة الأم' },
      { name: 'الإنجليزية', level: 'متقدّم' },
    ],
  });
}

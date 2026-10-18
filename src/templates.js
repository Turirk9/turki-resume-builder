/**
 * templates.js — تحويل بيانات السيرة إلى HTML.
 * ثلاثة قوالب تشترك في نفس اللبنات لكن تركّبها بطرق مختلفة،
 * فأي تحسين في لبنة واحدة ينعكس على القوالب الثلاثة.
 */
import { formatRange, monthsBetween, durationText, toBullets, safeUrl, displayUrl, TEMPLATES, orderOf } from './model.js';

/** تهريب أي نص قادم من المستخدم قبل وضعه في HTML */
export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const LABELS = {
  ar: {
    summary: 'نبذة',
    experience: 'الخبرات العملية',
    education: 'التعليم',
    skills: 'المهارات',
    projects: 'المشاريع',
    certificates: 'الشهادات والدورات',
    courses: 'الدورات التدريبية',
    achievements: 'الإنجازات',
    languages: 'اللغات',
    contact: 'التواصل',
    empty: 'ابدأ بتعبئة بياناتك على اليمين… وستظهر سيرتك هنا مباشرة.',
  },
  en: {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certificates: 'Certificates',
    courses: 'Courses',
    achievements: 'Achievements',
    languages: 'Languages',
    contact: 'Contact',
    empty: 'Fill in your details and your resume will appear here.',
  },
};

const has = (v) => !!(v && String(v).trim());

/** قسم لا يُرسم أصلًا إذا كان فارغًا */
function section(title, body, cls = '') {
  if (!body || !body.trim()) return '';
  return `<section class="cv-section ${cls}"><h2 class="cv-h2">${esc(title)}</h2>${body}</section>`;
}

/** سطر التواصل: يعرض الموجود فقط ويفصله بنقاط */
function contactItems(b) {
  const items = [];
  if (has(b.city)) items.push({ text: b.city });
  if (has(b.phone)) items.push({ text: b.phone, dir: 'ltr' });
  if (has(b.email)) items.push({ text: b.email, href: 'mailto:' + b.email, dir: 'ltr' });
  for (const key of ['linkedin', 'github', 'website']) {
    if (!has(b[key])) continue;
    const url = safeUrl(b[key]);
    if (url) items.push({ text: displayUrl(b[key]), href: url, dir: 'ltr' });
  }
  return items;
}

function contactInline(b) {
  const items = contactItems(b);
  if (!items.length) return '';
  return `<p class="cv-contact">${items
    .map((i) => {
      const inner = `<span${i.dir ? ' dir="ltr"' : ''}>${esc(i.text)}</span>`;
      return i.href ? `<a href="${esc(i.href)}">${inner}</a>` : inner;
    })
    .join('<span class="cv-dot">·</span>')}</p>`;
}

function contactStack(b) {
  const items = contactItems(b);
  if (!items.length) return '';
  return `<ul class="cv-contact-list">${items
    .map((i) => {
      const inner = `<span${i.dir ? ' dir="ltr"' : ''}>${esc(i.text)}</span>`;
      return `<li>${i.href ? `<a href="${esc(i.href)}">${inner}</a>` : inner}</li>`;
    })
    .join('')}</ul>`;
}

/* ===================== لبنات الأقسام ===================== */

function experienceList(rows, lang, { showDuration = true } = {}) {
  const items = rows.filter((r) => has(r.role) || has(r.company));
  if (!items.length) return '';
  return items
    .map((r) => {
      const range = formatRange(r.from, r.to, r.present, lang);
      const months = r.present ? 0 : monthsBetween(r.from, r.to);
      const dur = showDuration && months ? durationText(months, lang) : '';
      const bullets = toBullets(r.bullets);
      const where = [r.company, r.city].filter(has).map(esc).join(' — ');
      return `<article class="cv-item">
        <div class="cv-item-head">
          <div>
            <h3 class="cv-role">${esc(r.role)}</h3>
            ${where ? `<p class="cv-org">${where}</p>` : ''}
          </div>
          ${range ? `<p class="cv-dates">${esc(range)}${dur ? `<span class="cv-dur">${esc(dur)}</span>` : ''}</p>` : ''}
        </div>
        ${bullets.length ? `<ul class="cv-bullets">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      </article>`;
    })
    .join('');
}

function educationList(rows, lang) {
  const items = rows.filter((r) => has(r.degree) || has(r.school) || has(r.field));
  if (!items.length) return '';
  return items
    .map((r) => {
      const range = formatRange(r.from, r.to, r.present, lang);
      const head = [r.degree, r.field].filter(has).map(esc).join(' — ');
      return `<article class="cv-item">
        <div class="cv-item-head">
          <div>
            <h3 class="cv-role">${head}</h3>
            ${has(r.school) ? `<p class="cv-org">${esc(r.school)}</p>` : ''}
          </div>
          ${range ? `<p class="cv-dates">${esc(range)}</p>` : ''}
        </div>
        ${has(r.note) ? `<p class="cv-note">${esc(r.note)}</p>` : ''}
      </article>`;
    })
    .join('');
}

function projectList(rows) {
  const items = rows.filter((r) => has(r.name));
  if (!items.length) return '';
  return items
    .map((r) => {
      const url = safeUrl(r.url);
      const title = url
        ? `<a href="${esc(url)}">${esc(r.name)}</a>`
        : esc(r.name);
      return `<article class="cv-item cv-item-tight">
        <h3 class="cv-role">${title}</h3>
        ${has(r.description) ? `<p class="cv-note">${esc(r.description)}</p>` : ''}
        ${url ? `<p class="cv-link" dir="ltr">${esc(displayUrl(r.url))}</p>` : ''}
      </article>`;
    })
    .join('');
}

function certificateList(rows) {
  const items = rows.filter((r) => has(r.name));
  if (!items.length) return '';
  return `<ul class="cv-list">${items
    .map((r) => {
      const meta = [r.issuer, r.year].filter(has).map(esc).join(' · ');
      return `<li><strong>${esc(r.name)}</strong>${meta ? `<span class="cv-muted"> — ${meta}</span>` : ''}</li>`;
    })
    .join('')}</ul>`;
}

function languageList(rows) {
  const items = rows.filter((r) => has(r.name));
  if (!items.length) return '';
  return `<ul class="cv-list cv-langs">${items
    .map((r) => `<li><span>${esc(r.name)}</span>${has(r.level) ? `<span class="cv-muted">${esc(r.level)}</span>` : ''}</li>`)
    .join('')}</ul>`;
}

function skillList(skills, style = 'chips') {
  if (!skills.length) return '';
  if (style === 'inline') return `<p class="cv-skills-inline">${skills.map(esc).join('<span class="cv-dot">·</span>')}</p>`;
  return `<ul class="cv-chips">${skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
}

/* ===================== لبنات إضافية ===================== */

function courseList(rows) {
  const items = rows.filter((r) => has(r.name));
  if (!items.length) return '';
  return `<ul class="cv-list">${items
    .map((r) => {
      const meta = [r.provider, r.year].filter(has).map(esc).join(' · ');
      return `<li><strong>${esc(r.name)}</strong>${meta ? `<span class="cv-muted"> — ${meta}</span>` : ''}</li>`;
    })
    .join('')}</ul>`;
}

function achievementList(rows) {
  const items = rows.filter((r) => has(r.title));
  if (!items.length) return '';
  return items
    .map((r) => `<article class="cv-item cv-item-tight">
      <div class="cv-item-head">
        <h3 class="cv-role">${esc(r.title)}</h3>
        ${has(r.year) ? `<p class="cv-dates">${esc(r.year)}</p>` : ''}
      </div>
      ${has(r.description) ? `<p class="cv-note">${esc(r.description)}</p>` : ''}
    </article>`)
    .join('');
}

/* ===================== تركيب الأقسام ===================== */

/**
 * يبني كل أقسام السيرة مرة واحدة كخريطة، فتستطيع محرّكات التخطيط
 * ترتيبها أو توزيعها كما تشاء دون إعادة كتابة منطق الرسم.
 */
function buildSections(d, L) {
  const b = d.basics;
  const lang = d.meta.lang;
  return {
    summary: section(L.summary, has(b.summary) ? `<p class="cv-summary">${esc(b.summary)}</p>` : ''),
    experience: section(L.experience, experienceList(d.experience, lang)),
    education: section(L.education, educationList(d.education, lang)),
    skills: section(L.skills, skillList(d.skills, 'inline')),
    projects: section(L.projects, projectList(d.projects)),
    courses: section(L.courses, courseList(d.courses)),
    certificates: section(L.certificates, certificateList(d.certificates)),
    achievements: section(L.achievements, achievementList(d.achievements)),
    languages: section(L.languages, languageList(d.languages)),
  };
}

/** ترتيب الأقسام حسب القالب، مع تجاهل الفارغ منها */
function ordered(sections, order, skip = []) {
  return order
    .filter((k) => !skip.includes(k))
    .map((k) => sections[k] || '')
    .join('');
}

function nameBlock(b, cls = '') {
  if (!has(b.name) && !has(b.title)) return '';
  return `<div class="cv-name-block ${cls}">
    ${has(b.name) ? `<h1 class="cv-name">${esc(b.name)}</h1>` : ''}
    ${has(b.title) ? `<p class="cv-jobtitle">${esc(b.title)}</p>` : ''}
  </div>`;
}

/* ===================== محرّكات التخطيط ===================== */

/** عمود واحد — أوضح تخطيط لأنظمة الفرز */
function stack(d, L, order) {
  const s = buildSections(d, L);
  return `<header class="cv-head">
      ${nameBlock(d.basics)}
      ${contactInline(d.basics)}
    </header>
    ${ordered(s, order)}`;
}

/** شريط جانبي + عمود رئيسي */
function sidebar(d, L, order) {
  const s = buildSections(d, L);
  const asideKeys = ['skills', 'languages', 'certificates', 'courses'];
  const aside = `${section(L.contact, contactStack(d.basics), 'cv-aside-section')}
    ${asideKeys.map((k) => s[k] || '').join('')}`;
  return `<header class="cv-head cv-head-modern">${nameBlock(d.basics)}</header>
    <div class="cv-cols">
      <aside class="cv-aside">${aside}</aside>
      <div class="cv-main">${ordered(s, order, asideKeys)}</div>
    </div>`;
}

/** ترويسة في المنتصف ونبذة بارزة */
function centered(d, L, order) {
  const s = buildSections(d, L);
  const lead = has(d.basics.summary)
    ? `<p class="cv-summary cv-lead">${esc(d.basics.summary)}</p>`
    : '';
  return `<header class="cv-head cv-head-minimal">
      ${nameBlock(d.basics)}
      ${contactInline(d.basics)}
    </header>
    ${lead}
    ${ordered(s, order, ['summary'])}`;
}

/**
 * عمودان — يوزّع الأقسام على عمودين لاستيعاب سيرة طويلة في صفحة واحدة.
 * التوزيع بالوزن التقريبي لا بالعدد، حتى لا يمتلئ عمود ويفرغ الآخر.
 */
function columns(d, L, order) {
  const s = buildSections(d, L);
  const weight = (html) => (html.match(/cv-item|<li/g) || []).length + 1;
  const filled = order.filter((k) => s[k]);
  const total = filled.reduce((sum, k) => sum + weight(s[k]), 0);
  const left = [];
  const right = [];
  let acc = 0;
  for (const k of filled) {
    if (acc < total / 2) { left.push(s[k]); acc += weight(s[k]); }
    else right.push(s[k]);
  }
  return `<header class="cv-head cv-head-compact">
      ${nameBlock(d.basics)}
      ${contactInline(d.basics)}
    </header>
    <div class="cv-duo">
      <div class="cv-duo-col">${left.join('')}</div>
      <div class="cv-duo-col">${right.join('')}</div>
    </div>`;
}

const LAYOUTS = { stack, sidebar, centered, columns };

/**
 * رسم السيرة كاملة.
 * @param {object} d بيانات مُطبَّعة عبر normalize()
 * @returns {string} HTML
 */
export function renderResume(d) {
  const L = LABELS[d.meta.lang] || LABELS.ar;
  const tpl = TEMPLATES.find((t) => t.id === d.meta.template);
  const render = LAYOUTS[(tpl && tpl.layout) || 'stack'] || stack;
  const order = orderOf(d.meta.template);
  const body = render(d, L, order);
  if (!body.replace(/<[^>]+>/g, '').trim()) {
    return `<div class="cv-empty">${esc(L.empty)}</div>`;
  }
  return body;
}

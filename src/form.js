/**
 * form.js — بناء نموذج التحرير من مخطط واحد (schema).
 * وصف الحقول بيانات لا HTML: إضافة حقل أو قسم = سطر في المخطط،
 * ويحصل تلقائيًا على تسمية وتلميح وعدّاد وربط بالحالة.
 */
import { esc } from './templates.js';
import { icon } from './icons.js';

/** أقسام السيرة المتكررة وحقولها */
export const SECTIONS = [
  {
    key: 'experience', title: 'الخبرات العملية', icon: 'briefcase', addLabel: 'إضافة خبرة',
    empty: 'خبرتك العملية هي أقوى ما في سيرتك — أضف أول وظيفة أو تدريب.',
    titleOf: (r) => r.role || r.company || 'خبرة جديدة',
    fields: [
      { key: 'role', label: 'المسمى الوظيفي', placeholder: 'مطوّرة واجهات أمامية' },
      { key: 'company', label: 'جهة العمل', placeholder: 'اسم الشركة' },
      { key: 'city', label: 'المدينة', placeholder: 'الرياض', half: true },
      { key: 'present', label: 'ما زلت أعمل هنا', type: 'checkbox', half: true },
      { key: 'from', label: 'من', type: 'month', half: true },
      { key: 'to', label: 'إلى', type: 'month', half: true, disabledWhen: 'present' },
      {
        key: 'bullets', label: 'أبرز المهام والإنجازات', type: 'textarea', rows: 4,
        placeholder: 'سطر واحد لكل نقطة…\nمثال: خفضت زمن تحميل اللوحة من ٤.٢ ثانية إلى ١.١',
        hint: 'ابدأ كل سطر بفعل (قدت، بنيت، خفضت) وأضف رقمًا — الأرقام تُصدَّق أكثر من الصفات.',
      },
    ],
  },
  {
    key: 'education', title: 'التعليم', icon: 'cap', addLabel: 'إضافة مؤهل',
    empty: 'أضف مؤهلك التعليمي، حتى لو لم تُكمله بعد.',
    titleOf: (r) => r.degree || r.school || 'مؤهل جديد',
    fields: [
      { key: 'degree', label: 'الدرجة', placeholder: 'بكالوريوس', half: true },
      { key: 'field', label: 'التخصص', placeholder: 'علوم حاسب', half: true },
      { key: 'school', label: 'الجهة التعليمية', placeholder: 'جامعة الملك سعود' },
      { key: 'from', label: 'من', type: 'month', half: true },
      { key: 'to', label: 'إلى', type: 'month', half: true, disabledWhen: 'present' },
      { key: 'present', label: 'ما زلت أدرس', type: 'checkbox', half: true },
      { key: 'note', label: 'ملاحظة', placeholder: 'تقدير ممتاز مع مرتبة الشرف', half: true },
    ],
  },
  {
    key: 'projects', title: 'المشاريع', icon: 'rocket', addLabel: 'إضافة مشروع',
    empty: 'المشاريع أقوى دليل عملي — خصوصًا إن كانت خبرتك قصيرة.',
    titleOf: (r) => r.name || 'مشروع جديد',
    fields: [
      { key: 'name', label: 'اسم المشروع', placeholder: 'محلّل النص العربي' },
      { key: 'url', label: 'الرابط', placeholder: 'github.com/username/project', ltr: true },
      {
        key: 'description', label: 'الوصف', type: 'textarea', rows: 2,
        placeholder: 'ماذا يحل المشروع، وبماذا بنيته، وما أثره؟',
        hint: 'اذكر التقنية والأثر: «أداة بصفر اعتماديات، استخدمها ٢٠٠ شخص».',
      },
    ],
  },
  {
    key: 'courses', title: 'الدورات التدريبية', icon: 'bulb', addLabel: 'إضافة دورة',
    empty: 'الدورات تُظهر أنك تتعلم باستمرار.',
    titleOf: (r) => r.name || 'دورة جديدة',
    fields: [
      { key: 'name', label: 'اسم الدورة', placeholder: 'أساسيات تجربة المستخدم' },
      { key: 'provider', label: 'الجهة', placeholder: 'Coursera', half: true },
      { key: 'year', label: 'السنة', placeholder: '2025', half: true },
    ],
  },
  {
    key: 'certificates', title: 'الشهادات', icon: 'badge', addLabel: 'إضافة شهادة',
    empty: 'الشهادات المعتمدة تدعم مهاراتك بدليل خارجي.',
    titleOf: (r) => r.name || 'شهادة جديدة',
    fields: [
      { key: 'name', label: 'اسم الشهادة', placeholder: 'Meta Front-End Developer' },
      { key: 'issuer', label: 'الجهة المانحة', placeholder: 'Coursera', half: true },
      { key: 'year', label: 'السنة', placeholder: '2024', half: true },
    ],
  },
  {
    key: 'achievements', title: 'الإنجازات', icon: 'trophy', addLabel: 'إضافة إنجاز',
    empty: 'جائزة، مركز متقدّم، أو أثر ملموس — هنا مكانه.',
    titleOf: (r) => r.title || 'إنجاز جديد',
    fields: [
      { key: 'title', label: 'الإنجاز', placeholder: 'المركز الأول في هاكاثون الرياض' },
      { key: 'year', label: 'السنة', placeholder: '2025', half: true },
      {
        key: 'description', label: 'تفصيل مختصر', placeholder: 'من بين ٤٠ فريقًا', half: true,
        hint: 'أضف حجم المنافسة أو الأثر ليتضح وزن الإنجاز.',
      },
    ],
  },
  {
    key: 'languages', title: 'اللغات', icon: 'globe', addLabel: 'إضافة لغة',
    empty: 'أضف لغاتك ومستواك فيها.',
    titleOf: (r) => r.name || 'لغة جديدة',
    fields: [
      { key: 'name', label: 'اللغة', placeholder: 'الإنجليزية', half: true },
      { key: 'level', label: 'المستوى', type: 'select', half: true,
        options: ['اللغة الأم', 'متقدّم', 'متوسط', 'مبتدئ'] },
    ],
  },
];

/** حقول المعلومات الشخصية */
export const BASIC_FIELDS = [
  { key: 'name', label: 'الاسم الكامل', placeholder: 'سارة العبدالله', required: true },
  { key: 'title', label: 'المسمى الوظيفي', placeholder: 'مطوّرة واجهات أمامية', required: true,
    hint: 'اكتب المسمى الذي تستهدفه، لا الحالي فقط.' },
  { key: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'name@example.com', half: true, ltr: true },
  { key: 'phone', label: 'رقم الجوال', placeholder: '05xxxxxxxx', half: true, ltr: true },
  { key: 'city', label: 'المدينة', placeholder: 'الرياض، السعودية', half: true },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/username', half: true, ltr: true },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/username', half: true, ltr: true },
  { key: 'website', label: 'الموقع الشخصي', placeholder: 'example.com', half: true, ltr: true },
  {
    key: 'summary', label: 'النبذة المهنية', type: 'textarea', rows: 4,
    placeholder: 'من أنت، وما الذي تجيده، وأبرز إنجاز لك — في ٣ أسطر.',
    hint: 'الصيغة الأقوى: صفتك المهنية + سنوات الخبرة + إنجاز برقم.', counter: 300,
  },
];

/* ===================== توليد الحقول ===================== */

function field(f, value, ctx) {
  const attrs = `data-section="${ctx.section}"${ctx.index != null ? ` data-index="${ctx.index}"` : ''} data-key="${f.key}"`;
  const id = `${ctx.section}-${ctx.index == null ? 'x' : ctx.index}-${f.key}`;
  const dir = f.ltr ? ' dir="ltr"' : '';
  const cls = 'fld' + (f.half ? ' half' : '');

  if (f.type === 'checkbox') {
    return `<label class="${cls} check" for="${id}">
      <input type="checkbox" id="${id}" ${attrs} ${value ? 'checked' : ''} />
      <span>${esc(f.label)}</span>
    </label>`;
  }

  let input;
  if (f.type === 'textarea') {
    input = `<textarea id="${id}" ${attrs} rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}"${dir}>${esc(value || '')}</textarea>`;
  } else if (f.type === 'select') {
    input = `<select id="${id}" ${attrs}>${(f.options || [])
      .map((o) => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`)
      .join('')}</select>`;
  } else {
    const disabled = f.disabledWhen && ctx.row && ctx.row[f.disabledWhen] ? ' disabled' : '';
    input = `<input type="${f.type || 'text'}" id="${id}" ${attrs} value="${esc(value || '')}" placeholder="${esc(f.placeholder || '')}"${dir}${disabled} />`;
  }

  const counter = f.counter
    ? `<span class="counter" data-counter-for="${id}" data-max="${f.counter}">${String(value || '').length} / ${f.counter}</span>`
    : '';
  return `<div class="${cls}">
    <label for="${id}">${esc(f.label)}${f.required ? '<span class="req">*</span>' : ''}${counter}</label>
    ${input}
    ${f.hint ? `<p class="fld-hint">${icon('bulb', 13)}<span>${esc(f.hint)}</span></p>` : ''}
  </div>`;
}

export function renderBasics(basics) {
  return `<div class="fields">${BASIC_FIELDS.map((f) =>
    field(f, basics[f.key], { section: 'basics', index: null, row: basics })
  ).join('')}</div>`;
}

function card(sec, row, index, total) {
  return `<article class="row-card" data-card="${sec.key}" data-index="${index}" style="animation-delay:${Math.min(index * 40, 200)}ms">
    <header class="row-head">
      <button type="button" class="row-toggle" data-action="toggle" aria-expanded="true">
        ${icon('chevron', 15)}<span class="row-title">${esc(sec.titleOf(row))}</span>
      </button>
      <div class="row-tools">
        <button type="button" class="tool-btn" data-action="up" data-section="${sec.key}" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="تحريك لأعلى" aria-label="تحريك لأعلى">${icon('up', 14)}</button>
        <button type="button" class="tool-btn" data-action="down" data-section="${sec.key}" data-index="${index}" ${index === total - 1 ? 'disabled' : ''} title="تحريك لأسفل" aria-label="تحريك لأسفل">${icon('down', 14)}</button>
        <button type="button" class="tool-btn danger" data-action="remove" data-section="${sec.key}" data-index="${index}" title="حذف" aria-label="حذف">${icon('trash', 14)}</button>
      </div>
    </header>
    <div class="row-body fields">
      ${sec.fields.map((f) => field(f, row[f.key], { section: sec.key, index, row })).join('')}
    </div>
  </article>`;
}

export function renderSection(sec, rows) {
  const body = rows.length
    ? rows.map((r, i) => card(sec, r, i, rows.length)).join('')
    : `<p class="section-empty">${icon('bulb', 15)}<span>${esc(sec.empty)}</span></p>`;
  return `<section class="edit-section" data-section-root="${sec.key}">
    <header class="edit-head">
      <h2><span class="sec-ico">${icon(sec.icon, 16)}</span> ${esc(sec.title)}</h2>
      <span class="count">${rows.length || ''}</span>
    </header>
    <div class="cards">${body}</div>
    <button type="button" class="btn add" data-action="add" data-section="${sec.key}">
      ${icon('plus', 15)} ${esc(sec.addLabel)}
    </button>
  </section>`;
}

/** النموذج كاملًا */
export function renderForm(state) {
  return `
  <section class="edit-section">
    <header class="edit-head"><h2><span class="sec-ico">${icon('user', 16)}</span> المعلومات الشخصية</h2></header>
    ${renderBasics(state.basics)}
  </section>

  <section class="edit-section">
    <header class="edit-head"><h2><span class="sec-ico">${icon('spark', 16)}</span> المهارات</h2>
      <span class="count">${state.skills.length || ''}</span>
    </header>
    <div class="fields">
      <div class="fld">
        <label for="skills-input">المهارات (افصل بينها بفاصلة)</label>
        <textarea id="skills-input" data-section="skills" rows="3" placeholder="JavaScript، React، تصميم واجهات">${esc(state.skills.join('، '))}</textarea>
        <p class="fld-hint">${icon('bulb', 13)}<span>٦ إلى ١٢ مهارة، وابدأ بأقربها للوظيفة المستهدفة.</span></p>
      </div>
    </div>
    <div class="chips-preview" id="skills-preview"></div>
  </section>

  ${SECTIONS.map((sec) => renderSection(sec, state[sec.key])).join('')}`;
}

/**
 * app.js — الربط بين الحالة والواجهة.
 * قواعد معمارية:
 *   • كل تعديل على البيانات يمر عبر update()
 *   • النموذج يُعاد بناؤه عند التغييرات البنيوية فقط (وإلا ضاع مؤشر الكتابة)
 *   • المعاينة خفيفة وتُرسم مع كل ضغطة مفتاح
 */
import {
  normalize, emptyResume, sampleResume, BLANKS,
  TEMPLATES, CATEGORIES, ACCENTS, DENSITIES, FONTS, parseSkills,
} from './model.js';
import { renderResume, esc } from './templates.js';
import { renderForm, SECTIONS } from './form.js';
import { buildShareUrl, decodeResume, readTokenFromHash } from './share.js';
import { analyzeResume } from './score.js';
import { icon } from './icons.js';
import * as Store from './store.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const THEME_KEY = 'seyar:theme';
const A4_WIDTH = 794;
const A4_HEIGHT = 1122.5;

let store = Store.emptyStore();
let state = emptyResume();
let flashNext = false;

const arabicNum = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const debounce = (fn, ms = 250) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

/* ===================== تنبيهات ونوافذ ===================== */

let toastTimer;
function toast(message, kind = 'ok') {
  const el = $('#toast');
  const ico = kind === 'ok' ? 'check' : kind === 'warn' ? 'alert' : 'alert';
  el.innerHTML = `${icon(ico, 16)}<span>${esc(message)}</span>`;
  el.className = 'toast show ' + (kind === 'ok' ? '' : kind);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function copyText(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg || 'تم النسخ');
  } catch {
    toast('تعذّر النسخ — انسخ الرابط يدويًا', 'warn');
  }
}

let lastFocus = null;
/** نافذة عامة: العنوان، محتوى HTML، وأزرار أسفلها */
function openModal({ title, body, actions = [] }) {
  lastFocus = document.activeElement;
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = body;
  $('#modal-foot').innerHTML = actions
    .map((a, i) => `<button class="btn ${a.variant || ''}" data-modal-action="${i}">${esc(a.label)}</button>`)
    .join('');
  $$('#modal-foot [data-modal-action]').forEach((btn, i) =>
    btn.addEventListener('click', () => {
      const keep = actions[i].onClick && actions[i].onClick();
      if (!keep) closeModal();
    })
  );
  $('#modal-root').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#modal-body input, #modal-foot .btn')?.focus(), 60);
}

function closeModal() {
  $('#modal-root').hidden = true;
  document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

$$('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#modal-root').hidden) closeModal();
});

/** تأكيد بديل عن confirm() المزعج، بنفس هوية الموقع */
function confirmAction({ title, message, confirmLabel = 'تأكيد', danger = false, onConfirm }) {
  openModal({
    title,
    body: `<p style="color:var(--text-3);line-height:1.8">${esc(message)}</p>`,
    actions: [
      { label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: onConfirm },
      { label: 'إلغاء' },
    ],
  });
}

/* ===================== التنقّل بين الواجهات ===================== */

const VIEWS = ['landing', 'templates', 'builder'];

/** يقرأ الوجهة من العنوان، ويتعامل مع روابط المشاركة #cv= */
function currentView() {
  const h = location.hash.replace(/^#\/?/, '');
  const name = h.split('?')[0];
  return VIEWS.includes(name) ? name : 'landing';
}

function goto(view, { replace = false } = {}) {
  const url = view === 'landing' ? '#/' : `#/${view}`;
  if (replace) history.replaceState(null, '', url);
  else location.hash = url;
  applyView(view);
}

function applyView(view) {
  document.body.dataset.view = view;
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === view));
  $('#nav-drawer').hidden = true;
  $('#nav-burger').setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (view === 'templates') { renderGallery(); requestAnimationFrame(refitMinis); }
  if (view === 'builder') {
    renderFormUI();
    renderToolbar();
    renderPreview();
    requestAnimationFrame(fitPreview);
  }
  if (view === 'landing') {
    renderLanding();
    requestAnimationFrame(refitMinis);
    observeReveals();
  }
}

window.addEventListener('hashchange', () => {
  const token = readTokenFromHash(location.hash);
  if (token) return loadShared(token);
  applyView(currentView());
});

/* ===================== شريط التنقّل ===================== */

$('#nav-burger').addEventListener('click', () => {
  const drawer = $('#nav-drawer');
  const open = drawer.hidden;
  drawer.hidden = !open;
  $('#nav-burger').setAttribute('aria-expanded', String(open));
  $('#nav-burger').innerHTML = icon(open ? 'close' : 'menu', 18);
});
$('#nav-burger').innerHTML = icon('menu', 18);

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#theme-toggle').innerHTML = icon(t === 'light' ? 'moon' : 'sun', 17);
  try { localStorage.setItem(THEME_KEY, t); } catch { /* تخزين ممنوع */ }
}
$('#theme-toggle').addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')
);

/* ===================== ظهور تدريجي عند التمرير ===================== */

/** إظهار كل شيء فورًا — تُستدعى عند غياب الدعم أو كشبكة أمان */
function revealAll() {
  $$('.reveal').forEach((el) => el.classList.add('in'));
}

/**
 * الظهور التدريجي تحسين اختياري لا شرط للعرض:
 * لا نخفي شيئًا إلا بعد التأكد من دعم IntersectionObserver،
 * ومع مؤقّت أمان يُظهر كل شيء إن لم يعمل المراقب لأي سبب.
 */
let revealObserver;
let revealArmed = false;
function observeReveals() {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || calm) {
    revealAll();
    return;
  }
  if (!revealArmed) {
    document.documentElement.classList.add('js-anim');
    revealArmed = true;
    setTimeout(revealAll, 1200); // شبكة أمان: لا يبقى محتوى مخفيًا أبدًا
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            revealObserver.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );
  }
  $$('.reveal:not(.in)').forEach((el, i) => {
    if (!el.style.getPropertyValue('--rd')) el.style.setProperty('--rd', el.dataset.reveal || i % 6);
    revealObserver.observe(el);
  });
}


/* ===================== صفحة الهبوط ===================== */

const FEATURES = [
  { ico: 'layers', t: '١٤ قالبًا مختلفًا فعلًا',
    d: 'ليست ألوانًا متبدّلة: لكل قالب تخطيط وترتيب أقسام وتايبوغرافي خاص — من الرسمي إلى الإبداعي.' },
  { ico: 'eye', t: 'معاينة مباشرة بمقاس A4',
    d: 'ما تكتبه يظهر فورًا على ورقة بمقاسها الحقيقي، ومقياس يحذّرك قبل أن يتجاوز محتواك صفحة.' },
  { ico: 'zap', t: 'تحليل قوة السيرة',
    d: 'درجة من ١٠٠ مع اقتراحات عملية: أضف رقمًا هنا، ابدأ بفعل قوي هناك، وسّع نبذتك.' },
  { ico: 'download', t: 'PDF نصّي لا صورة',
    d: 'يُصدَّر عبر محرك الطباعة، فيبقى النص قابلًا للبحث والنسخ — وأنظمة الفرز تقرأه.' },
  { ico: 'shield', t: 'خصوصية بالتصميم',
    d: 'لا خادم ولا حساب ولا طلب شبكة لبياناتك. كل شيء يحدث داخل متصفحك ويُحفظ فيه.' },
  { ico: 'type', t: 'عربية أولًا',
    d: 'اتجاه سليم، خمسة خطوط عربية، وصياغة تعرف الفرق بين «سنتان» و«٢ سنوات».' },
];

const STEPS = [
  { t: 'اختر قالبًا', d: 'ابدأ من قالب يناسب مجالك، وبدّله في أي لحظة دون أن تفقد بياناتك.' },
  { t: 'اكتب بياناتك', d: 'نموذج مرتّب مع أمثلة ونصائح كتابة في كل حقل مهم، وحفظ تلقائي أثناء الكتابة.' },
  { t: 'حمّل واشارك', d: 'صدّرها PDF جاهزًا للإرسال، أو انسخ رابطًا يحمل سيرتك كاملة بلا خادم.' },
];

let landingReady = false;
function renderLanding() {
  if (landingReady) return;

  $('#feature-grid').innerHTML = FEATURES.map(
    (f, i) => `<article class="feature reveal" style="--rd:${i % 3}">
      <div class="feature-ico">${icon(f.ico, 21)}</div>
      <h3>${esc(f.t)}</h3>
      <p>${esc(f.d)}</p>
    </article>`
  ).join('');

  $('#steps').innerHTML = STEPS.map(
    (s, i) => `<li class="step reveal" style="--rd:${i}">
      <h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>
    </li>`
  ).join('');


  // شريط قوالب مصغّر: ست معاينات حقيقية
  const rail = ['classic', 'creative', 'timeline', 'elegant', 'tech', 'bold'];
  $('#tpl-rail').innerHTML = rail
    .map((id) => {
      const t = TEMPLATES.find((x) => x.id === id);
      return `<button class="rail-card" data-pick-template="${id}" type="button">
        <span class="rail-thumb preview-clip"><span class="cv-page" data-mini="${id}"></span></span>
        <span class="rail-name">${esc(t.name)}</span>
      </button>`;
    })
    .join('');
  paintMinis($('#tpl-rail'), 224 / A4_WIDTH);

  landingReady = true;
}

/** يرسم بيانات على عنصر صفحة (يُستخدم في المعاينة والمصغّرات) */

/**
 * مقاس معاينة البطل يُحسب من عرض البطاقة الفعلي، لا من قيمة ثابتة في CSS.
 * القيم الثابتة تنكسر مع أي تغيّر في المقاسات أو إذا وصل CSS متأخرًا أو قديمًا.
 */
/**
 * تثبيت ورقة A4 داخل حاوية قصّ: تموضع فيزيائي صريح ونقطة أصل 0 0،
 * فلا يتأثر الناتج باتجاه الصفحة ولا بتخطيط الحاوية ولا بترتيب تحميل الأنماط.
 * المقاس يُحفظ في متغيّر --fit ليتمكّن تأثير المرور من التركيب فوقه.
 */
function fitPageInto(page, clip) {
  if (!page || !clip) return false;
  const w = clip.clientWidth;
  if (!w) return false;
  page.style.width = A4_WIDTH + 'px';
  page.style.minHeight = A4_HEIGHT + 'px';
  page.style.position = 'absolute';
  page.style.top = '0';
  page.style.left = '0';
  page.style.transformOrigin = '0 0';
  page.style.boxShadow = 'none';
  page.style.borderRadius = '0';
  page.style.setProperty('--fit', String(w / A4_WIDTH));
  page.style.transform = 'scale(var(--fit))';
  return true;
}
function paintPage(el, data, prerendered) {
  if (!el) return;
  const d = normalize(data);
  const font = FONTS.find((f) => f.id === d.meta.font) || FONTS[0];
  el.className = `cv-page tpl-${d.meta.template} density-${d.meta.density}`;
  el.dir = d.meta.lang === 'en' ? 'ltr' : 'rtl';
  el.style.setProperty('--accent', d.meta.accent);
  el.style.setProperty('--cv-font', font.stack);
  el.style.setProperty('--cv-font-display', font.stack);
  el.style.setProperty('--fscale', String(font.scale));
  el.innerHTML = prerendered != null ? prerendered : renderResume(d);
}

/**
 * مصغّرات القوالب: رسم سيرة كاملة لكل قالب مكلف (≈١ ثانية للأربعة عشر)،
 * فنخزّن ناتج كل قالب مرة واحدة ونرسم أول دفعة فورًا والباقي في وقت فراغ
 * المتصفح — فتظهر الشبكة فورًا دون تجميد الواجهة.
 */
const miniCache = new Map();
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 16));

function paintMinis(root, scale) {
  const sample = sampleResume();
  const els = [...root.querySelectorAll('[data-mini]')];

  const paintOne = (el) => {
    const id = el.dataset.mini;
    const data = normalize({ ...sample, meta: { ...sample.meta, template: id } });
    let html = miniCache.get(id);
    if (html == null) {
      html = renderResume(data);
      miniCache.set(id, html);
    }
    paintPage(el, data, html);
    // إن لم تكن الحاوية مقيسة بعد (واجهة مخفية مثلًا) نستخدم المقاس الممرَّر مؤقتًا
    if (!fitPageInto(el, el.parentElement)) {
      el.style.setProperty('--fit', String(scale));
      el.style.transform = 'scale(var(--fit))';
    }
  };

  // الرسم فوري: القوالب الأربعة عشر مخزَّنة مسبقًا وتكلفتها ضئيلة،
  // والتقسيم على دفعات كان يترك بطاقات فارغة للحظة.
  els.forEach(paintOne);
  // ضبطة ثانية بعد استقرار التخطيط (شريط التمرير، الخطوط)
  requestAnimationFrame(() => els.forEach((el) => fitPageInto(el, el.parentElement)));
}

$('#tpl-rail')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick-template]');
  if (b) pickTemplate(b.dataset.pickTemplate);
});

/* ===================== معرض القوالب ===================== */

let galleryFilter = 'all';
let gallerySearch = '';
let atsOnly = false;
let galleryReady = false;

function matchTemplate(t) {
  if (atsOnly && !t.ats) return false;
  if (galleryFilter !== 'all' && t.category !== galleryFilter) return false;
  if (gallerySearch) {
    const q = gallerySearch.toLowerCase();
    if (!(`${t.name} ${t.hint}`.toLowerCase().includes(q))) return false;
  }
  return true;
}

function renderGallery() {
  if (!galleryReady) {
    $('#tpl-filters').innerHTML = CATEGORIES.map(
      (c) => `<button class="chip-btn${c.id === 'all' ? ' active' : ''}" data-filter="${c.id}" type="button" role="tab">${esc(c.name)}</button>`
    ).join('');
    $('#search-ico').innerHTML = icon('search', 16);
    $('#tpl-search-clear').innerHTML = icon('close', 14);
    galleryReady = true;
  }

  const list = TEMPLATES.filter(matchTemplate);
  const grid = $('#tpl-grid');
  const empty = $('#tpl-empty');

  if (!list.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.innerHTML = `${icon('search', 34)}
      <h3>لا يوجد قالب بهذه المواصفات</h3>
      <p>جرّب كلمة أخرى، أو أعد التصنيف إلى «الكل».</p>
      <button class="btn" type="button" id="reset-filters">إعادة ضبط البحث</button>`;
    $('#reset-filters').addEventListener('click', () => {
      galleryFilter = 'all'; gallerySearch = ''; atsOnly = false;
      $('#tpl-search').value = ''; $('#ats-only').checked = false;
      $$('[data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === 'all'));
      renderGallery();
    });
    return;
  }

  empty.hidden = true;
  grid.innerHTML = list
    .map(
      (t, i) => `<article class="tpl-card${t.id === state.meta.template ? ' is-current' : ''}"
        data-pick-template="${t.id}" tabindex="0" role="button"
        style="--thumb-hover:1.03;--rd:${i % 4};animation-delay:${Math.min(i * 35, 280)}ms">
        ${t.badge ? `<span class="tpl-badge">${esc(t.badge)}</span>` : ''}
        <div class="tpl-thumb preview-clip"><div class="cv-page" data-mini="${t.id}"></div></div>
        <div class="tpl-meta">
          <h3>${esc(t.name)}${t.id === state.meta.template ? `<span class="tag ats">${icon('check', 12)} مُختار</span>` : ''}</h3>
          <p>${esc(t.hint)}</p>
          <div class="tpl-tags">
            <span class="tag">${esc((CATEGORIES.find((c) => c.id === t.category) || {}).name || '')}</span>
            ${t.ats ? `<span class="tag ats">${icon('check', 11)} ATS</span>` : ''}
          </div>
        </div>
        <button class="btn primary sm tpl-pick" type="button" data-pick-template="${t.id}">استخدم هذا القالب</button>
      </article>`
    )
    .join('');

  // المصغّرات: عرض البطاقة الحقيقي ÷ عرض A4
  const cardWidth = grid.firstElementChild ? grid.firstElementChild.clientWidth : 258;
  paintMinis(grid, Math.max(0.24, cardWidth / A4_WIDTH));
}

$('#tpl-grid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick-template]');
  if (b) pickTemplate(b.dataset.pickTemplate);
});
$('#tpl-grid').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.pickTemplate) {
    e.preventDefault();
    pickTemplate(e.target.dataset.pickTemplate);
  }
});
$('#tpl-filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  galleryFilter = b.dataset.filter;
  $$('[data-filter]').forEach((x) => x.classList.toggle('active', x === b));
  renderGallery();
});
$('#tpl-search').addEventListener('input', debounce((e) => {
  gallerySearch = e.target.value.trim();
  $('#tpl-search-clear').hidden = !gallerySearch;
  renderGallery();
}, 200));
$('#tpl-search-clear').addEventListener('click', () => {
  gallerySearch = '';
  $('#tpl-search').value = '';
  $('#tpl-search-clear').hidden = true;
  renderGallery();
  $('#tpl-search').focus();
});
$('#ats-only').addEventListener('change', (e) => {
  atsOnly = e.target.checked;
  renderGallery();
});

/** اختيار قالب من أي مكان في الموقع ثم الانتقال إلى المنشئ */
function pickTemplate(id) {
  if (!TEMPLATES.some((t) => t.id === id)) return;
  state.meta.template = id;
  persist();
  goto('builder');
  const t = TEMPLATES.find((x) => x.id === id);
  toast(`اخترت قالب «${t.name}»`);
}

/* ===================== المنشئ: الرسم ===================== */

function renderPreview() {
  const page = $('#page');
  paintPage(page, state);
  if (flashNext) {
    flashNext = false;
    page.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
  }
  renderScore();
  fitPreview();
}

function renderFormUI() {
  $('#form').innerHTML = renderForm(state);
  renderSkillChips();
  $('#privacy-note').innerHTML = `${icon('shield', 14)}<span>بياناتك تُحفظ في متصفحك فقط ولا تُرسل لأي خادم.</span>`;
}

function renderSkillChips() {
  const box = $('#skills-preview');
  if (box) box.innerHTML = state.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('');
}

function renderScore() {
  const a = analyzeResume(state);
  $('#score-card').dataset.tone = a.tone;
  $('#score-num').textContent = arabicNum(a.total) + '٪';
  $('#score-level').textContent = a.level;
  $('#score-bar').style.width = a.total + '%';
  $('#score-groups').innerHTML = a.groups
    .map((g) => {
      const full = g.score === g.max;
      return `<span class="${full ? 'full' : ''}">${full ? icon('check', 12) : ''}${esc(g.label)}
        <b>${arabicNum(g.score)}/${arabicNum(g.max)}</b></span>`;
    })
    .join('');
  $('#score-tips').innerHTML = a.tips.length
    ? a.tips.map((t) => `<p class="tip">${icon('bulb', 14)}<span>${esc(t)}</span></p>`).join('')
    : `<p class="score-done">${icon('check', 15)} سيرتك مكتملة وقوية — جاهزة للإرسال</p>`;
}

function pageCount() {
  const page = $('#page');
  if (!page) return 1;
  return Math.max(1, Math.ceil((page.scrollHeight - 4) / A4_HEIGHT));
}

function updatePageMeter() {
  const meter = $('#page-meter');
  if (!meter) return;
  const n = pageCount();
  meter.dataset.fit = n === 1 ? 'yes' : 'no';
  meter.textContent =
    n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتان — قد يُقطع المحتوى' : `${arabicNum(n)} صفحات — قد يُقطع المحتوى`;
}

/** تصغير ورقة A4 لتناسب عرض المعاينة */
function fitPreview(retries) {
  const stage = $('#stage');
  const page = $('#page');
  if (!stage || !page) return;
  // قد تُستدعى من ResizeObserver فتصل الوسيطة كمصفوفة — نتجاهلها
  const left = typeof retries === 'number' && retries <= 12 ? retries : 8;
  if (stage.clientWidth < 80) {
    // العمود مخفي أو لم يُحسب تخطيطه بعد: نعيد المحاولة بدل الاستسلام صامتين
    if (left > 0) setTimeout(() => fitPreview(left - 1), 90);
    return;
  }
  const scale = Math.min(1, (stage.clientWidth - 24) / A4_WIDTH);
  page.style.transform = `scale(${scale})`;
  stage.style.height = page.offsetHeight * scale + 24 + 'px';
  updatePageMeter();
}

function renderToolbar() {
  flashNext = true;
  $('#templates').innerHTML = TEMPLATES.map(
    (t) => `<button class="chip-btn${t.id === state.meta.template ? ' active' : ''}" data-template="${t.id}" title="${esc(t.hint)}" type="button">${esc(t.name)}</button>`
  ).join('');
  $('#fonts').innerHTML = FONTS.map(
    (f) => `<button class="chip-btn${f.id === state.meta.font ? ' active' : ''}" data-font="${f.id}" type="button">${esc(f.name)}</button>`
  ).join('');
  $('#accents').innerHTML =
    ACCENTS.map(
      (c) => `<button class="dot${c === state.meta.accent ? ' active' : ''}" data-accent="${c}" style="--c:${c}" title="${c}" type="button" aria-label="لون ${c}"></button>`
    ).join('') +
    `<label class="dot custom" title="لون مخصص"><input type="color" id="accent-custom" value="${state.meta.accent}" /></label>`;
  $('#densities').innerHTML = DENSITIES.map(
    (d) => `<button class="chip-btn${d.id === state.meta.density ? ' active' : ''}" data-density="${d.id}" type="button">${esc(d.name)}</button>`
  ).join('');
  $('#lang-toggle').textContent = state.meta.lang === 'ar' ? 'عربي' : 'English';
  $('#doc-name').textContent = (Store.activeResume(store) || {}).name || 'سيرتي';

  $('#accent-custom').addEventListener('input', (e) => {
    state.meta.accent = e.target.value;
    $$('[data-accent]').forEach((b) => b.classList.remove('active'));
    update();
  });
}

/* ===================== الحفظ ===================== */

const saveNow = () => {
  store = Store.updateActive(store, state);
  const ok = Store.saveStore(store);
  const hint = $('#saved-hint');
  hint.dataset.state = 'saved';
  hint.textContent = ok ? 'محفوظة' : 'الحفظ غير متاح في هذا المتصفح';
};
const persistSoon = debounce(saveNow, 500);

function persist() {
  $('#saved-hint').dataset.state = 'saving';
  $('#saved-hint').textContent = 'جارٍ الحفظ…';
  persistSoon();
}

/** كل تعديل على الحالة يمر من هنا */
function update({ structure = false } = {}) {
  persist();
  if (structure) renderFormUI();
  renderPreview();
}

/* ===================== أحداث النموذج ===================== */

function setValue(el) {
  const { section, index, key } = el.dataset;
  const value = el.type === 'checkbox' ? el.checked : el.value;

  if (section === 'basics') {
    state.basics[key] = value;
  } else if (section === 'skills') {
    state.skills = parseSkills(value);
    renderSkillChips();
  } else if (index != null) {
    const row = state[section] && state[section][Number(index)];
    if (!row) return;
    row[key] = value;
    if (key === 'present') {
      if (value) row.to = '';
      const toInput = document.querySelector(`[data-section="${section}"][data-index="${index}"][data-key="to"]`);
      if (toInput) { toInput.disabled = !!value; if (value) toInput.value = ''; }
    }
    const sec = SECTIONS.find((s) => s.key === section);
    const title = document.querySelector(`[data-card="${section}"][data-index="${index}"] .row-title`);
    if (sec && title) title.textContent = sec.titleOf(row);
  }

  const counter = document.querySelector(`[data-counter-for="${el.id}"]`);
  if (counter) {
    const max = Number(counter.dataset.max);
    counter.textContent = `${el.value.length} / ${max}`;
    counter.classList.toggle('over', el.value.length > max);
  }
  update();
}

$('#form').addEventListener('input', (e) => { if (e.target.dataset.section) setValue(e.target); });
$('#form').addEventListener('change', (e) => { if (e.target.dataset.section) setValue(e.target); });

$('#form').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, section, index } = btn.dataset;
  const i = Number(index);

  if (action === 'toggle') {
    const card = btn.closest('.row-card');
    const collapsed = card.classList.toggle('collapsed');
    btn.setAttribute('aria-expanded', String(!collapsed));
    return;
  }
  if (action === 'add') {
    state[section].push(BLANKS[section]());
    update({ structure: true });
    const cards = document.querySelectorAll(`[data-card="${section}"]`);
    const last = cards[cards.length - 1];
    last?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    last?.querySelector('input, textarea, select')?.focus();
    return;
  }
  if (action === 'remove') {
    const sec = SECTIONS.find((s) => s.key === section);
    const row = state[section][i];
    const label = sec ? sec.titleOf(row) : 'العنصر';
    confirmAction({
      title: 'تأكيد الحذف',
      message: `سيُحذف «${label}» من سيرتك. لا يمكن التراجع عن هذه الخطوة.`,
      confirmLabel: 'حذف',
      danger: true,
      onConfirm: () => {
        state[section].splice(i, 1);
        update({ structure: true });
        toast('حُذف العنصر');
      },
    });
    return;
  }
  if (action === 'up' && i > 0) {
    [state[section][i - 1], state[section][i]] = [state[section][i], state[section][i - 1]];
    update({ structure: true });
    return;
  }
  if (action === 'down' && i < state[section].length - 1) {
    [state[section][i + 1], state[section][i]] = [state[section][i], state[section][i + 1]];
    update({ structure: true });
  }
});

/* ===================== شريط التصميم ===================== */

$('#templates').addEventListener('click', (e) => {
  const b = e.target.closest('[data-template]');
  if (!b) return;
  state.meta.template = b.dataset.template;
  renderToolbar();
  update();
});
$('#fonts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-font]');
  if (!b) return;
  state.meta.font = b.dataset.font;
  renderToolbar();
  update();
});
$('#accents').addEventListener('click', (e) => {
  const b = e.target.closest('[data-accent]');
  if (!b) return;
  state.meta.accent = b.dataset.accent;
  renderToolbar();
  update();
});
$('#densities').addEventListener('click', (e) => {
  const b = e.target.closest('[data-density]');
  if (!b) return;
  state.meta.density = b.dataset.density;
  renderToolbar();
  update();
});
$('#lang-toggle').addEventListener('click', () => {
  state.meta.lang = state.meta.lang === 'ar' ? 'en' : 'ar';
  renderToolbar();
  update();
  toast(state.meta.lang === 'ar' ? 'اتجاه السيرة: عربي' : 'Resume direction: English');
});

$('#autofit').addEventListener('click', () => {
  const before = state.meta.density;
  let fitted = null;
  for (const d of ['comfortable', 'normal', 'compact']) {
    state.meta.density = d;
    renderPreview();
    if (pageCount() === 1) { fitted = d; break; }
  }
  renderToolbar();
  update();
  if (fitted) {
    const name = DENSITIES.find((d) => d.id === fitted).name;
    toast(before === fitted ? `المحتوى يتّسع لصفحة واحدة (${name})` : `ضُبطت الكثافة على «${name}» لتتّسع صفحة واحدة`);
  } else {
    toast('المحتوى أطول من صفحة حتى بأضيق كثافة — اختصر بعض النقاط', 'warn');
  }
});

/* ===================== الإجراءات ===================== */

$('#print').addEventListener('click', () => {
  const a = analyzeResume(state);
  if (a.total < 25) {
    toast('أكمل بياناتك الأساسية أولًا للحصول على ملف مفيد', 'warn');
    return;
  }
  toast('في نافذة الطباعة اختر «حفظ كـ PDF» — النص يبقى قابلًا للبحث');
  setTimeout(() => window.print(), 500);
});

$('#share').addEventListener('click', async () => {
  const btn = $('#share');
  btn.classList.add('is-loading');
  try {
    const url = await buildShareUrl(state, location.origin + location.pathname);
    if (url.length > 8000) {
      toast('سيرتك طويلة على الرابط — استخدم تصدير JSON', 'warn');
      return;
    }
    await copyText(url, 'نُسخ رابط المشاركة — يحمل سيرتك كاملة');
  } catch {
    toast('تعذّر إنشاء الرابط', 'error');
  } finally {
    btn.classList.remove('is-loading');
  }
});

$('#export').addEventListener('click', () => {
  const name = (Store.activeResume(store) || {}).name || 'resume';
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url, download: name.trim().replace(/\s+/g, '-') + '.json',
  });
  a.click();
  URL.revokeObjectURL(url);
  toast('نُزّل ملف بياناتك');
});

$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast('الملف كبير جدًا — تأكد أنه ملف سيرة بصيغة JSON', 'error');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed || typeof parsed !== 'object' || !parsed.basics) throw new Error('bad');
      state = normalize(parsed);
      store = Store.updateActive(store, state);
      Store.saveStore(store);
      renderFormUI(); renderToolbar(); renderPreview();
      toast('استُوردت بياناتك بنجاح');
    } catch {
      toast('الملف غير صالح — يُتوقع ملف JSON صادر من سِيَر', 'error');
    }
  };
  reader.onerror = () => toast('تعذّرت قراءة الملف', 'error');
  reader.readAsText(file);
  e.target.value = '';
});

$('#sample').addEventListener('click', () => {
  const apply = () => {
    state = sampleResume();
    store = Store.updateActive(store, state);
    Store.saveStore(store);
    renderFormUI(); renderToolbar(); renderPreview();
    toast('عُبّئ المثال — عدّله كما تشاء');
  };
  if (analyzeResume(state).total > 8) {
    confirmAction({
      title: 'استبدال بياناتك بالمثال؟',
      message: 'سيحل المثال محل ما كتبته في هذه السيرة. يمكنك بدل ذلك إنشاء سيرة جديدة من «سيرتي».',
      confirmLabel: 'استبدال',
      danger: true,
      onConfirm: apply,
    });
  } else apply();
});

/* ===================== سيرتي (سير متعددة) ===================== */

function openLibrary() {
  const items = store.resumes;
  const body = items.length
    ? `<div class="doc-list">${items
        .map((r) => {
          const score = analyzeResume(r.data).total;
          const when = new Date(r.updatedAt).toLocaleDateString('ar');
          return `<div class="doc-item${r.id === store.activeId ? ' current' : ''}">
            <button class="doc-main" data-open="${r.id}" type="button">
              <strong>${esc(r.name)}</strong>
              <span>آخر تعديل ${esc(when)} · قوة ${arabicNum(score)}٪</span>
            </button>
            <div class="doc-acts">
              <button class="tool-btn" data-rename="${r.id}" title="إعادة تسمية" aria-label="إعادة تسمية">${icon('edit', 14)}</button>
              <button class="tool-btn" data-dup="${r.id}" title="نسخة" aria-label="نسخة">${icon('duplicate', 14)}</button>
              <button class="tool-btn danger" data-del="${r.id}" title="حذف" aria-label="حذف" ${items.length === 1 ? 'disabled' : ''}>${icon('trash', 14)}</button>
            </div>
          </div>`;
        })
        .join('')}</div>`
    : `<div class="empty-state">${icon('doc', 30)}<h3>لا توجد سير محفوظة</h3>
        <p>أنشئ سيرتك الأولى وستظهر هنا تلقائيًا.</p></div>`;

  openModal({
    title: 'سيرتي المحفوظة',
    body,
    actions: [{ label: 'سيرة جديدة', variant: 'primary', onClick: () => { createNew(); return false; } }],
  });

}

function createNew() {
  store = Store.addResume(store, { name: `سيرة ${arabicNum(store.resumes.length + 1)}` });
  Store.saveStore(store);
  loadActive();
  closeModal();
  goto('builder');
  toast('أُنشئت سيرة جديدة');
}

function switchTo(id) {
  store = Store.setActive(store, id);
  Store.saveStore(store);
  loadActive();
  goto('builder');
}

function promptRename(id) {
  const r = store.resumes.find((x) => x.id === id);
  if (!r) return;
  openModal({
    title: 'إعادة تسمية',
    body: `<div class="fld"><label for="rename-input">اسم السيرة</label>
      <input type="text" id="rename-input" value="${esc(r.name)}" maxlength="60" /></div>`,
    actions: [
      { label: 'حفظ', variant: 'primary', onClick: () => {
          const v = $('#rename-input').value;
          store = Store.renameResume(store, id, v);
          Store.saveStore(store);
          renderToolbar();
          toast('حُدّث الاسم');
          setTimeout(openLibrary, 60);
        } },
      { label: 'إلغاء', onClick: () => { setTimeout(openLibrary, 60); } },
    ],
  });
}

function askDelete(id) {
  const r = store.resumes.find((x) => x.id === id);
  if (!r) return;
  confirmAction({
    title: 'حذف السيرة',
    message: `سيُحذف «${r.name}» نهائيًا من هذا المتصفح.`,
    confirmLabel: 'حذف',
    danger: true,
    onConfirm: () => {
      store = Store.deleteResume(store, id);
      Store.saveStore(store);
      loadActive();
      toast('حُذفت السيرة');
      setTimeout(openLibrary, 60);
    },
  });
}


/**
 * مستمع واحد لكل نافذة «سيرتي» — تسجيله داخل openLibrary كان يضيف
 * نسخة جديدة مع كل فتح، فيتكرر تنفيذ الأمر الواحد عدة مرات.
 */
$('#modal-body').addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  const ren = e.target.closest('[data-rename]');
  const dup = e.target.closest('[data-dup]');
  const del = e.target.closest('[data-del]');
  if (open) { switchTo(open.dataset.open); closeModal(); }
  else if (dup) {
    store = Store.duplicateResume(store, dup.dataset.dup);
    Store.saveStore(store);
    loadActive();
    toast('أُنشئت نسخة');
    openLibrary();
  } else if (ren) promptRename(ren.dataset.rename);
  else if (del) askDelete(del.dataset.del);
});
$('#open-library').addEventListener('click', openLibrary);
$$('[data-open-library]').forEach((b) => b.addEventListener('click', openLibrary));
$('#doc-menu').addEventListener('click', openLibrary);

/* ===================== الجوال والمظهر ===================== */

$$('.mobile-tabs [data-pane]').forEach((btn) => {
  btn.innerHTML = `${icon(btn.dataset.pane === 'edit' ? 'edit' : 'eye', 15)} ${btn.dataset.pane === 'edit' ? 'التحرير' : 'المعاينة'}`;
  btn.addEventListener('click', () => {
    document.body.dataset.pane = btn.dataset.pane;
    $$('.mobile-tabs [data-pane]').forEach((b) => b.classList.toggle('active', b === btn));
    if (btn.dataset.pane === 'preview') fitPreview(8);
  });
});

/** شريط التصميم يبدأ مطويًا في الجوال ليصل المستخدم إلى سيرته أسرع */
(function setupDesignToggle() {
  const toggle = $('#design-toggle');
  const bar = $('#design-bar');
  toggle.querySelector('.caret').innerHTML = icon('chevron', 16);
  const setOpen = (open) => {
    bar.classList.toggle('collapsed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) fitPreview(8);
  };
  toggle.addEventListener('click', () => setOpen(bar.classList.contains('collapsed')));
  if (window.matchMedia('(max-width: 620px)').matches) setOpen(false);
})();

/** إعادة ضبط المقاس عند تغيّر عرض العمود (تبديل تبويب، تدوير، تحجيم نافذة) */
(function watchPreviewWidth() {
  const pane = $('.preview-pane');
  if (!pane || typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', debounce(fitPreview, 120));
    return;
  }
  let last = 0;
  new ResizeObserver((entries) => {
    const w = Math.round(entries[0].contentRect.width);
    if (w !== last) { last = w; fitPreview(); }
  }).observe(pane);
})();

/** Ctrl/Cmd + S ينزّل نسخة JSON */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    $('#export').click();
  }
});

/* ===================== الإقلاع ===================== */

function loadActive() {
  const active = Store.activeResume(store);
  state = active ? normalize(active.data) : emptyResume();
  renderFormUI();
  renderToolbar();
  renderPreview();
}

async function loadShared(token) {
  try {
    const data = normalize(await decodeResume(token));
    store = Store.addResume(store, { name: 'سيرة من رابط', data });
    Store.saveStore(store);
    loadActive();
    history.replaceState(null, '', location.pathname + '#/builder');
    applyView('builder');
    toast('فُتحت سيرة من رابط مشاركة — حُفظت عندك كنسخة');
  } catch {
    applyView('builder');
    toast('رابط المشاركة تالف — فُتحت مسودتك المحفوظة', 'error');
  }
}

(function boot() {
  let theme = 'dark';
  try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch { /* تخزين ممنوع */ }
  applyTheme(theme);

  store = Store.loadStore();
  if (!store.resumes.length) {
    store = Store.addResume(store, { name: 'سيرتي' });
    Store.saveStore(store);
  }
  loadActive();

  const token = readTokenFromHash(location.hash);
  if (token) { loadShared(token); return; }

  applyView(currentView());
  observeReveals();
})();

/** إعادة ضبط معاينة البطل مع تغيّر حجم النافذة */

/**
 * إعادة ضبط مقاس المصغّرات عند تغيّر عرض الحاويات (تحجيم النافذة، تبديل الواجهة).
 * تعديل متغيّر واحد فقط — بلا إعادة رسم.
 */
function refitMinis() {
  $$('[data-mini]').forEach((el) => fitPageInto(el, el.parentElement));
}
window.addEventListener('resize', debounce(refitMinis, 150));

/**
 * أي تغيّر في عرض الحاويات يعيد ضبط المعاينات فورًا:
 * ظهور شريط التمرير، اكتمال تحميل الخطوط، تبديل الواجهة، تدوير الجهاز.
 * بهذا لا تظهر ومضة بمقاس خاطئ قبل استقرار التخطيط.
 */
(function watchPreviewContainers() {
  if (typeof ResizeObserver === 'undefined') return;
  const widths = new WeakMap();
  const ro = new ResizeObserver((entries) => {
    let changed = false;
    for (const e of entries) {
      const w = Math.round(e.contentRect.width);
      if (widths.get(e.target) !== w) {
        widths.set(e.target, w);
        changed = true;
      }
    }
    if (changed) refitMinis();
  });
  ['#tpl-grid', '#tpl-rail'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) ro.observe(el);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => refitMinis()).catch(() => {});
  }
})();

/**
 * score.js — تحليل قوة السيرة الذاتية.
 * ليس مجرد «كم حقلًا عبّأت»، بل يفحص جودة المحتوى نفسه:
 * هل الإنجازات مدعومة بأرقام؟ هل النبذة بطول مناسب؟ هل المهارات كافية؟
 * كل خصم يقابله اقتراح عملي قابل للتنفيذ.
 */
import { normalize, toBullets } from './model.js';

/** أفعال قوية تدل على مبادرة وإنجاز لا على مجرد أداء مهام */
export const STRONG_VERBS = [
  'قدت', 'قُدت', 'بنيت', 'طوّرت', 'طورت', 'حسّنت', 'حسنت', 'رفعت', 'خفضت',
  'أطلقت', 'اطلقت', 'صمّمت', 'صممت', 'أدرت', 'ادرت', 'درّبت', 'دربت',
  'حللت', 'أنشأت', 'انشأت', 'نفّذت', 'نفذت', 'أتمتت', 'اختصرت', 'ضاعفت',
  'أنجزت', 'قدّمت', 'وفّرت', 'وفرت', 'زدت', 'قلّلت', 'قللت', 'أسّست', 'اسست',
];

const RE_NUMBER = /[0-9٠-٩]/;
const hasNumber = (s) => RE_NUMBER.test(s);
const startsStrong = (s) => STRONG_VERBS.some((v) => s.trim().startsWith(v));

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * تحليل السيرة.
 * @returns {{total:number, level:string, tone:string, groups:Array, tips:string[]}}
 */
export function analyzeResume(input) {
  const d = normalize(input);
  const groups = [];
  const tips = [];

  /* ---------- الأساسيات (15) ---------- */
  let basics = 0;
  if (d.basics.name.trim()) basics += 5;
  if (d.basics.title.trim()) basics += 5;
  if (d.basics.email.trim() || d.basics.phone.trim()) basics += 3;
  if (d.basics.city.trim()) basics += 1;
  if (d.basics.linkedin.trim() || d.basics.github.trim() || d.basics.website.trim()) basics += 1;
  if (basics < 15) {
    if (!d.basics.title.trim()) tips.push('أضف مسمّاك الوظيفي أسفل الاسم — أول ما تقع عليه العين.');
    if (!d.basics.email.trim() && !d.basics.phone.trim()) tips.push('أضف وسيلة تواصل واحدة على الأقل.');
    if (!d.basics.linkedin.trim() && !d.basics.github.trim()) tips.push('رابط LinkedIn أو GitHub يزيد مصداقيتك.');
  }
  groups.push({ id: 'basics', label: 'المعلومات الأساسية', score: basics, max: 15 });

  /* ---------- النبذة (15) ---------- */
  const summary = d.basics.summary.trim();
  const words = summary ? summary.split(/\s+/).length : 0;
  let sum = 0;
  if (words >= 12) sum += 6;
  if (words >= 25 && words <= 90) sum += 5;
  else if (words > 90) sum += 2;
  if (hasNumber(summary)) sum += 4;
  if (!summary) tips.push('اكتب نبذة من ٣ أسطر: من أنت، وخبرتك، وأبرز إنجاز لك.');
  else if (words < 25) tips.push('نبذتك قصيرة — وسّعها إلى ٣٠–٦٠ كلمة لتوضح قيمتك.');
  else if (words > 90) tips.push('نبذتك طويلة — اختصرها إلى ٦٠ كلمة تقريبًا ليقرأها المسؤول كاملة.');
  if (summary && !hasNumber(summary)) tips.push('أضف رقمًا إلى نبذتك (سنوات الخبرة أو حجم أثرك).');
  groups.push({ id: 'summary', label: 'النبذة المهنية', score: clamp(sum, 0, 15), max: 15 });

  /* ---------- الخبرات (25) ---------- */
  const exps = d.experience.filter((e) => e.role.trim() || e.company.trim());
  const allBullets = exps.flatMap((e) => toBullets(e.bullets));
  const withNumbers = allBullets.filter(hasNumber).length;
  const withVerbs = allBullets.filter(startsStrong).length;
  let exp = 0;
  if (exps.length >= 1) exp += 7;
  if (exps.length >= 2) exp += 3;
  if (allBullets.length >= 3) exp += 5;
  if (withNumbers >= 1) exp += 4;
  if (allBullets.length && withNumbers / allBullets.length >= 0.4) exp += 3;
  if (withVerbs >= 1) exp += 3;
  if (!exps.length) tips.push('أضف خبرة عملية واحدة على الأقل — أو تدريبًا أو عملًا تطوعيًا.');
  else {
    if (allBullets.length < 3) tips.push('اكتب ٣ نقاط على الأقل تحت خبراتك، كل نقطة إنجاز لا مهمة.');
    if (!withNumbers) tips.push('حوّل إنجازًا واحدًا إلى رقم: «خفضت زمن التحميل ٦٠٪» أقوى من «حسّنت الأداء».');
    if (!withVerbs) tips.push('ابدأ نقاطك بفعل قوي: قدت، بنيت، خفضت، أطلقت…');
  }
  groups.push({ id: 'experience', label: 'الخبرات العملية', score: clamp(exp, 0, 25), max: 25 });

  /* ---------- التعليم (10) ---------- */
  const edus = d.education.filter((e) => e.degree.trim() || e.school.trim());
  let edu = 0;
  if (edus.length) edu += 7;
  if (edus.some((e) => e.from || e.to || e.present)) edu += 3;
  if (!edus.length) tips.push('أضف مؤهلك التعليمي — حتى لو لم تُكمله بعد.');
  groups.push({ id: 'education', label: 'التعليم', score: edu, max: 10 });

  /* ---------- المهارات (15) ---------- */
  const n = d.skills.length;
  let sk = 0;
  if (n >= 3) sk += 6;
  if (n >= 6) sk += 5;
  if (n >= 8 && n <= 16) sk += 4;
  else if (n > 16) sk += 1;
  if (n < 6) tips.push('أضف ٦ مهارات على الأقل، وابدأ بأقربها للوظيفة المستهدفة.');
  if (n > 16) tips.push('عدد المهارات كبير — احتفظ بأقواها فقط، القائمة الطويلة تُضعف التركيز.');
  groups.push({ id: 'skills', label: 'المهارات', score: clamp(sk, 0, 15), max: 15 });

  /* ---------- ما يميّزك (20) ---------- */
  let extra = 0;
  if (d.projects.some((p) => p.name.trim())) extra += 7;
  if (d.certificates.some((c) => c.name.trim()) || d.courses.some((c) => c.name.trim())) extra += 5;
  if (d.achievements.some((a) => a.title.trim())) extra += 5;
  if (d.languages.some((l) => l.name.trim())) extra += 3;
  if (!d.projects.some((p) => p.name.trim())) tips.push('أضف مشروعًا واحدًا برابط — أقوى دليل عملي على مهاراتك.');
  if (!d.languages.some((l) => l.name.trim())) tips.push('أضف اللغات التي تتقنها ومستواك فيها.');
  groups.push({ id: 'extra', label: 'ما يميّزك', score: clamp(extra, 0, 20), max: 20 });

  const total = groups.reduce((s, g) => s + g.score, 0);
  const level = total >= 85 ? 'ممتازة' : total >= 65 ? 'قوية' : total >= 40 ? 'جيدة' : 'تحتاج عملًا';
  const tone = total >= 85 ? 'high' : total >= 65 ? 'good' : total >= 40 ? 'mid' : 'low';

  return { total, level, tone, groups, tips: tips.slice(0, 6) };
}

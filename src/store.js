/**
 * store.js — إدارة أكثر من سيرة ذاتية في نفس المتصفح.
 * الدوال النقية تعمل على كائن المخزن، والحفظ طبقة رفيعة فوقها،
 * فيمكن اختبار كل المنطق دون متصفح.
 */
import { createId, normalize, emptyResume } from './model.js';

export const STORE_KEY = 'seyar:store:v1';
const LEGACY_KEY = 'seyar:resume';

/** مخزن فارغ */
export function emptyStore() {
  return { version: 1, activeId: null, resumes: [] };
}

const stamp = () => new Date().toISOString();

/** إضافة سيرة جديدة وجعلها النشطة */
export function addResume(store, { name = 'سيرتي', data } = {}) {
  const item = {
    id: createId(),
    name: String(name).trim() || 'سيرتي',
    createdAt: stamp(),
    updatedAt: stamp(),
    data: normalize(data || emptyResume()),
  };
  return { ...store, activeId: item.id, resumes: [item, ...store.resumes] };
}

/** تحديث بيانات السيرة النشطة */
export function updateActive(store, data) {
  if (!store.activeId) return addResume(store, { data });
  return {
    ...store,
    resumes: store.resumes.map((r) =>
      r.id === store.activeId ? { ...r, data: normalize(data), updatedAt: stamp() } : r
    ),
  };
}

/** السيرة النشطة (أو null) */
export function activeResume(store) {
  return store.resumes.find((r) => r.id === store.activeId) || null;
}

export function setActive(store, id) {
  return store.resumes.some((r) => r.id === id) ? { ...store, activeId: id } : store;
}

export function renameResume(store, id, name) {
  const clean = String(name).trim();
  if (!clean) return store;
  return {
    ...store,
    resumes: store.resumes.map((r) => (r.id === id ? { ...r, name: clean, updatedAt: stamp() } : r)),
  };
}

/** نسخة مطابقة بعنوان «(نسخة)» تصير هي النشطة */
export function duplicateResume(store, id) {
  const src = store.resumes.find((r) => r.id === id);
  if (!src) return store;
  const copy = {
    ...src,
    id: createId(),
    name: `${src.name} (نسخة)`,
    createdAt: stamp(),
    updatedAt: stamp(),
    data: JSON.parse(JSON.stringify(src.data)),
  };
  const at = store.resumes.findIndex((r) => r.id === id);
  const resumes = [...store.resumes];
  resumes.splice(at + 1, 0, copy);
  return { ...store, activeId: copy.id, resumes };
}

/** الحذف لا يترك المخزن بلا سيرة نشطة */
export function deleteResume(store, id) {
  const resumes = store.resumes.filter((r) => r.id !== id);
  let activeId = store.activeId;
  if (activeId === id) activeId = resumes.length ? resumes[0].id : null;
  return { ...store, activeId, resumes };
}

/** ترقية بيانات النسخة القديمة (سيرة واحدة) إلى المخزن الجديد */
export function migrateLegacy(legacyData) {
  if (!legacyData) return null;
  const store = addResume(emptyStore(), { name: 'سيرتي', data: legacyData });
  return store;
}

/* ===================== الحفظ في المتصفح ===================== */

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.resumes)) {
        parsed.resumes = parsed.resumes.map((r) => ({ ...r, data: normalize(r.data) }));
        return parsed;
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(JSON.parse(legacy));
      if (migrated) {
        saveStore(migrated);
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    }
  } catch {
    /* بيانات تالفة أو تخزين ممنوع — نبدأ من جديد بهدوء */
  }
  return emptyStore();
}

export function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

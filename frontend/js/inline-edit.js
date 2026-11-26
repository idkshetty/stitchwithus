const STYLE_ID = 'ycswu-inline-edit-style';
const PREF_KEY = 'ycswu-inline-edit-pref-v1';

const FRAME_CSS = `
[data-inline-editable]{pointer-events:auto!important;cursor:text}
[data-inline-editable][data-inline-kind="pick"]{cursor:pointer}
[data-inline-editable]:not([data-inline-editing]):hover{outline:2px dashed #d94e41!important;outline-offset:3px!important;background-color:rgba(217,78,65,.10)!important;border-radius:4px}
[data-inline-editable][data-inline-kind="pick"]:not([data-inline-editing]):hover{outline:2px dotted #486e37!important;background-color:rgba(72,110,55,.08)!important}
[data-inline-editing="true"]{outline:2px solid #d94e41!important;outline-offset:3px!important;background:#fffdf9!important;color:#231f1d!important;-webkit-text-fill-color:#231f1d!important;text-shadow:none!important;cursor:text;caret-color:#d94e41;min-width:1ch;border-radius:3px}
`;

export function readInlinePref() {
  try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
}

export function writeInlinePref(on) {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
}

export function flashControl(control, { focus = false, onOpen } = {}) {
  if (!control) return;
  const group = control.closest('details');
  if (group && !group.open) { onOpen?.(); group.open = true; }
  const box = control.closest('.content-field-item, .field, label') || control;
  box.classList.add('is-field-flash');
  setTimeout(() => box.classList.remove('is-field-flash'), 1700);
  try { control.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ }
  if (focus) { try { control.focus({ preventScroll: true }); } catch { /* ignore */ } }
}

export function inlineToolbarMarkup(on) {
  return `<button type="button" class="inline-edit-toggle ${on ? 'is-on' : ''}" data-inline-toggle aria-pressed="${on ? 'true' : 'false'}" title="Click text in the preview to edit it right on the page">✎ Edit on page</button>`;
}

export function inlineHintMarkup(on) {
  return `<p class="inline-edit-hint" data-inline-hint ${on ? '' : 'hidden'}>Click any outlined text in the preview to edit directly · Enter confirms · Esc cancels · green outlines jump to the matching tab</p>`;
}

const readText = el => String(el.textContent || '').replace(/\u200b/g, '');

export function liveNormalize(target, text) {
  let value = String(text);
  if (!target.multiline) value = value.replace(/\s*[\r\n]+\s*/g, ' ');
  if (target.max && value.length > target.max) value = value.slice(0, target.max);
  return value;
}

export function finalNormalize(target, text) {
  let value = String(text).replace(/\r/g, '');
  value = target.multiline
    ? value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : value.replace(/\s+/g, ' ').trim();
  if (target.max && value.length > target.max) value = value.slice(0, target.max).trimEnd();
  return value;
}

function setCaretEnd(doc, el) {
  try {
    const selection = doc.getSelection?.();
    if (!selection) return;
    const range = doc.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch { /* ignore */ }
}

function placeCaretAt(doc, el, x, y) {
  try {
    let range = null;
    if (typeof doc.caretRangeFromPoint === 'function') range = doc.caretRangeFromPoint(x, y);
    else if (typeof doc.caretPositionFromPoint === 'function') {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) {
        range = doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (range && el.contains(range.startContainer)) {
      const sel = doc.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  } catch { /* fallback */ }
  setCaretEnd(doc, el);
}

export function mountInlineEditing({
  doc = null,
  frame = null,
  ignoreSelector = '.live-site-editor-ui, dialog, #toast, .admin-layout',
  getTargets,
  onStart,
  onInput,
  onCommit,
  onPick,
  onState,
  enabled = true
}) {
  let on = Boolean(enabled);
  let disposed = false;
  let editing = null;
  let switchingTo = null;
  let switchTimer = null;
  let targetMap = new WeakMap();
  const bound = new WeakSet();

  const docOf = () => {
    if (doc) return doc;
    try { return frame?.contentDocument || null; } catch { return null; }
  };

  function ensureStyle(targetDoc) {
    if (!targetDoc.head || targetDoc.getElementById(STYLE_ID)) return;
    const style = targetDoc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = FRAME_CSS;
    targetDoc.head.appendChild(style);
  }

  function clearMarks(targetDoc) {
    targetDoc.querySelectorAll('[data-inline-editable]').forEach(el => {
      if (editing && el === editing.el) return;
      el.removeAttribute('data-inline-editable');
      el.removeAttribute('data-inline-kind');
      if (el.hasAttribute('data-inline-titled')) {
        el.removeAttribute('title');
        el.removeAttribute('data-inline-titled');
      }
    });
  }

  function mark() {
    const targetDoc = docOf();
    if (!targetDoc || !targetDoc.body || disposed) return;
    clearMarks(targetDoc);
    targetMap = new WeakMap();
    if (!on) return;
    const kind = targetDoc.body.getAttribute('data-page') || '';
    let targets = [];
    try { targets = getTargets?.() || []; } catch { targets = []; }
    for (const target of targets) {
      if (!target || !target.selector) continue;
      if (Array.isArray(target.kinds) && !target.kinds.includes(kind)) continue;
      let nodes;
      try { nodes = targetDoc.querySelectorAll(target.selector); } catch { continue; }
      const jump = target.type === 'pick' || target.type === 'goto';
      nodes.forEach(el => {
        if (targetMap.has(el)) return;
        if (ignoreSelector && el.closest?.(ignoreSelector)) return;
        if (!jump) {
          if (!target.allowChildren && el.children && el.children.length) return;
          if (!target.allowMismatch && !target.allowChildren && typeof target.value === 'string' && readText(el) !== target.value) return;
        }
        el.setAttribute('data-inline-editable', target.id);
        el.setAttribute('data-inline-kind', jump ? 'pick' : 'text');
        if (!el.hasAttribute('title')) {
          el.setAttribute('title', target.hint || (jump ? 'Click to jump to this setting in Admin' : 'Click to edit text'));
          el.setAttribute('data-inline-titled', '');
        }
        targetMap.set(el, target);
      });
    }
  }

  function mirror(targetDoc, source, target, text) {
    targetDoc.querySelectorAll('[data-inline-editable]').forEach(other => {
      if (other !== source && other.getAttribute('data-inline-editable') === target.id) {
        other.textContent = text;
      }
    });
  }

  function onBlur() { commit(); }

  function startEdit(targetDoc, el, target, x, y) {
    if (editing) commit();
    const originalHtml = target.allowChildren ? el.innerHTML : null;
    const original = target.allowChildren && typeof target.value === 'string' ? target.value : readText(el);
    editing = { el, target, original, originalHtml, cancelled: false, whiteSpace: el.style.whiteSpace || '' };
    if (target.allowChildren) el.textContent = original;
    el.setAttribute('data-inline-editing', 'true');
    el.setAttribute('contenteditable', 'plaintext-only');
    if (!el.isContentEditable) el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
    if (target.multiline) el.style.whiteSpace = 'pre-wrap';
    el.addEventListener('blur', onBlur);
    el.focus?.({ preventScroll: true });
    if (target.allowChildren) setCaretEnd(targetDoc, el);
    else placeCaretAt(targetDoc, el, x, y);
    onState?.(true);
    onStart?.(target, el);
  }

  function commit() {
    if (!editing) return;
    const { el, target, original, originalHtml, cancelled, whiteSpace } = editing;
    editing = null;
    el.removeEventListener('blur', onBlur);
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
    el.removeAttribute('data-inline-editing');
    if (whiteSpace) el.style.whiteSpace = whiteSpace;
    else el.style.removeProperty?.('white-space');
    if (el.getAttribute('style') === '') el.removeAttribute('style');
    let text = cancelled ? original : finalNormalize(target, readText(el));
    if (target.required && !text) text = original;
    if (cancelled && originalHtml !== null) el.innerHTML = originalHtml;
    else el.textContent = text;
    const targetDoc = el.ownerDocument;
    if (targetDoc) mirror(targetDoc, el, target, text);
    const switching = Boolean(switchingTo);
    switchingTo = null;
    clearTimeout(switchTimer);
    try { onCommit?.(target, text, { changed: text !== original, switching }); } finally { onState?.(false); }
  }

  function cancel() {
    if (!editing) return;
    editing.cancelled = true;
    editing.el.textContent = editing.original;
    commit();
  }

  function bindDoc(targetDoc) {
    if (bound.has(targetDoc)) return;
    bound.add(targetDoc);
    ensureStyle(targetDoc);

    targetDoc.addEventListener('mousedown', event => {
      if (disposed || !on || !editing) return;
      if (ignoreSelector && event.target?.closest?.(ignoreSelector)) { switchingTo = null; return; }
      const next = event.target?.closest?.('[data-inline-editable]');
      if (next && next !== editing.el) {
        switchingTo = next;
        clearTimeout(switchTimer);
        switchTimer = setTimeout(() => { switchingTo = null; }, 450);
      } else {
        switchingTo = null;
      }
    }, true);

    targetDoc.addEventListener('click', event => {
      if (disposed || !on) return;
      if (ignoreSelector && event.target?.closest?.(ignoreSelector)) return;
      const el = event.target?.closest?.('[data-inline-editable]');
      if (!el) return;
      const target = targetMap.get(el);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      if (target.type === 'pick' || target.type === 'goto') {
        if (editing) commit();
        onPick?.(target, el);
        return;
      }
      if (editing && editing.el === el) return;
      startEdit(targetDoc, el, target, event.clientX, event.clientY);
    }, true);

    targetDoc.addEventListener('input', event => {
      if (!editing || event.target !== editing.el) return;
      const normalized = liveNormalize(editing.target, readText(editing.el));
      mirror(targetDoc, editing.el, editing.target, normalized);
      onInput?.(editing.target, normalized);
    });

    targetDoc.addEventListener('keydown', event => {
      if (!editing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
        return;
      }
      if (event.key === 'Enter' && (!editing.target.multiline || event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commit();
      }
    });
  }

  function refresh() {
    const targetDoc = docOf();
    if (!targetDoc || disposed) return;
    bindDoc(targetDoc);
    ensureStyle(targetDoc);
    mark();
  }

  return {
    refresh,
    setEnabled(next) {
      on = Boolean(next);
      if (!on && editing) commit();
      refresh();
    },
    isEnabled: () => on,
    isEditing: () => Boolean(editing),
    commit,
    cancel,
    dispose() {
      disposed = true;
      if (editing) commit();
      const targetDoc = docOf();
      if (targetDoc) clearMarks(targetDoc);
    }
  };
}

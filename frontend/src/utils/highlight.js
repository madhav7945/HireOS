// ============================================================
// Tiny dependency-free syntax highlighter for the interview editor.
//
// Renders code to HTML spans that sit BEHIND a transparent-text <textarea>, so we
// get real syntax colours with zero libraries (no Monaco/CodeMirror/Prism). It is
// deliberately approximate — good enough to read at a glance, never a compiler.
// ============================================================

const KEYWORDS = {
  javascript: ['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','class','extends','super','this','typeof','instanceof','in','of','try','catch','finally','throw','async','await','yield','import','from','export','default','delete','void','null','undefined','true','false','NaN'],
  python: ['def','return','if','elif','else','for','while','break','continue','class','import','from','as','try','except','finally','raise','with','lambda','yield','global','nonlocal','pass','and','or','not','in','is','None','True','False','self','async','await','assert','del'],
  java: ['public','private','protected','static','final','void','class','interface','extends','implements','new','return','if','else','for','while','do','switch','case','break','continue','this','super','try','catch','finally','throw','throws','import','package','int','long','double','float','boolean','char','byte','short','String','var','null','true','false','instanceof','abstract','enum'],
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Per-language master regex. Order of alternation = precedence (comments/strings win).
function buildRegex(language) {
  const comment = language === 'python'
    ? `#[^\\n]*`
    : `\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/`
  const triple = language === 'python' ? `"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|` : ''
  const string = `${triple}"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'` + (language === 'javascript' ? `|\`(?:\\\\.|[^\`\\\\])*\`` : '')
  const number = `\\b\\d+(?:\\.\\d+)?\\b`
  const ident = `[A-Za-z_$][A-Za-z0-9_$]*`
  return new RegExp(`(${comment})|(${string})|(${number})|(${ident})`, 'g')
}

const _regexCache = {}

/**
 * Return highlighted HTML for `code`. A trailing newline is preserved so the
 * overlay's height matches the textarea exactly (prevents scroll drift).
 */
export function highlightCode(code, language = 'javascript') {
  const src = String(code ?? '')
  if (!src) return ''
  const kw = new Set(KEYWORDS[language] || KEYWORDS.javascript)
  const re = _regexCache[language] || (_regexCache[language] = buildRegex(language))
  re.lastIndex = 0

  let out = ''
  let last = 0
  let m
  while ((m = re.exec(src))) {
    if (m.index > last) out += escapeHtml(src.slice(last, m.index))
    const [full, comment, string, number, ident] = m
    if (comment != null) out += `<span class="tok-com">${escapeHtml(full)}</span>`
    else if (string != null) out += `<span class="tok-str">${escapeHtml(full)}</span>`
    else if (number != null) out += `<span class="tok-num">${escapeHtml(full)}</span>`
    else if (ident != null) {
      if (kw.has(ident)) out += `<span class="tok-kw">${escapeHtml(ident)}</span>`
      // a name immediately followed by "(" is a function/method call
      else if (src[re.lastIndex] === '(') out += `<span class="tok-fn">${escapeHtml(ident)}</span>`
      else out += escapeHtml(ident)
    }
    last = re.lastIndex
  }
  if (last < src.length) out += escapeHtml(src.slice(last))
  return out
}

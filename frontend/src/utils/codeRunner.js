// ============================================================
// Sandboxed JavaScript runner for the interview code editor.
//
// Runs the candidate's code inside a Web Worker (isolated from the page) with a
// hard timeout, so an infinite loop or a throw can't freeze the interview tab.
// Returns structured results the UI renders AND the AI interviewer reacts to.
// ============================================================

const WORKER_SRC = `
self.onmessage = function (e) {
  var code = e.data.code, fnName = e.data.fnName, tests = e.data.tests || []
  var logs = []
  var sandboxConsole = { log: function () {
    logs.push(Array.prototype.slice.call(arguments).map(function (x) {
      try { return typeof x === 'object' ? JSON.stringify(x) : String(x) } catch (_) { return String(x) }
    }).join(' '))
  } }
  try {
    var factory = new Function('console', code + '\\n;return typeof ' + fnName + " === 'function' ? " + fnName + ' : undefined;')
    var fn = factory(sandboxConsole)
    if (typeof fn !== 'function') {
      self.postMessage({ ok: false, error: 'Could not find a function named "' + fnName + '". Make sure your function is named exactly that.', logs: logs })
      return
    }
    if (!tests.length) {
      self.postMessage({ ok: true, logs: logs, results: [], note: 'Code ran without errors. (No automated tests for this problem.)' })
      return
    }
    var results = tests.map(function (t) {
      var actual = null, error = null, pass = false
      try { actual = fn.apply(null, JSON.parse(JSON.stringify(t.args))) } catch (err) { error = err && err.message ? err.message : String(err) }
      if (error === null) {
        if (t.expectedAnyOf) pass = t.expectedAnyOf.some(function (v) { return JSON.stringify(v) === JSON.stringify(actual) })
        else pass = JSON.stringify(t.expected) === JSON.stringify(actual)
      }
      return {
        args: t.args,
        expected: t.expectedAnyOf ? t.expectedAnyOf : t.expected,
        expectedAnyOf: !!t.expectedAnyOf,
        actual: actual,
        pass: pass,
        error: error,
      }
    })
    self.postMessage({ ok: results.every(function (r) { return r.pass }), logs: logs, results: results })
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.message ? err.message : String(err), logs: logs })
  }
}
`

/**
 * Run JavaScript against a problem's test cases inside a sandboxed worker.
 * @returns {Promise<{ok, results?, logs, error?, note?, timedOut?}>}
 */
export function runJavaScript({ code, fnName, tests }, { timeoutMs = 4000 } = {}) {
  // Direct fallback if running in an environment without Web Worker support (e.g. JSDOM/Node/Vitest)
  if (typeof Worker === 'undefined') {
    const logs = []
    const sandboxConsole = {
      log: function () {
        logs.push(Array.prototype.slice.call(arguments).map(function (x) {
          try { return typeof x === 'object' ? JSON.stringify(x) : String(x) } catch (_) { return String(x) }
        }).join(' '))
      }
    }
    try {
      const factory = new Function('console', code + '\n;return typeof ' + fnName + " === 'function' ? " + fnName + ' : undefined;')
      const fn = factory(sandboxConsole)
      if (typeof fn !== 'function') {
        return Promise.resolve({ ok: false, error: 'Could not find a function named "' + fnName + '".', logs })
      }
      const results = (tests || []).map(function (t) {
        let actual = null, error = null, pass = false
        try { actual = fn.apply(null, JSON.parse(JSON.stringify(t.args))) } catch (err) { error = err && err.message ? err.message : String(err) }
        if (error === null) {
          if (t.expectedAnyOf) pass = t.expectedAnyOf.some(function (v) { return JSON.stringify(v) === JSON.stringify(actual) })
          else pass = JSON.stringify(t.expected) === JSON.stringify(actual)
        }
        return {
          args: t.args,
          expected: t.expectedAnyOf ? t.expectedAnyOf : t.expected,
          expectedAnyOf: !!t.expectedAnyOf,
          actual: actual,
          pass: pass,
          error: error,
        }
      })
      return Promise.resolve({ ok: results.every(function (r) { return r.pass }), logs: logs, results: results })
    } catch (err) {
      return Promise.resolve({ ok: false, error: err && err.message ? err.message : String(err), logs: logs })
    }
  }

  return new Promise((resolve) => {
    let worker
    let url
    try {
      const blob = new Blob([WORKER_SRC], { type: 'application/javascript' })
      url = URL.createObjectURL(blob)
      worker = new Worker(url)
    } catch (e) {
      resolve({ ok: false, error: 'Code sandbox unavailable: ' + (e?.message || e), logs: [] })
      return
    }


    const cleanup = () => {
      try { worker.terminate() } catch (_) {}
      if (url) URL.revokeObjectURL(url)
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve({ ok: false, timedOut: true, error: 'Execution timed out after ' + (timeoutMs / 1000) + 's (possible infinite loop).', logs: [] })
    }, timeoutMs)

    worker.onmessage = (e) => { clearTimeout(timer); cleanup(); resolve(e.data) }
    worker.onerror = (e) => { clearTimeout(timer); cleanup(); resolve({ ok: false, error: e?.message || 'Worker error', logs: [] }) }

    worker.postMessage({ code, fnName, tests: tests || [] })
  })
}

// ============================================================
// Multi-language execution via the public Piston API (no key, no install).
// JavaScript still runs locally in the Web Worker above (instant, offline-safe);
// Python / Java / others are compiled & run remotely, then graded here so the
// pass/fail verdict is identical across languages.
// ============================================================

const PISTON_URL = 'https://emkc.org/api/v2/piston'

// Piston needs an explicit runtime version. Fetched once and cached.
let _pistonRuntimes = null
async function pistonVersion(language) {
  if (!_pistonRuntimes) {
    const res = await fetch(`${PISTON_URL}/runtimes`)
    if (!res.ok) throw new Error('Could not reach the code runner (Piston).')
    _pistonRuntimes = await res.json()
  }
  const match = _pistonRuntimes.find(r => r.language === language || (r.aliases || []).includes(language))
  if (!match) throw new Error(`Language "${language}" is not available on the runner.`)
  return { language: match.language, version: match.version }
}

// camelCase → snake_case (so a Python file defining two_sum is found for fnName twoSum).
function snake(s) { return String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() }

// JSON → a Java literal expression, inferring the type from the value. Covers the
// shapes our questions use: ints, doubles, booleans, strings, and arrays thereof.
function javaLiteral(v) {
  if (v === null) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : `${v}d`
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) {
    if (!v.length) return 'new int[]{}'
    const t = typeof v[0]
    if (Array.isArray(v[0])) return `new int[][]{${v.map(javaLiteral).join(', ')}}`
    if (t === 'string') return `new String[]{${v.map(javaLiteral).join(', ')}}`
    if (t === 'boolean') return `new boolean[]{${v.map(javaLiteral).join(', ')}}`
    if (v.some(x => !Number.isInteger(x))) return `new double[]{${v.map(x => x + 'd').join(', ')}}`
    return `new int[]{${v.join(', ')}}`
  }
  return JSON.stringify(String(v))
}

// Build a full source file = candidate code + a harness that runs every test and
// prints one machine-readable line: __RESULTS__[{"actual":...,"error":...}, ...].
function buildHarness(language, code, fnName, tests) {
  const names = [...new Set([fnName, snake(fnName)].filter(Boolean))]
  if (language === 'python') {
    return `${code}

import json as __json, sys as __sys
__tests = __json.loads(${JSON.stringify(JSON.stringify(tests.map(t => t.args)))})
__fn = None
for __n in (${names.map(n => JSON.stringify(n)).join(', ')}, ):
    __g = globals().get(__n)
    if callable(__g):
        __fn = __g; break
if __fn is None:
    print("__NOFN__" + ${JSON.stringify(JSON.stringify(names))})
    __sys.exit(0)
__out = []
for __t in __tests:
    try:
        __r = __fn(*__t)
        try: __json.dumps(__r)
        except Exception: __r = str(__r)
        __out.append({"actual": __r, "error": None})
    except Exception as __e:
        __out.append({"actual": None, "error": str(__e)})
print("__RESULTS__" + __json.dumps(__out))
`
  }
  if (language === 'java') {
    const calls = tests.map((t, i) => {
      const argList = (t.args || []).map(javaLiteral).join(', ')
      return `    try { Object __r = __invoke(__sol, "${fnName}", new Object[]{${(t.args || []).map(javaLiteral).join(', ')}}); __out.add("{\\"actual\\":" + __json(__r) + ",\\"error\\":null}"); }
    catch (Throwable __e) { Throwable __c = (__e.getCause()!=null?__e.getCause():__e); __out.add("{\\"actual\\":null,\\"error\\":" + __q(String.valueOf(__c.getMessage())) + "}"); }`
    }).join('\n')
    return `import java.util.*;
import java.lang.reflect.*;

${code}

public class Main {
  public static void main(String[] __a) throws Exception {
    Object __sol = Solution.class.getDeclaredConstructor().newInstance();
    List<String> __out = new ArrayList<>();
${calls}
    System.out.println("__RESULTS__[" + String.join(",", __out) + "]");
  }
  static Object __invoke(Object sol, String name, Object[] args) throws Exception {
    for (Method m : sol.getClass().getDeclaredMethods()) {
      if (m.getName().equals(name) && m.getParameterCount()==args.length) { m.setAccessible(true); return m.invoke(sol, args); }
    }
    throw new NoSuchMethodException("No method named " + name);
  }
  static String __q(String s) { if (s==null) return "null"; StringBuilder b=new StringBuilder("\\""); for(char c: s.toCharArray()){ if(c=='\\"'||c=='\\\\') b.append('\\\\'); b.append(c);} return b.append("\\"").toString(); }
  static String __json(Object o) {
    if (o==null) return "null";
    if (o instanceof int[]) return Arrays.toString((int[])o).replace(" ", "");
    if (o instanceof long[]) return Arrays.toString((long[])o).replace(" ", "");
    if (o instanceof double[]) return Arrays.toString((double[])o).replace(" ", "");
    if (o instanceof boolean[]) return Arrays.toString((boolean[])o).replace(" ", "");
    if (o instanceof Object[]) { StringBuilder b=new StringBuilder("["); Object[] arr=(Object[])o; for(int i=0;i<arr.length;i++){ if(i>0)b.append(","); b.append(__json(arr[i])); } return b.append("]").toString(); }
    if (o instanceof String) return __q((String)o);
    if (o instanceof Boolean || o instanceof Number) return String.valueOf(o);
    return __q(String.valueOf(o));
  }
}
`
  }
  // Fallback: run as-is and just surface stdout (no automated grading).
  return code
}

const PISTON_EXT = { python: 'main.py', java: 'Main.java', cpp: 'main.cpp', c: 'main.c', go: 'main.go', ruby: 'main.rb', typescript: 'main.ts' }

/**
 * Run non-JS code remotely on Piston and grade it against the test cases.
 * @returns {Promise<{ok, results?, logs, error?, note?, remote?}>}
 */
export async function runViaPiston({ code, fnName, tests = [], language }, { timeoutMs = 8000 } = {}) {
  let runtime
  try { runtime = await pistonVersion(language) }
  catch (e) { return { ok: false, error: e.message, logs: [], remote: true } }

  const graded = tests.length > 0 && (language === 'python' || language === 'java')
  const source = graded ? buildHarness(language, code, fnName, tests) : code

  let data
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(`${PISTON_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: PISTON_EXT[language] || 'main.txt', content: source }],
        run_timeout: Math.max(3000, timeoutMs - 1000),
        compile_timeout: 10000,
      }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) return { ok: false, error: `Runner error (${res.status}).`, logs: [], remote: true }
    data = await res.json()
  } catch (e) {
    return { ok: false, error: e?.name === 'AbortError' ? 'Remote execution timed out.' : 'Could not reach the code runner.', logs: [], remote: true }
  }

  const compileErr = data.compile && data.compile.code !== 0 ? (data.compile.stderr || data.compile.output || '') : ''
  const run = data.run || {}
  const stdout = String(run.stdout || run.output || '')
  const stderr = String(run.stderr || '')
  const logs = stdout.split('\n').filter(l => l && !l.startsWith('__RESULTS__') && !l.startsWith('__NOFN__'))

  if (compileErr) return { ok: false, error: compileErr.slice(0, 600), logs, remote: true }

  if (!graded) {
    // No automated grading for this language — just surface what the program printed.
    if (stderr && run.code !== 0) return { ok: false, error: stderr.slice(0, 600), logs, remote: true }
    return { ok: true, results: [], logs, remote: true, note: 'Code ran on the remote runner. (Automated test grading isn’t available for this language — output shown above.)' }
  }

  const marker = stdout.split('\n').find(l => l.startsWith('__RESULTS__'))
  if (!marker) {
    const noFn = stdout.split('\n').find(l => l.startsWith('__NOFN__'))
    if (noFn) {
      // The candidate's program ran fine but never defined the question's function
      // (e.g. they're just experimenting with print). This is NOT an error — show
      // whatever they printed and gently point them at the function to implement.
      let names = []
      try { names = JSON.parse(noFn.slice('__NOFN__'.length)) } catch (_) {}
      const want = names[0] || fnName
      return { ok: true, results: [], logs, remote: true, note: `Your code ran. To run the tests, define a function named ${want}(...).` }
    }
    // A real runtime crash (stderr + non-zero exit) stays an error; otherwise the
    // program simply produced no gradable output — surface its stdout, not a scare.
    if (stderr && run.code !== 0) return { ok: false, error: stderr.slice(0, 600), logs, remote: true }
    return { ok: true, results: [], logs, remote: true, note: `Your code ran. To run the tests, define a function named ${fnName}(...).` }
  }

  let actuals
  try { actuals = JSON.parse(marker.slice('__RESULTS__'.length)) }
  catch (_) { return { ok: false, error: 'Could not read the run results.', logs, remote: true } }

  const results = tests.map((t, i) => {
    const a = actuals[i] || {}
    const actual = a.actual ?? null
    const error = a.error || null
    let pass = false
    if (!error) {
      if (t.expectedAnyOf) pass = t.expectedAnyOf.some(v => JSON.stringify(v) === JSON.stringify(actual))
      else pass = JSON.stringify(t.expected) === JSON.stringify(actual)
    }
    return { args: t.args, expected: t.expectedAnyOf ? t.expectedAnyOf : t.expected, expectedAnyOf: !!t.expectedAnyOf, actual, pass, error }
  })
  return { ok: results.every(r => r.pass), results, logs, remote: true }
}

/**
 * Unified entry point — routes JavaScript to the local sandbox, everything else
 * to the remote runner. Same result shape either way.
 */
export function runCode({ code, fnName, tests, language }, opts = {}) {
  if (language === 'javascript') return runJavaScript({ code, fnName, tests }, opts)
  return runViaPiston({ code, fnName, tests, language }, opts)
}

// Pretty-print a value for console display.
export function fmtValue(v) {
  if (typeof v === 'string') return JSON.stringify(v)
  try { return JSON.stringify(v) } catch (_) { return String(v) }
}

/**
 * Render a run result into terminal-style text for the console panel.
 */
export function formatRunOutput(result) {
  if (!result) return ''
  const lines = []
  if (result.logs?.length) {
    lines.push('— console —')
    result.logs.forEach((l) => lines.push(l))
    lines.push('')
  }
  if (result.error) {
    lines.push('❌ Error: ' + result.error)
    return lines.join('\n')
  }
  if (result.note && (!result.results || result.results.length === 0)) {
    lines.push('✅ ' + result.note)
    return lines.join('\n')
  }
  if (result.results?.length) {
    let passed = 0
    result.results.forEach((r, i) => {
      const argStr = r.args.map(fmtValue).join(', ')
      if (r.error) {
        lines.push(`✖ Test ${i + 1}  (${argStr})  →  threw: ${r.error}`)
      } else {
        const expStr = r.expectedAnyOf ? `one of ${fmtValue(r.expected)}` : fmtValue(r.expected)
        lines.push(`${r.pass ? '✔' : '✖'} Test ${i + 1}  (${argStr})  →  got ${fmtValue(r.actual)}  (expected ${expStr})`)
        if (r.pass) passed++
      }
    })
    lines.push('')
    lines.push(`${passed}/${result.results.length} tests passed`)
  }
  return lines.join('\n')
}

/**
 * A short, human summary of a run for the AI interviewer to react to.
 */
export function summarizeRun(result) {
  if (!result) return ''
  if (result.timedOut) return 'The code timed out — likely an infinite loop.'
  if (result.error) return `The code threw an error: ${result.error}`
  if (result.results?.length) {
    const passed = result.results.filter((r) => r.pass).length
    const total = result.results.length
    if (passed === total) return `All ${total} test cases passed.`
    const firstFail = result.results.find((r) => !r.pass)
    const detail = firstFail
      ? ` First failing case: input ${firstFail.args.map(fmtValue).join(', ')} returned ${fmtValue(firstFail.actual)}${firstFail.error ? ` (error: ${firstFail.error})` : ''}.`
      : ''
    return `${passed} of ${total} test cases passed.${detail}`
  }
  if (result.note) return result.note
  return 'The code ran.'
}

// ============================================================
// Computer-vision proctoring via TensorFlow.js + COCO-SSD object detection.
//
// COCO-SSD (https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) is a
// ready-made, in-browser object detector. Unlike face-landmark detection it is
// robust at spotting the things that actually matter for exam integrity:
//   - "person"      → presence (reliable) + multiple people in frame
//   - "cell phone"  → phone / second-screen cheating  ← the key signal
//   - "laptop", "tv", "book", "remote" → other suspicious devices
//
// Models load lazily from a CDN (no build dependency, no bundled weights). If
// anything fails to load (offline / blocked), start() resolves to a no-op so the
// interview still runs — proctoring just degrades gracefully.
// ============================================================

const TFJS_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
const COCOSSD_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'

const PHONE_CLASS = 'cell phone'
// Only flag genuine "second screen" devices. Keyboard / book / remote / monitor are
// normal on a developer's desk (and COCO-SSD mislabels them constantly), so they are
// deliberately excluded to keep the candidate from being nagged about their own desk.
const DEVICE_CLASSES = new Set(['laptop', 'tv'])
// Confidence floors. PERSON is intentionally forgiving (a head-turn or dim room should
// NOT read as "candidate absent"); PHONE is strict because a low bar makes COCO-SSD
// label mugs, wallets, remotes and even a hand as a phone — the #1 false alarm.
const PERSON_THRESHOLD = 0.5
const PHONE_THRESHOLD = 0.65
const DEVICE_THRESHOLD = 0.6

let modelPromise = null

function loadScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) return resolve(window[globalName])
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.crossOrigin = 'anonymous'
    s.onload = () => (window[globalName] ? resolve(window[globalName]) : reject(new Error(globalName + ' missing after load')))
    s.onerror = () => reject(new Error('Failed to load ' + src))
    document.head.appendChild(s)
  })
}

async function ensureModel() {
  if (modelPromise) return modelPromise
  modelPromise = (async () => {
    await loadScript(TFJS_CDN, 'tf')
    const cocoSsd = await loadScript(COCOSSD_CDN, 'cocoSsd')
    try { await window.tf.setBackend('webgl') } catch (_) {}
    await window.tf.ready()
    // lite_mobilenet_v2 is small + fast, good for a webcam loop.
    return cocoSsd.load({ base: 'lite_mobilenet_v2' })
  })()
  return modelPromise
}

/**
 * Begin CV proctoring on a <video> element.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {(status:{ faceDetected:boolean, personCount:number, multiplePeople:boolean,
 *                   phoneDetected:boolean, suspiciousObjects:string[] }) => void} onStatus
 * @param {{ intervalMs?:number, onReady?:Function, onUnavailable?:(e:Error)=>void }} [opts]
 * @returns {Promise<() => void>} stop()
 */
export async function startFaceProctor(videoEl, onStatus, opts = {}) {
  const { intervalMs = 1300, onReady, onUnavailable } = opts
  let model
  try {
    model = await ensureModel()
  } catch (err) {
    onUnavailable?.(err)
    return () => {}
  }

  onReady?.()
  let stopped = false
  let running = false

  // --- Temporal debouncing ---------------------------------------------------
  // COCO-SSD is a per-frame detector: it routinely drops the "person" box for a
  // single frame on a head-turn or blink, and momentarily hallucinates a "phone"
  // or a second "person" from a shadow. Reporting any of those raw would spam the
  // candidate with false integrity alerts. So a signal only flips AFTER it has
  // held the new value for N consecutive ticks. `reported` is what the caller
  // sees; `streak` counts how long the raw reading has disagreed with it.
  const CONFIRM = { absent: 3, multiple: 3, phone: 2 } // ticks (~1.3s each)
  const reported = { faceDetected: true, multiplePeople: false, phoneDetected: false }
  const streak = { absent: 0, multiple: 0, phone: 0 }
  const deviceStreak = {} // class name -> consecutive ticks seen

  // Flip reported[key] to rawValue only once it has persisted `need` ticks.
  const debounce = (key, sKey, rawValue, need) => {
    if (rawValue === reported[key]) { streak[sKey] = 0; return }
    streak[sKey] += 1
    if (streak[sKey] >= need) { reported[key] = rawValue; streak[sKey] = 0 }
  }

  const tick = async () => {
    if (stopped || running) return
    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return
    running = true
    try {
      const preds = await model.detect(videoEl, 20)
      const persons = preds.filter((p) => p.class === 'person' && p.score >= PERSON_THRESHOLD)
      const rawCount = persons.length
      const rawPhone = preds.some((p) => p.class === PHONE_CLASS && p.score >= PHONE_THRESHOLD)
      const rawDevices = new Set(
        preds.filter((p) => DEVICE_CLASSES.has(p.class) && p.score >= DEVICE_THRESHOLD).map((p) => p.class),
      )

      // Confirm each integrity signal across consecutive frames before reporting.
      debounce('faceDetected', 'absent', rawCount >= 1, CONFIRM.absent)
      debounce('multiplePeople', 'multiple', rawCount > 1, CONFIRM.multiple)
      debounce('phoneDetected', 'phone', rawPhone, CONFIRM.phone)

      // Devices: each class must persist a couple of frames before it counts.
      for (const c of rawDevices) deviceStreak[c] = (deviceStreak[c] || 0) + 1
      for (const c of Object.keys(deviceStreak)) if (!rawDevices.has(c)) deviceStreak[c] = 0
      const suspicious = Object.keys(deviceStreak).filter((c) => deviceStreak[c] >= 2)

      // Smoothed count: don't surface "2 people" until that's actually confirmed.
      const personCount = !reported.faceDetected ? 0 : reported.multiplePeople ? Math.max(2, rawCount) : 1

      onStatus({
        faceDetected: reported.faceDetected,
        personCount,
        multiplePeople: reported.multiplePeople,
        phoneDetected: reported.phoneDetected,
        suspiciousObjects: suspicious,
      })
    } catch (_) {
      /* transient inference error — ignore */
    } finally {
      running = false
    }
  }

  const id = setInterval(tick, intervalMs)
  tick()

  return () => { stopped = true; clearInterval(id) }
}

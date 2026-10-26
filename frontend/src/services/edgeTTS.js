// ============================================================
// Microsoft Edge Neural Text-to-Speech (Client-Side)
// High-fidelity natural female neural voices (Jenny Neural / Aria Neural)
// Works seamlessly in ANY browser (Chrome, Edge, Firefox, Safari, Brave).
// ============================================================

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}`

let activeAudioElement = null

/**
 * Synthesizes speech using Microsoft Edge Neural TTS over native WebSocket.
 * Returns an Audio element promise that plays the neural MP3.
 */
export async function synthesizeEdgeNeuralSpeech(text, {
  voice = 'en-US-JennyNeural', // 'en-US-JennyNeural' | 'en-US-AriaNeural'
  rate = '+0%',
  pitch = '+0%'
} = {}) {
  const clean = String(text || '').replace(/\[\[.*?\]\]/g, '').replace(/[*_~`#]/g, '').trim()
  if (!clean) return null

  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(WSS_URL)
      ws.binaryType = 'arraybuffer'
      const audioChunks = []
      let timedOut = false

      const timer = setTimeout(() => {
        timedOut = true
        try { ws.close() } catch (_) {}
        reject(new Error('Edge TTS request timed out'))
      }, 7000)

      ws.onopen = () => {
        const reqId = Date.now().toString(16)
        const configMsg = `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                }
              }
            }
          })
        ws.send(configMsg)

        // Clean SSML escaping
        const escapedText = clean
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')

        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
          `<voice name='${voice}'><prosody rate='${rate}' pitch='${pitch}'>${escapedText}</prosody></voice></speak>`

        const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`
        ws.send(ssmlMsg)
      }

      ws.onmessage = (e) => {
        if (timedOut) return
        if (typeof e.data === 'string') {
          if (e.data.includes('Path:turn.end')) {
            clearTimeout(timer)
            try { ws.close() } catch (_) {}
            if (audioChunks.length === 0) {
              reject(new Error('No audio returned'))
              return
            }
            const blob = new Blob(audioChunks, { type: 'audio/mp3' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            resolve(audio)
          }
        } else if (e.data instanceof ArrayBuffer) {
          const view = new DataView(e.data)
          if (view.byteLength >= 2) {
            const headerLen = view.getUint16(0)
            if (view.byteLength > headerLen + 2) {
              const audioSlice = e.data.slice(headerLen + 2)
              audioChunks.push(audioSlice)
            }
          }
        }
      }

      ws.onerror = (err) => {
        clearTimeout(timer)
        reject(err)
      }
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Play Edge Neural speech in any browser with instant audio element management.
 */
export async function playEdgeNeural(text, {
  voice = 'en-US-JennyNeural',
  onEnd = null
} = {}) {
  try {
    if (activeAudioElement) {
      try {
        activeAudioElement.pause()
        activeAudioElement.currentTime = 0
      } catch (_) {}
      activeAudioElement = null
    }

    const audio = await synthesizeEdgeNeuralSpeech(text, { voice })
    if (!audio) {
      onEnd?.()
      return false
    }

    activeAudioElement = audio
    audio.onended = () => {
      activeAudioElement = null
      onEnd?.()
    }
    audio.onerror = () => {
      activeAudioElement = null
      onEnd?.()
    }

    await audio.play()
    return true
  } catch (err) {
    console.warn('[EdgeTTS] Falling back to Web SpeechSynthesis:', err?.message || err)
    return false
  }
}

export function stopEdgeNeural() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause()
      activeAudioElement.currentTime = 0
    } catch (_) {}
    activeAudioElement = null
  }
}

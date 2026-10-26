import React, { useEffect, useRef } from 'react'
import './AudioWaveform.css'

export default function AudioWaveform({
  stream = null,
  isSpeaking = false,
  mode = 'idle', // 'candidate' | 'ai' | 'idle'
  color = '#6C5CE7',
  height = 36,
  bars = 28,
}) {
  const canvasRef = useRef(null)
  const animIdRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)

  // Setup Web Audio API analyser for live microphone stream
  useEffect(() => {
    if (!stream || mode !== 'candidate') {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch (_) {}
      }
      return
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser

        const source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        sourceRef.current = source
      }
    } catch (err) {
      console.warn('[AudioWaveform] Web Audio init error:', err)
    }

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch (_) {}
      }
    }
  }, [stream, mode])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let phase = 0

    const render = () => {
      const width = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, width, h)

      const barWidth = Math.max(2, (width / bars) - 2)
      const centerY = h / 2

      let dataArray = null
      if (analyserRef.current && mode === 'candidate' && isSpeaking) {
        const bufferLength = analyserRef.current.frequencyBinCount
        dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)
      }

      phase += 0.08

      for (let i = 0; i < bars; i++) {
        let barHeight = 4

        if (mode === 'ai' && isSpeaking) {
          // Synthetic dynamic wave for AI speech
          const wave1 = Math.sin(phase + i * 0.35) * 0.5 + 0.5
          const wave2 = Math.cos(phase * 1.4 + i * 0.2) * 0.5 + 0.5
          const envelope = Math.sin((i / bars) * Math.PI) // center heavier
          barHeight = 4 + (wave1 * 0.6 + wave2 * 0.4) * (h - 8) * envelope
        } else if (dataArray && mode === 'candidate') {
          // Real microphone amplitude
          const index = Math.floor((i / bars) * (dataArray.length / 2))
          const val = dataArray[index] || 0
          barHeight = Math.max(4, (val / 255) * (h - 6))
        } else if (isSpeaking) {
          // General active speaking
          const wave = Math.sin(phase + i * 0.4) * 0.5 + 0.5
          barHeight = 4 + wave * (h * 0.5)
        } else {
          // Idle breathing pulse
          const breathe = Math.sin(phase * 0.4 + (i / bars) * Math.PI) * 2 + 3
          barHeight = Math.max(3, breathe)
        }

        const x = i * (barWidth + 2) + 1
        const y = centerY - barHeight / 2

        // Gradient styling
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        if (mode === 'ai') {
          gradient.addColorStop(0, '#a29bfe')
          gradient.addColorStop(1, '#6C5CE7')
        } else if (mode === 'candidate') {
          gradient.addColorStop(0, '#55efc4')
          gradient.addColorStop(1, '#00B894')
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)')
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 2)
        } else {
          ctx.rect(x, y, barWidth, barHeight)
        }
        ctx.fill()
      }

      animIdRef.current = requestAnimationFrame(render)
    }

    animIdRef.current = requestAnimationFrame(render)

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
    }
  }, [bars, isSpeaking, mode, color])

  return (
    <div className={`audio-waveform-container ${isSpeaking ? 'active' : ''} mode-${mode}`}>
      <canvas
        ref={canvasRef}
        width={bars * 6}
        height={height}
        className="audio-waveform-canvas"
      />
    </div>
  )
}

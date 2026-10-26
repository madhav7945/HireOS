import { describe, it, expect } from 'vitest'
import { avatarColor } from './avatar'

describe('avatarColor', () => {
  it('returns a hex color from the palette', () => {
    expect(avatarColor('Sarah Chen')).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('is deterministic for the same seed', () => {
    expect(avatarColor('Arjun Patel')).toBe(avatarColor('Arjun Patel'))
  })

  it('accepts numeric seeds and stays within the palette', () => {
    for (const seed of [0, 1, 7, 42, 999]) {
      expect(avatarColor(seed)).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('defaults to a valid color with no seed', () => {
    expect(avatarColor()).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

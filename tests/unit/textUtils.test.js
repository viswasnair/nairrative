import { describe, it, expect } from 'vitest'
import {
  levenshtein,
  sanitizePromptInput,
  sanitizeShortInput,
  sanitizeCoverUrl,
  fuzzyMatches,
} from '../../src/lib/textUtils.js'

// ── levenshtein ───────────────────────────────────────────────────────────────

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0)
  })

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0)
  })

  it('returns full length when one string is empty', () => {
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
  })

  it('returns 1 for a single substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1)
  })

  it('returns 1 for a single insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1)
  })

  it('returns 1 for a single deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1)
  })

  it('returns correct distance for multi-edit strings', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('saturday', 'sunday')).toBe(3)
  })
})

// ── sanitizePromptInput ───────────────────────────────────────────────────────

describe('sanitizePromptInput', () => {
  it('preserves normal ASCII text', () => {
    expect(sanitizePromptInput('Hello world')).toBe('Hello world')
  })

  it('preserves newlines and tabs', () => {
    expect(sanitizePromptInput('line1\nline2\ttabbed')).toBe('line1\nline2\ttabbed')
  })

  it('strips null bytes and other control chars below 0x09', () => {
    expect(sanitizePromptInput('\x00\x01\x07hello')).toBe('hello')
  })

  it('strips \x0b (vertical tab) and \x0c (form feed)', () => {
    expect(sanitizePromptInput('he\x0bllo\x0c')).toBe('hello')
  })

  it('strips control chars 0x0e–0x1f', () => {
    expect(sanitizePromptInput('he\x0ello\x1f')).toBe('hello')
  })

  it('strips DEL (0x7f)', () => {
    expect(sanitizePromptInput('hel\x7flo')).toBe('hello')
  })

  it('truncates at 500 characters by default', () => {
    const long = 'a'.repeat(600)
    expect(sanitizePromptInput(long)).toHaveLength(500)
  })

  it('respects a custom max length', () => {
    expect(sanitizePromptInput('hello world', 5)).toBe('hello')
  })

  it('trims leading/trailing whitespace', () => {
    expect(sanitizePromptInput('  hello  ')).toBe('hello')
  })
})

// ── sanitizeShortInput ────────────────────────────────────────────────────────

describe('sanitizeShortInput', () => {
  it('preserves normal ASCII text', () => {
    expect(sanitizeShortInput('Hello world')).toBe('Hello world')
  })

  it('strips newlines (unlike sanitizePromptInput)', () => {
    expect(sanitizeShortInput('line1\nline2')).toBe('line1line2')
  })

  it('strips tabs', () => {
    expect(sanitizeShortInput('col1\tcol2')).toBe('col1col2')
  })

  it('strips all control chars 0x00–0x1f', () => {
    expect(sanitizeShortInput('\x00\x09\x0a\x0d hello')).toBe('hello')
  })

  it('strips DEL (0x7f)', () => {
    expect(sanitizeShortInput('hel\x7flo')).toBe('hello')
  })

  it('truncates at 100 characters by default', () => {
    const long = 'a'.repeat(150)
    expect(sanitizeShortInput(long)).toHaveLength(100)
  })

  it('respects a custom max length', () => {
    expect(sanitizeShortInput('hello world', 5)).toBe('hello')
  })
})

// ── sanitizeCoverUrl ──────────────────────────────────────────────────────────

describe('sanitizeCoverUrl', () => {
  it('allows https URLs', () => {
    const url = 'https://covers.openlibrary.org/b/id/123.jpg'
    expect(sanitizeCoverUrl(url)).toBe(url)
  })

  it('allows http URLs', () => {
    const url = 'http://example.com/cover.png'
    expect(sanitizeCoverUrl(url)).toBe(url)
  })

  it('rejects ftp protocol', () => {
    expect(sanitizeCoverUrl('ftp://example.com/cover.jpg')).toBeNull()
  })

  it('rejects javascript: protocol', () => {
    expect(sanitizeCoverUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects data: URIs', () => {
    expect(sanitizeCoverUrl('data:image/png;base64,abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(sanitizeCoverUrl('')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(sanitizeCoverUrl(null)).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(sanitizeCoverUrl('not a url at all')).toBeNull()
  })
})

// ── fuzzyMatches ──────────────────────────────────────────────────────────────

describe('fuzzyMatches', () => {
  const list = ['Frank Herbert', 'Neil Gaiman', 'Terry Pratchett', 'Ursula Le Guin']

  it('returns [] for empty input', () => {
    expect(fuzzyMatches('', list)).toEqual([])
  })

  it('returns [] for empty list', () => {
    expect(fuzzyMatches('Frank', [])).toEqual([])
  })

  it('returns [] when the input exactly matches an item (no suggestion needed)', () => {
    expect(fuzzyMatches('Frank Herbert', list)).toEqual([])
  })

  it('returns a fuzzy match within edit-distance threshold', () => {
    // 'Frank Herbet' → missing one 'r', distance 1 from 'Frank Herbert'
    const results = fuzzyMatches('Frank Herbet', list)
    expect(results).toContain('Frank Herbert')
  })

  it('does not return items beyond the edit-distance threshold', () => {
    // 'Xyz' has edit distance > 3 from all list items
    const results = fuzzyMatches('Xyz', list)
    expect(results).toEqual([])
  })

  it('returns results sorted by edit distance (closest first)', () => {
    // Both 'Neil Gaiman' and 'Frank Herbert' differ from 'Neil Gaimans' but 'Neil Gaiman' is closer
    const results = fuzzyMatches('Neil Gaimans', list)
    expect(results[0]).toBe('Neil Gaiman')
  })
})

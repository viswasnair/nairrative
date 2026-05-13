import { vi, describe, it, expect, beforeEach } from 'vitest'
import { searchBookCovers, coverUrl } from '../../src/lib/bookSearch'

beforeEach(() => { vi.clearAllMocks() })

// ── coverUrl ──────────────────────────────────────────────────────────────────

describe('coverUrl', () => {
  it('returns medium cover URL by default', () => {
    expect(coverUrl(12345)).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg')
  })

  it('uses the provided size', () => {
    expect(coverUrl(99, 'L')).toBe('https://covers.openlibrary.org/b/id/99-L.jpg')
  })
})

// ── searchBookCovers ──────────────────────────────────────────────────────────

describe('searchBookCovers', () => {
  it('fetches from OpenLibrary with title and author params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ docs: [] }),
    }))

    await searchBookCovers('Dune', 'Frank Herbert')

    const [url] = fetch.mock.calls[0]
    expect(url).toContain('openlibrary.org/search.json')
    expect(url).toContain('title=Dune')
    expect(url).toContain('author=Frank+Herbert')
  })

  it('omits author param when not provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ docs: [] }),
    }))

    await searchBookCovers('Dune')

    const [url] = fetch.mock.calls[0]
    expect(url).not.toContain('author=')
  })

  it('returns unique cover IDs from docs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        docs: [
          { cover_i: 1 },
          { cover_i: 2 },
          { cover_i: 1 },  // duplicate — should be deduped
          { cover_i: 3 },
        ],
      }),
    }))

    const result = await searchBookCovers('Dune')

    expect(result).toEqual([1, 2, 3])
  })

  it('excludes docs without cover_i', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        docs: [{ title: 'No cover' }, { cover_i: 5 }],
      }),
    }))

    const result = await searchBookCovers('Something')

    expect(result).toEqual([5])
  })

  it('caps results at 9 IDs', async () => {
    const docs = Array.from({ length: 15 }, (_, i) => ({ cover_i: i + 1 }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ docs }),
    }))

    const result = await searchBookCovers('Many covers')

    expect(result.length).toBe(9)
  })

  it('returns empty array on missing docs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    }))

    const result = await searchBookCovers('Missing')

    expect(result).toEqual([])
  })
})

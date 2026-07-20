import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── Mock supabase client ───────────────────────────────────────────────────────
// vi.mock is hoisted — factories cannot reference variables declared outside them.

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

import { supabase } from '../../src/lib/supabase'
import * as db from '../../src/lib/db'

// Builds a fully chainable Supabase query-builder mock.
function makeChain() {
  const chain = {
    select:      vi.fn(),
    insert:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    upsert:      vi.fn(),
    eq:          vi.fn(),
    gte:         vi.fn(),
    order:       vi.fn(),
    limit:       vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single:      vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  for (const k of ['select','insert','update','delete','upsert','eq','gte','order','limit'])
    chain[k].mockReturnValue(chain)
  return chain
}

beforeEach(() => { vi.clearAllMocks() })

// ── Books ─────────────────────────────────────────────────────────────────────

describe('db.getBooks', () => {
  it('selects all columns and filters by user_id when userId provided', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.getBooks('uid-1')

    expect(supabase.from).toHaveBeenCalledWith('books')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'uid-1')
    expect(chain.order).toHaveBeenCalledWith('id')
  })

  it('omits user_id filter when userId is falsy (public view)', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.getBooks(null)

    expect(chain.eq).not.toHaveBeenCalled()
    expect(chain.order).toHaveBeenCalledWith('id')
  })
})

describe('db.insertBook', () => {
  it('calls insert with the provided fields and returns single', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.insertBook({ title: 'Dune', user_id: 'u1' })

    expect(supabase.from).toHaveBeenCalledWith('books')
    expect(chain.insert).toHaveBeenCalledWith([{ title: 'Dune', user_id: 'u1' }])
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
  })
})

describe('db.updateBook', () => {
  it('calls update with fields and eq id', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.updateBook(42, { title: 'Updated' })

    expect(chain.update).toHaveBeenCalledWith({ title: 'Updated' })
    expect(chain.eq).toHaveBeenCalledWith('id', 42)
  })
})

describe('db.deleteBook', () => {
  it('calls delete eq id', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.deleteBook(7)

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 7)
  })
})

describe('db.updateBookRating', () => {
  it('updates rating field', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.updateBookRating(3, 4)

    expect(chain.update).toHaveBeenCalledWith({ rating: 4 })
    expect(chain.eq).toHaveBeenCalledWith('id', 3)
  })

  it('sets rating to null when falsy value passed', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.updateBookRating(3, null)

    expect(chain.update).toHaveBeenCalledWith({ rating: null })
  })
})

// ── Authors ───────────────────────────────────────────────────────────────────

describe('db.findAuthorByName', () => {
  it('queries authors by name and calls maybeSingle', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.findAuthorByName('Frank Herbert')

    expect(supabase.from).toHaveBeenCalledWith('authors')
    expect(chain.eq).toHaveBeenCalledWith('name', 'Frank Herbert')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })
})

describe('db.createAuthor', () => {
  it('inserts author by name', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.createAuthor('Isaac Asimov')

    expect(chain.insert).toHaveBeenCalledWith([{ name: 'Isaac Asimov' }])
    expect(chain.single).toHaveBeenCalled()
  })
})

// ── Panel prompts ─────────────────────────────────────────────────────────────

describe('db.savePanelPrompts', () => {
  it('upserts with user_id, data and onConflict:user_id', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.savePanelPrompts('u-3', { temporal: 'focus on volume' })

    expect(supabase.from).toHaveBeenCalledWith('panel_prompts')
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: 'u-3', data: { temporal: 'focus on volume' } },
      { onConflict: 'user_id' }
    )
  })
})

// ── New releases ──────────────────────────────────────────────────────────────

describe('db.getNewReleases', () => {
  it('queries new_releases with date filter, order, and limit', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.getNewReleases()

    expect(supabase.from).toHaveBeenCalledWith('new_releases')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.gte).toHaveBeenCalled()
    expect(chain.order).toHaveBeenCalledWith('published_date', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(20)
  })

  it('uses the provided cols string', () => {
    const chain = makeChain()
    supabase.from.mockReturnValue(chain)

    db.getNewReleases({ cols: 'title, author' })

    expect(chain.select).toHaveBeenCalledWith('title, author')
  })
})

describe('db.triggerReleasesCheck', () => {
  it('invokes the check-releases edge function', () => {
    supabase.functions.invoke.mockResolvedValue({})

    db.triggerReleasesCheck()

    expect(supabase.functions.invoke).toHaveBeenCalledWith('check-releases')
  })
})

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getSession, signIn, signOut, onAuthStateChange } from '../../src/lib/auth'

// ── Mock supabase client ───────────────────────────────────────────────────────

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:          vi.fn(),
      signInWithPassword:  vi.fn(),
      signOut:             vi.fn(),
      onAuthStateChange:   vi.fn(),
    },
  },
}))

import { supabase } from '../../src/lib/supabase'

beforeEach(() => { vi.clearAllMocks() })

// ── getSession ────────────────────────────────────────────────────────────────

describe('auth.getSession', () => {
  it('returns the session object when logged in', async () => {
    const fakeSession = { user: { id: 'u-1' }, access_token: 'tok' }
    supabase.auth.getSession.mockResolvedValue({ data: { session: fakeSession } })

    const result = await getSession()

    expect(result).toBe(fakeSession)
  })

  it('returns null when logged out', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    const result = await getSession()

    expect(result).toBeNull()
  })
})

// ── signIn ────────────────────────────────────────────────────────────────────

describe('auth.signIn', () => {
  it('calls signInWithPassword with email and password', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    await signIn('a@b.com', 'pass123')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass123',
    })
  })

  it('forwards the error from supabase', async () => {
    const err = { message: 'Invalid credentials' }
    supabase.auth.signInWithPassword.mockResolvedValue({ error: err })

    const result = await signIn('a@b.com', 'wrong')

    expect(result.error).toBe(err)
  })
})

// ── signOut ───────────────────────────────────────────────────────────────────

describe('auth.signOut', () => {
  it('calls supabase signOut', async () => {
    supabase.auth.signOut.mockResolvedValue({})

    await signOut()

    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
  })
})

// ── onAuthStateChange ─────────────────────────────────────────────────────────

describe('auth.onAuthStateChange', () => {
  it('registers the callback and returns an unsubscribe function', () => {
    const unsubscribeFn = vi.fn()
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: unsubscribeFn } },
    })

    const cb = vi.fn()
    const unsubscribe = onAuthStateChange(cb)

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(cb)
    expect(typeof unsubscribe).toBe('function')

    unsubscribe()
    expect(unsubscribeFn).toHaveBeenCalledOnce()
  })
})

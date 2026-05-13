import { describe, it, expect } from 'vitest'
import { claudeHeaders, LLM_URL, INTER_REQUEST_DELAY_MS } from '../../src/lib/api.js'

describe('claudeHeaders', () => {
  it('always includes Content-Type: application/json', () => {
    expect(claudeHeaders(null)['Content-Type']).toBe('application/json')
    expect(claudeHeaders({ access_token: 'tok' })['Content-Type']).toBe('application/json')
  })

  it('includes Authorization header when session has access_token', () => {
    const headers = claudeHeaders({ access_token: 'my-jwt-token' })
    expect(headers['Authorization']).toBe('Bearer my-jwt-token')
  })

  it('omits Authorization header when session is null', () => {
    expect(claudeHeaders(null)).not.toHaveProperty('Authorization')
  })

  it('omits Authorization header when session has no access_token', () => {
    expect(claudeHeaders({})).not.toHaveProperty('Authorization')
    expect(claudeHeaders({ user: 'x' })).not.toHaveProperty('Authorization')
  })
})

describe('LLM_URL', () => {
  it('points to the /api/claude edge function', () => {
    expect(LLM_URL).toBe('/api/claude')
  })
})

describe('INTER_REQUEST_DELAY_MS', () => {
  it('is a positive number', () => {
    expect(typeof INTER_REQUEST_DELAY_MS).toBe('number')
    expect(INTER_REQUEST_DELAY_MS).toBeGreaterThan(0)
  })
})

import { describe, it, expect } from 'vitest'
import { PROVIDERS, resolveProvider, isAllowedModel } from '../../api/lib/providers.js'

describe('resolveProvider', () => {
  it('returns "anthropic" for claude-* models', () => {
    expect(resolveProvider('claude-haiku-4-5-20251001')).toBe('anthropic')
    expect(resolveProvider('claude-sonnet-4-6')).toBe('anthropic')
    expect(resolveProvider('claude-opus-4-6')).toBe('anthropic')
  })

  it('returns "openai" for gpt-* models', () => {
    expect(resolveProvider('gpt-4o')).toBe('openai')
    expect(resolveProvider('gpt-4o-mini')).toBe('openai')
    expect(resolveProvider('gpt-4-turbo')).toBe('openai')
  })

  it('defaults to "anthropic" for unknown models', () => {
    expect(resolveProvider('unknown-model')).toBe('anthropic')
    expect(resolveProvider('')).toBe('anthropic')
  })

  it('defaults to "anthropic" for non-string values', () => {
    expect(resolveProvider(undefined)).toBe('anthropic')
    expect(resolveProvider(null)).toBe('anthropic')
    expect(resolveProvider(42)).toBe('anthropic')
  })
})

describe('isAllowedModel', () => {
  it('returns true for all whitelisted claude models', () => {
    expect(isAllowedModel('claude-haiku-4-5-20251001')).toBe(true)
    expect(isAllowedModel('claude-sonnet-4-6')).toBe(true)
    expect(isAllowedModel('claude-opus-4-6')).toBe(true)
  })

  it('returns true for all whitelisted gpt models', () => {
    expect(isAllowedModel('gpt-4o')).toBe(true)
    expect(isAllowedModel('gpt-4o-mini')).toBe(true)
    expect(isAllowedModel('gpt-4-turbo')).toBe(true)
  })

  it('returns false for unknown or unlisted models', () => {
    expect(isAllowedModel('unknown-model')).toBe(false)
    expect(isAllowedModel('gpt-3.5-turbo')).toBe(false)
    expect(isAllowedModel('')).toBe(false)
    expect(isAllowedModel(undefined)).toBe(false)
  })
})

describe('PROVIDERS.anthropic', () => {
  it('has correct API URL and key env', () => {
    expect(PROVIDERS.anthropic.apiUrl).toBe('https://api.anthropic.com/v1/messages')
    expect(PROVIDERS.anthropic.apiKeyEnv).toBe('ANTHROPIC_API_KEY')
  })

  it('requestHeaders includes x-api-key and anthropic-version', () => {
    const h = PROVIDERS.anthropic.requestHeaders('my-key')
    expect(h['x-api-key']).toBe('my-key')
    expect(h['anthropic-version']).toBe('2023-06-01')
    expect(h['content-type']).toBe('application/json')
  })

  it('buildRequest returns body unchanged', () => {
    const body = { model: 'claude-sonnet-4-6', messages: [], system: 'You are helpful.' }
    expect(PROVIDERS.anthropic.buildRequest(body)).toBe(body)
  })

  it('normalizeResponse returns data unchanged', () => {
    const data = { content: [{ type: 'text', text: 'hello' }] }
    expect(PROVIDERS.anthropic.normalizeResponse(data)).toBe(data)
  })

  it('supportsTools is true', () => {
    expect(PROVIDERS.anthropic.supportsTools).toBe(true)
  })
})

describe('PROVIDERS.openai', () => {
  it('has correct API URL and key env', () => {
    expect(PROVIDERS.openai.apiUrl).toBe('https://api.openai.com/v1/chat/completions')
    expect(PROVIDERS.openai.apiKeyEnv).toBe('OPENAI_API_KEY')
  })

  it('requestHeaders includes Authorization Bearer', () => {
    const h = PROVIDERS.openai.requestHeaders('sk-abc')
    expect(h['Authorization']).toBe('Bearer sk-abc')
    expect(h['content-type']).toBe('application/json')
  })

  it('buildRequest moves system into messages as first element', () => {
    const body = {
      model: 'gpt-4o',
      system: 'Be concise.',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
    }
    const built = PROVIDERS.openai.buildRequest(body)
    expect(built.messages[0]).toEqual({ role: 'system', content: 'Be concise.' })
    expect(built.messages[1]).toEqual({ role: 'user', content: 'Hi' })
    expect(built.system).toBeUndefined()
  })

  it('buildRequest strips Anthropic-specific tools field', () => {
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }
    const built = PROVIDERS.openai.buildRequest(body)
    expect(built.tools).toBeUndefined()
  })

  it('buildRequest works without system or tools', () => {
    const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hi' }] }
    const built = PROVIDERS.openai.buildRequest(body)
    expect(built.messages).toEqual([{ role: 'user', content: 'Hi' }])
    expect(built.system).toBeUndefined()
    expect(built.tools).toBeUndefined()
  })

  it('normalizeResponse maps choices[0].message.content to content[0].text', () => {
    const data = { choices: [{ message: { content: 'Hello world' } }] }
    const normalized = PROVIDERS.openai.normalizeResponse(data)
    expect(normalized.content[0].type).toBe('text')
    expect(normalized.content[0].text).toBe('Hello world')
  })

  it('normalizeResponse handles missing choices gracefully', () => {
    const normalized = PROVIDERS.openai.normalizeResponse({})
    expect(normalized.content[0].text).toBe('')
  })

  it('supportsTools is false', () => {
    expect(PROVIDERS.openai.supportsTools).toBe(false)
  })
})

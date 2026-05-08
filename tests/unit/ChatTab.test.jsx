import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import ChatTab from '../../src/components/ChatTab.jsx'

const WELCOME_MESSAGE = { role: 'assistant', content: 'Hello! I\'m your reading assistant.' }

function setup(props = {}) {
  const defaults = {
    session: null,
    messages: [WELCOME_MESSAGE],
    chatLoading: false,
    chatInput: '',
    setChatInput: vi.fn(),
    chatEndRef: createRef(),
    sendChat: vi.fn(),
  }
  return render(<ChatTab {...defaults} {...props} />)
}

describe('ChatTab', () => {
  it('shows sign-in gate when session is null', () => {
    setup({ session: null })
    expect(screen.getByText('Sign in to use Chat')).toBeTruthy()
  })

  it('shows gate description text when not authenticated', () => {
    setup({ session: null })
    expect(screen.getByText(/only available to the library owner/)).toBeTruthy()
  })

  it('does not show the chat input when not authenticated', () => {
    setup({ session: null })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('shows chat interface when session is present', () => {
    setup({ session: { access_token: 'tok' } })
    expect(screen.queryByText('Sign in to use Chat')).toBeNull()
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('shows the Send button when authenticated', () => {
    setup({ session: { access_token: 'tok' } })
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
  })

  it('renders message content from the messages array', () => {
    setup({
      session: { access_token: 'tok' },
      messages: [WELCOME_MESSAGE],
    })
    expect(screen.getByText(WELCOME_MESSAGE.content)).toBeTruthy()
  })

  it('shows "◈ Reading AI" label on assistant messages', () => {
    setup({
      session: { access_token: 'tok' },
      messages: [WELCOME_MESSAGE],
    })
    expect(screen.getByText('◈ Reading AI')).toBeTruthy()
  })

  it('shows suggestion chips when only 1 message exists', () => {
    setup({
      session: { access_token: 'tok' },
      messages: [WELCOME_MESSAGE],
    })
    expect(screen.getByText('What were my peak reading years?')).toBeTruthy()
  })

  it('hides suggestion chips when more than 1 message exists', () => {
    setup({
      session: { access_token: 'tok' },
      messages: [
        WELCOME_MESSAGE,
        { role: 'user', content: 'A question' },
      ],
    })
    expect(screen.queryByText('What were my peak reading years?')).toBeNull()
  })

  it('calls setChatInput when a suggestion chip is clicked', () => {
    const setChatInput = vi.fn()
    setup({ session: { access_token: 'tok' }, messages: [WELCOME_MESSAGE], setChatInput })
    fireEvent.click(screen.getByText('What were my peak reading years?'))
    expect(setChatInput).toHaveBeenCalledWith('What were my peak reading years?')
  })

  it('disables Send button when chatLoading is true', () => {
    setup({ session: { access_token: 'tok' }, chatLoading: true })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('shows "Thinking…" indicator when chatLoading is true', () => {
    setup({ session: { access_token: 'tok' }, chatLoading: true })
    expect(screen.getByText('Thinking…')).toBeTruthy()
  })

  it('calls sendChat when Send button is clicked', () => {
    const sendChat = vi.fn()
    setup({ session: { access_token: 'tok' }, sendChat })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(sendChat).toHaveBeenCalledTimes(1)
  })

  it('calls sendChat on Enter key in the input', () => {
    const sendChat = vi.fn()
    setup({ session: { access_token: 'tok' }, sendChat })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(sendChat).toHaveBeenCalledTimes(1)
  })

  it('does not call sendChat on Shift+Enter', () => {
    const sendChat = vi.fn()
    setup({ session: { access_token: 'tok' }, sendChat })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })
    expect(sendChat).not.toHaveBeenCalled()
  })
})

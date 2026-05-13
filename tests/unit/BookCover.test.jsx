import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BookCover from '../../src/components/BookCover.jsx'

describe('BookCover', () => {
  it('renders an img when url is provided', () => {
    const { container } = render(<BookCover url="https://example.com/cover.jpg" title="Dune" />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img.src).toBe('https://example.com/cover.jpg')
  })

  it('renders the first letter of title when url is absent', () => {
    render(<BookCover title="Dune" />)
    expect(screen.getByText('D')).toBeTruthy()
  })

  it('renders "?" when both url and title are absent', () => {
    render(<BookCover />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('applies default letterSize of 24', () => {
    const { container } = render(<BookCover title="Dune" />)
    const span = container.querySelector('span')
    expect(span.style.fontSize).toBe('24px')
  })

  it('applies custom letterSize prop', () => {
    const { container } = render(<BookCover title="Dune" letterSize={18} />)
    const span = container.querySelector('span')
    expect(span.style.fontSize).toBe('18px')
  })

  it('falls through to letter fallback when url is an empty string', () => {
    const { container } = render(<BookCover url="" title="Dune" />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('D')).toBeTruthy()
  })
})

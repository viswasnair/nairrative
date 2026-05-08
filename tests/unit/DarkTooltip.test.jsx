import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DarkTooltip from '../../src/components/DarkTooltip.jsx'

describe('DarkTooltip', () => {
  it('renders nothing when active is false', () => {
    const { container } = render(
      <DarkTooltip active={false} payload={[{ name: 'count', value: 10 }]} label="2022" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when payload is empty', () => {
    const { container } = render(
      <DarkTooltip active={true} payload={[]} label="2022" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when payload is undefined', () => {
    const { container } = render(
      <DarkTooltip active={true} payload={undefined} label="2022" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the label when active', () => {
    render(
      <DarkTooltip active={true} payload={[{ name: 'Books', value: 15 }]} label="2022" />
    )
    expect(screen.getByText('2022')).toBeTruthy()
  })

  it('renders payload values when active', () => {
    render(
      <DarkTooltip active={true} payload={[{ name: 'Books', value: 42 }]} label="2021" />
    )
    expect(screen.getByText(/42/)).toBeTruthy()
  })

  it('renders payload name prefix for named series (not "count")', () => {
    render(
      <DarkTooltip active={true} payload={[{ name: 'Books', value: 7 }]} label="2020" />
    )
    expect(screen.getByText(/Books:/)).toBeTruthy()
  })

  it('omits name prefix when payload name is "count"', () => {
    render(
      <DarkTooltip active={true} payload={[{ name: 'count', value: 5 }]} label="2020" />
    )
    expect(screen.queryByText(/count:/)).toBeNull()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders multiple payload entries', () => {
    render(
      <DarkTooltip
        active={true}
        payload={[
          { name: 'Fiction', value: 10 },
          { name: 'Non-Fiction', value: 5 },
        ]}
        label="2019"
      />
    )
    // Use getAllByText since /Fiction:/ would match both "Fiction:" and "Non-Fiction:"
    const entries = screen.getAllByText(/Fiction:/)
    expect(entries).toHaveLength(2)
    expect(entries.some(el => el.textContent.startsWith('Fiction:'))).toBe(true)
    expect(entries.some(el => el.textContent.startsWith('Non-Fiction:'))).toBe(true)
  })
})

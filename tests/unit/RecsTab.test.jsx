import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecsTab from '../../src/components/RecsTab.jsx'

vi.mock('../../src/components/SeriesTab.jsx', () => ({
  default: () => <div data-testid="series-tab" />,
}))

vi.mock('../../src/components/NewReleasesTab.jsx', () => ({
  default: () => <div data-testid="releases-tab" />,
}))

vi.mock('../../src/lib/bookUtils.js', () => ({
  stripMd: vi.fn(s => s),
}))

const SESSION = { user: { id: 'u1' }, access_token: 'tok' }

const BOOKS = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year_read_end: 2022 },
]

function setup(overrides = {}) {
  const defaults = {
    books:              BOOKS,
    genreList:          ['Science Fiction', 'History'],
    session:            null,
    intentInputs:       {},
    setIntentInputs:    vi.fn(),
    intentResults:      {},
    setIntentResults:   vi.fn(),
    intentLoading:      {},
    fetchIntentRecs:    vi.fn(),
    selectedSeries:     null,
    setSelectedSeries:  vi.fn(),
    seriesRecap:        null,
    setSeriesRecap:     vi.fn(),
    seriesLoading:      false,
    generateSeriesRecap:vi.fn(),
  }
  return render(<RecsTab {...defaults} {...overrides} />)
}

describe('RecsTab', () => {
  it('renders Picks, New Releases, and Recap subtab buttons', () => {
    setup()
    expect(screen.getByText('Picks')).toBeTruthy()
    expect(screen.getByText('New Releases')).toBeTruthy()
    expect(screen.getByText('Recap')).toBeTruthy()
  })

  it('default subtab is Picks (lens cards are visible)', () => {
    setup()
    expect(screen.queryByTestId('series-tab')).toBeNull()
    expect(screen.queryByTestId('releases-tab')).toBeNull()
    // Lens titles include the icon in the same span — use regex
    expect(screen.getByText(/More Like Last Book/)).toBeTruthy()
  })

  it('clicking Recap renders the SeriesTab', () => {
    setup()
    fireEvent.click(screen.getByText('Recap'))
    expect(screen.getByTestId('series-tab')).toBeTruthy()
  })

  it('clicking New Releases renders the NewReleasesTab', () => {
    setup()
    fireEvent.click(screen.getByText('New Releases'))
    expect(screen.getByTestId('releases-tab')).toBeTruthy()
  })

  it('renders multiple lens cards in Picks tab', () => {
    setup()
    // Lens titles include the icon in the same span — use regex
    expect(screen.getByText(/Challenge Me/)).toBeTruthy()
    expect(screen.getByText(/Quick Reads/)).toBeTruthy()
    expect(screen.getByText(/Surprise Me/)).toBeTruthy()
  })

  it('text input rendered for a non-auto lens', () => {
    setup()
    // Multiple non-auto lenses share "Sign in to use this" placeholder when no session
    const inputs = screen.getAllByPlaceholderText('Sign in to use this')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('text input placeholder changes when session is present', () => {
    setup({ session: SESSION })
    // At least one lens input should show its real placeholder
    expect(screen.getByPlaceholderText('A book title…')).toBeTruthy()
  })

  it('pressing Enter in a lens input calls fetchIntentRecs', () => {
    const fetchIntentRecs = vi.fn()
    // Pre-set the input value since setIntentInputs is a mock and won't update state
    setup({ session: SESSION, fetchIntentRecs, intentInputs: { loved: 'Foundation' } })
    const input = screen.getByPlaceholderText('A book title…')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(fetchIntentRecs).toHaveBeenCalledWith('loved', 'Foundation')
  })

  it('shows recommendation title when intentResults has data for a lens', () => {
    setup({
      intentResults: {
        'more-like': [{ title: 'Foundation', author: 'Asimov', year: 1951, reason: 'Classic' }],
      },
    })
    expect(screen.getByText('Foundation')).toBeTruthy()
  })
})

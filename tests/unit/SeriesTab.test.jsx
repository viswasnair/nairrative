import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SeriesTab from '../../src/components/SeriesTab.jsx'

vi.mock('../../src/lib/api.js', () => ({
  CLAUDE_URL: 'https://mock.vercel.app/api/claude',
  claudeHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
}))

const SESSION = { user: { id: 'u1' }, access_token: 'tok' }

const BOOKS_WITH_SERIES = [
  { id: 1, title: 'Dune',           series: 'Dune', year_read_end: 2022 },
  { id: 2, title: 'Dune Messiah',   series: 'Dune', year_read_end: 2023 },
  { id: 3, title: 'A Short History',series: null,   year_read_end: 2021 },
]

const BOOKS_NO_SERIES = [
  { id: 4, title: 'Sapiens', series: null, year_read_end: 2022 },
]

function setup(overrides = {}) {
  const defaults = {
    books:               BOOKS_WITH_SERIES,
    session:             null,
    selectedSeries:      null,
    setSelectedSeries:   vi.fn(),
    seriesRecap:         null,
    setSeriesRecap:      vi.fn(),
    seriesLoading:       false,
    generateSeriesRecap: vi.fn(),
  }
  return render(<SeriesTab {...defaults} {...overrides} />)
}

describe('SeriesTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows "No series data" empty state when no books have a series', () => {
    setup({ books: BOOKS_NO_SERIES })
    expect(screen.getByText(/No series data/i)).toBeTruthy()
  })

  it('renders a button for each unique series in the books', () => {
    setup()
    // 'Dune' appears as a series picker button label
    expect(screen.getAllByText('Dune').length).toBeGreaterThan(0)
  })

  it('clicking a series button passes it to setSelectedSeries', () => {
    const setSelectedSeries = vi.fn()
    setup({ setSelectedSeries })
    const duneSpans = screen.getAllByText('Dune')
    fireEvent.click(duneSpans[0].closest('button'))
    expect(setSelectedSeries).toHaveBeenCalledWith('Dune')
  })

  it('shows the recap panel with book titles when selectedSeries is set', () => {
    setup({ selectedSeries: 'Dune' })
    // 'Dune' appears in both the picker button and the recap panel header
    expect(screen.getAllByText('Dune').length).toBeGreaterThan(0)
    expect(screen.getByText('Dune Messiah')).toBeTruthy()
  })

  it('Generate Recap button is disabled when session is null', () => {
    setup({ selectedSeries: 'Dune', session: null })
    const btn = screen.getByRole('button', { name: /Generate Recap/i })
    expect(btn.disabled).toBe(true)
  })

  it('Generate Recap button is enabled and calls generateSeriesRecap when session present', () => {
    const generateSeriesRecap = vi.fn()
    setup({ selectedSeries: 'Dune', session: SESSION, generateSeriesRecap })
    const btn = screen.getByRole('button', { name: /Generate Recap/i })
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(generateSeriesRecap).toHaveBeenCalledTimes(1)
  })

  it('custom recap button is disabled when session is null', () => {
    setup({ session: null })
    const recapBtn = screen.getByRole('button', { name: /Recap/i })
    expect(recapBtn.disabled).toBe(true)
  })

  it('custom recap: fetch is called with correct payload on button click', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [{ text: 'Great series!' }] }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    setup({ session: SESSION })

    const input = screen.getByPlaceholderText('Enter any series or book name…')
    fireEvent.change(input, { target: { value: 'Foundation' } })

    const btn = screen.getByRole('button', { name: /Recap/i })
    await act(async () => { fireEvent.click(btn) })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://mock.vercel.app/api/claude',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('custom recap text is displayed after a successful fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [{ text: 'Great series recap!' }] }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    setup({ session: SESSION })

    const input = screen.getByPlaceholderText('Enter any series or book name…')
    fireEvent.change(input, { target: { value: 'Foundation' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Recap/i }))
    })

    expect(screen.getByText('Great series recap!')).toBeTruthy()
  })

  it('custom recap shows error text when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    setup({ session: SESSION })

    const input = screen.getByPlaceholderText('Enter any series or book name…')
    fireEvent.change(input, { target: { value: 'Foundation' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Recap/i }))
    })

    expect(screen.getByText(/network error/i)).toBeTruthy()
  })

  it('seriesLoading=true shows loading pulse while generating series recap', () => {
    setup({ selectedSeries: 'Dune', session: SESSION, seriesLoading: true })
    // When loading, the button shows "Generating…" not "Generate Recap"
    expect(screen.queryByRole('button', { name: /Generate Recap/i })).toBeNull()
  })
})

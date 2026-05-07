import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverviewTab from '../../src/components/OverviewTab.jsx'

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>
  const Noop = () => null
  return {
    ResponsiveContainer: Passthrough,
    BarChart:    Passthrough, AreaChart: Passthrough,
    LineChart:   Passthrough, PieChart:  Passthrough,
    Bar: Noop, Area: Noop, Line: Noop, Pie: Noop, Cell: Noop,
    XAxis: Noop, YAxis: Noop, CartesianGrid: Noop,
    Tooltip: Noop, Legend: Noop,
  }
})

vi.mock('../../src/components/RangeFilter.jsx', () => ({
  default: () => <div data-testid="range-filter" />,
}))

vi.mock('../../src/components/DarkTooltip.jsx', () => ({
  default: () => null,
}))

const BOOKS = [
  { id: 1, title: 'Dune',     author: 'Frank Herbert',     year: 2022, year_read_start: 2021, year_read_end: 2022, pages: 412,  fiction: true,  genre: ['Science Fiction'], format: 'Novel',      country: 'United States' },
  { id: 2, title: 'Sapiens',  author: 'Yuval Noah Harari', year: 2022, year_read_start: 2022, year_read_end: 2022, pages: 443,  fiction: false, genre: ['History'],         format: 'Non-Fiction', country: 'Israel' },
  { id: 3, title: '1984',     author: 'George Orwell',     year: 2023, year_read_start: 2023, year_read_end: 2023, pages: 328,  fiction: true,  genre: ['Science Fiction'], format: 'Novel',      country: 'United Kingdom' },
  { id: 4, title: 'Dune M.',  author: 'Frank Herbert',     year: 2023, year_read_start: 2023, year_read_end: 2023, pages: 331,  fiction: true,  genre: ['Science Fiction'], format: 'Novel',      country: 'United States' },
  { id: 5, title: 'Thinking', author: 'Daniel Kahneman',   year: 2024, year_read_start: 2024, year_read_end: 2024, pages: 499,  fiction: false, genre: ['Psychology'],      format: 'Non-Fiction', country: 'Israel' },
]

const STATS = {
  total:        5,
  readingSpan:  4,
  sortedYears:   [[2023, 2], [2022, 2]],
  sortedAuthors: [['Frank Herbert', 2], ['George Orwell', 1]],
  sortedGenres:  [['Science Fiction', 3], ['History', 1]],
}

const ALL_YEARS = [2021, 2022, 2023, 2024]

function getChartRange() { return { from: 2021, to: 2024 } }

function setup(overrides = {}) {
  const defaults = {
    books:          BOOKS,
    stats:          STATS,
    genreMap:       { 'Science Fiction': '#4a9eff', History: '#c9a84c', Psychology: '#c3a6ff' },
    allYearsList:   ALL_YEARS,
    allYearsListFull: ALL_YEARS,
    chartRanges:    {},
    getChartRange:  vi.fn(getChartRange),
    setChartRange:  vi.fn(),
  }
  return render(<OverviewTab {...defaults} {...overrides} />)
}

describe('OverviewTab', () => {
  it('renders total books KPI card with correct count', () => {
    setup()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('Books Read')).toBeTruthy()
  })

  it('renders Peak Year KPI card', () => {
    setup()
    expect(screen.getByText('Peak Year')).toBeTruthy()
    // Value format: "2023 (2)"
    expect(screen.getByText('2023 (2)')).toBeTruthy()
  })

  it('renders Top Genre KPI card with genre name', () => {
    setup()
    expect(screen.getByText('Top Genre')).toBeTruthy()
    expect(screen.getAllByText('Science Fiction').length).toBeGreaterThan(0)
  })

  it('renders #1 Author KPI card with author name', () => {
    setup()
    expect(screen.getByText('#1 Author')).toBeTruthy()
    expect(screen.getByText('Frank Herbert')).toBeTruthy()
  })

  it('renders Years Reading KPI card', () => {
    setup()
    expect(screen.getByText('Years Reading')).toBeTruthy()
    // readingSpan value = 4 (may appear in multiple places)
    expect(screen.getAllByText('4').length).toBeGreaterThan(0)
  })

  it('renders one RangeFilter per chart (8 total)', () => {
    setup()
    const filters = screen.getAllByTestId('range-filter')
    expect(filters).toHaveLength(8)
  })

  it('renders the Reading Activity by Year chart section', () => {
    setup()
    expect(screen.getByText('Reading Activity by Year')).toBeTruthy()
  })

  it('renders the Genre Breakdown chart section', () => {
    setup()
    expect(screen.getByText('Genre Breakdown')).toBeTruthy()
  })

  it('renders Fiction vs Non-Fiction chart section', () => {
    setup()
    // The chart heading is "Fiction vs Non-Fiction Over Time"
    expect(screen.getByText('Fiction vs Non-Fiction Over Time')).toBeTruthy()
  })

  it('does not crash with an empty books array', () => {
    const emptyStats = {
      total: 0, readingSpan: 0,
      sortedYears: [], sortedAuthors: [], sortedGenres: [],
    }
    // Should not throw
    setup({ books: [], stats: emptyStats })
    expect(screen.getByText('Books Read')).toBeTruthy()
  })
})

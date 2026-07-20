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

  it('renders one RangeFilter per chart (12 total)', () => {
    setup()
    const filters = screen.getAllByTestId('range-filter')
    expect(filters).toHaveLength(12)
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
    setup({ books: [], stats: emptyStats })
    expect(screen.getByText('Books Read')).toBeTruthy()
  })

  it('renders Authors Read KPI with correct unique author count', () => {
    setup()
    expect(screen.getByText('Authors Read')).toBeTruthy()
    // BOOKS has 4 unique authors — getAllByText handles duplicates
    expect(screen.getAllByText('4').length).toBeGreaterThan(0)
  })

  it('renders Dominant Mood KPI with actual mood when books have mood', () => {
    const booksWithMood = BOOKS.map((b, i) => ({ ...b, mood: i < 3 ? 'Reflective' : 'Hopeful' }))
    setup({ books: booksWithMood })
    expect(screen.getByText('Dominant Mood')).toBeTruthy()
    // Reflective may appear in both the KPI card and chart data
    expect(screen.getAllByText('Reflective').length).toBeGreaterThan(0)
  })

  it('renders Dominant Mood KPI as "—" when no books have mood', () => {
    setup() // BOOKS have no mood field
    expect(screen.getByText('Dominant Mood')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders Top Theme KPI with actual theme when books have themes', () => {
    const booksWithTheme = BOOKS.map((b, i) => ({ ...b, theme: i < 3 ? ['Power', 'Identity'] : ['Loss'] }))
    setup({ books: booksWithTheme })
    expect(screen.getByText('Top Theme')).toBeTruthy()
    expect(screen.getByText('Power')).toBeTruthy()
  })

  it('renders Top Archetype KPI with actual archetype', () => {
    const booksWithArchetype = BOOKS.map((b, i) => ({ ...b, archetype: i < 4 ? "Hero's Journey" : 'Quest' }))
    setup({ books: booksWithArchetype })
    expect(screen.getByText('Top Archetype')).toBeTruthy()
    expect(screen.getAllByText("Hero's Journey").length).toBeGreaterThan(0)
  })

  it('Pages/Book shows "—" when no books have pages', () => {
    const noPagesBooks = BOOKS.map(b => ({ ...b, pages: undefined }))
    const s = { ...STATS }
    setup({ books: noPagesBooks, stats: s })
    // "—" appears at least once for Pages/Book
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('Pages/Day shows "—" when readingSpan is 0', () => {
    const zeroSpan = { ...STATS, readingSpan: 0 }
    setup({ stats: zeroSpan })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('Books/Year shows "—" when readingSpan is 0', () => {
    const zeroSpan = { ...STATS, readingSpan: 0 }
    setup({ stats: zeroSpan })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders the Mood Breakdown chart section', () => {
    setup()
    expect(screen.getByText('Mood Breakdown')).toBeTruthy()
  })

  it('renders the Top Themes chart section', () => {
    setup()
    expect(screen.getByText('Top Themes')).toBeTruthy()
  })

  it('renders the Archetype Distribution chart section', () => {
    setup()
    expect(screen.getByText('Archetype Distribution')).toBeTruthy()
  })

  it('renders the Mood Over Time chart section', () => {
    setup()
    expect(screen.getByText('Mood Over Time')).toBeTruthy()
  })

  it('renders the Top Authors chart section', () => {
    setup()
    expect(screen.getByText('Top Authors')).toBeTruthy()
  })

  it('renders the Author Origins chart section', () => {
    setup()
    expect(screen.getByText('Author Origins')).toBeTruthy()
  })

  it('renders the Avg Book Length Over Time chart section', () => {
    setup()
    expect(screen.getByText('Avg Book Length Over Time')).toBeTruthy()
  })

  it('renders the Format Breakdown chart section', () => {
    setup()
    expect(screen.getByText('Format Breakdown')).toBeTruthy()
  })

  it('onChartClick prop is accepted without crashing', () => {
    const onChartClick = vi.fn()
    setup({ onChartClick })
    expect(screen.getByText('Books Read')).toBeTruthy()
  })

  describe('chart data computation', () => {
    it('Format Breakdown legend renders format names derived from book data', () => {
      setup()
      // BOOKS has 3 Novels and 2 Non-Fiction — both should appear in the legend
      expect(screen.getAllByText('Novel').length).toBeGreaterThan(0)
      // 'Non-Fiction' also appears in the Fiction/Non-Fiction stacked area legend
      expect(screen.getAllByText('Non-Fiction').length).toBeGreaterThan(0)
    })

    it('Archetype Distribution legend renders archetype names when books have archetypes', () => {
      const booksWithArchetype = BOOKS.map((b, i) => ({
        ...b, archetype: i < 4 ? "Hero's Journey" : 'Quest',
      }))
      setup({ books: booksWithArchetype })
      expect(screen.getAllByText("Hero's Journey").length).toBeGreaterThan(0)
      expect(screen.getByText('Quest')).toBeTruthy()
    })

    it('Archetype Distribution legend has no entries when no books have archetypes', () => {
      setup() // base BOOKS have no archetype field
      expect(screen.queryByText("Hero's Journey")).toBeNull()
      expect(screen.queryByText('Quest')).toBeNull()
    })

    it('Genre Evolution legend shows top genres derived from book genre arrays', () => {
      setup()
      // Science Fiction appears in 3 of 5 BOOKS — it should be in geTop5 legend
      expect(screen.getAllByText('Science Fiction').length).toBeGreaterThan(0)
    })

    it('Mood Over Time legend renders top moods when books have a mood field', () => {
      const booksWithMood = BOOKS.map((b, i) => ({
        ...b, mood: i < 3 ? 'Reflective' : 'Optimistic',
      }))
      setup({ books: booksWithMood })
      // mtTopMoods should include both moods in the legend
      expect(screen.getAllByText('Reflective').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Optimistic').length).toBeGreaterThan(0)
    })

    it('Mood Over Time legend is empty when no books have a mood field', () => {
      setup() // base BOOKS have no mood
      expect(screen.queryByText('Reflective')).toBeNull()
      expect(screen.queryByText('Optimistic')).toBeNull()
    })

    it('getChartRange is called for every chart section on render', () => {
      const fn = vi.fn().mockImplementation(getChartRange)
      setup({ getChartRange: fn })
      const calledIds = fn.mock.calls.map(c => c[0])
      ;['yc', 'fn', 'ge', 'al', 'mt', 'gc', 'ac', 'co'].forEach(id => {
        expect(calledIds).toContain(id)
      })
    })

    it('chart data recomputes when books prop changes', () => {
      const props = {
        books: BOOKS,
        stats: STATS,
        genreMap: { 'Science Fiction': '#4a9eff', History: '#c9a84c', Psychology: '#c3a6ff', Mystery: '#e06c75' },
        allYearsList: ALL_YEARS,
        allYearsListFull: ALL_YEARS,
        chartRanges: {},
        getChartRange: vi.fn(getChartRange),
        setChartRange: vi.fn(),
      }
      const { rerender } = render(<OverviewTab {...props} />)
      // Mystery not in any original BOOK genre arrays
      expect(screen.queryByText('Mystery')).toBeNull()

      // Add a book with Mystery genre
      const newBooks = [...BOOKS, {
        id: 6, title: 'Sherlock', author: 'Arthur Doyle', year: 2023,
        year_read_start: 2023, year_read_end: 2023, pages: 300,
        fiction: true, genre: ['Mystery'], format: 'Novel', country: 'United Kingdom',
      }]
      rerender(<OverviewTab {...props} books={newBooks} stats={{ ...STATS, total: 6 }} getChartRange={vi.fn(getChartRange)} />)
      // Mystery should now appear in the Genre Evolution legend
      expect(screen.getAllByText('Mystery').length).toBeGreaterThan(0)
    })
  })
})

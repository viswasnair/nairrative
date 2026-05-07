import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalysisTab from '../../src/components/AnalysisTab.jsx'

vi.mock('../../src/constants/config.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    DEFAULT_PANEL_PROMPTS: {
      temporal:   'Temporal prompt',
      genre:      'Genre prompt',
      thematic:   'Thematic prompt',
      contextual: 'Contextual prompt',
      complexity: 'Complexity prompt',
      emotional:  'Emotional prompt',
      blindspots: 'Blindspots prompt',
      recent:     'Recent prompt',
    },
  }
})

vi.mock('../../src/lib/bookUtils.js', () => ({
  stripMd: vi.fn(s => s),
}))

const BOOK = {
  id: 1, title: 'Dune', year_read_start: 2022, year_read_end: 2022,
  year: 2022, fiction: true, pages: 412, genre: ['Science Fiction'],
}

const STATS = {
  total: 1,
  readingSpan: 1,
  sortedYears:   [[2022, 1]],
  sortedAuthors: [['Frank Herbert', 1]],
  sortedGenres:  [['Science Fiction', 1]],
}

const ANALYSIS_INSIGHTS = {
  peakYear: [2022, 1], avgPerActive: 1, maxGap: 0,
  fictionPct: 100, genreCount: 1, graphicNovels: 0,
  genreEra: [], challengePct: 0, challengingAuthorsFromData: [],
  fictionByEra: [],
}

const ANALYSIS_AI_WITH_DATA = {
  temporal:   { insight: 'You read steadily.', evidence: ['Dune'], generatedAt: new Date().toISOString(), bookCount: 1 },
  genre:      null, thematic: null, contextual: null,
  complexity: null, emotional: null, blindspots:  null, recent:     null,
}

function setup(overrides = {}) {
  const defaults = {
    books:              [BOOK],
    stats:              STATS,
    analysisInsights:   ANALYSIS_INSIGHTS,
    genreMap:           { 'Science Fiction': '#4a9eff' },
    session:            null,
    analysisAI:         ANALYSIS_AI_WITH_DATA,
    analysisAILoading:  false,
    panelPrompts:       {},
    editingPanel:       null,  setEditingPanel:           vi.fn(),
    viewingPanel:       null,  setViewingPanel:           vi.fn(),
    panelLoading:       {},
    updatePanelPrompt:          vi.fn(),
    resetPanelPrompt:           vi.fn(),
    savePanelPromptsToSupabase: vi.fn(),
    regeneratePanel:            vi.fn(),
    onCiteClick:                vi.fn(),
  }
  return render(<AnalysisTab {...defaults} {...overrides} />)
}

describe('AnalysisTab', () => {
  it('renders all 8 panel headings', () => {
    setup()
    expect(screen.getByText('Volume & Pace')).toBeTruthy()
    expect(screen.getByText('Migration Over Time')).toBeTruthy()
    expect(screen.getByText('Recurring Intellectual Preoccupations')).toBeTruthy()
    expect(screen.getByText('Life Shapes the List')).toBeTruthy()
    expect(screen.getByText('Stretching vs. Comfort')).toBeTruthy()
    expect(screen.getByText('Emotional Fingerprint')).toBeTruthy()
    expect(screen.getByText("What's Missing")).toBeTruthy()
    expect(screen.getByText('Last 12 Months')).toBeTruthy()
  })

  it('renders insight text for a panel with data', () => {
    setup()
    expect(screen.getByText('You read steadily.')).toBeTruthy()
  })

  it('renders evidence tags for a panel with evidence array', () => {
    setup()
    // Verified evidence renders as a button with title="See in library: Dune"
    expect(screen.getByTitle('See in library: Dune')).toBeTruthy()
  })

  it('does not crash when a panel has null AI data', () => {
    setup({ analysisAI: { temporal: null, genre: null, thematic: null, contextual: null, complexity: null, emotional: null, blindspots: null, recent: null } })
    expect(screen.getByText('Volume & Pace')).toBeTruthy()
  })

  it('analysisAILoading=true shows loading skeleton instead of insight', () => {
    setup({ analysisAILoading: true })
    expect(screen.queryByText('You read steadily.')).toBeNull()
    expect(screen.getAllByText('Generating insight…').length).toBeGreaterThan(0)
  })

  it('panelLoading for temporal shows regenerating skeleton for that panel', () => {
    setup({ panelLoading: { temporal: true } })
    expect(screen.getByText('Regenerating…')).toBeTruthy()
  })

  it('refresh and edit icons NOT rendered when session is null', () => {
    setup({ session: null })
    // The refresh button has title "Refresh with Opus"
    expect(screen.queryByTitle('Refresh with Opus')).toBeNull()
    expect(screen.queryByTitle('Edit prompt')).toBeNull()
  })

  it('refresh icon rendered when session present; click calls regeneratePanel', () => {
    const regeneratePanel = vi.fn()
    setup({ session: { user: { id: 'u1' } }, regeneratePanel })
    const refreshBtn = screen.getAllByTitle('Refresh with Opus')[0]
    fireEvent.click(refreshBtn)
    expect(regeneratePanel).toHaveBeenCalledWith('temporal')
  })

  it('edit icon click calls setEditingPanel with the dimension key', () => {
    const setEditingPanel = vi.fn()
    setup({ session: { user: { id: 'u1' } }, setEditingPanel })
    fireEvent.click(screen.getAllByTitle('Edit prompt')[0])
    expect(setEditingPanel).toHaveBeenCalledWith('temporal')
  })

  it('textarea is rendered when editingPanel matches a dimension', () => {
    setup({ session: { user: { id: 'u1' } }, editingPanel: 'temporal' })
    expect(screen.getByRole('textbox')).toBeTruthy()
  })
})

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
    reporter: 'verbose',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/constants/**', 'src/components/**', 'api/**'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        // Per-file floors set ~10 pts below current coverage.
        // CI fails if any floor is breached, catching major regressions
        // without false-positives from minor changes.

        // Utility / API helpers
        'src/lib/textUtils.js':  { statements: 90, branches: 88, functions: 80, lines: 95 },
        'src/lib/bookUtils.js':  { statements: 90, branches: 70, functions: 90, lines: 90 },
        'api/lib/apiUtils.js':   { statements: 78, branches: 68, functions: 90, lines: 84 },

        // Components with active component tests
        // Current: ChatTab 88/100/85/85, MultiSelect 92/96/100/100
        'src/components/ChatTab.jsx':     { statements: 80, branches: 90, functions: 78, lines: 78 },
        'src/components/MultiSelect.jsx': { statements: 85, branches: 88, functions: 95, lines: 95 },
        // Current: RangeFilter 100/100/100/100, DarkTooltip 100/100/100/100
        'src/components/RangeFilter.jsx': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/components/DarkTooltip.jsx': { statements: 90, branches: 90, functions: 90, lines: 90 },

        // Gap-filling tests added 2026-05-06/08 (floors = actual − 10)
        // Current: AnalysisTab 86/75/90/89
        'src/components/AnalysisTab.jsx': { statements: 76, branches: 65, functions: 80, lines: 79 },
        // Current: BookModal 62/74/47/74
        'src/components/BookModal.jsx':   { statements: 52, branches: 64, functions: 37, lines: 64 },
        // Current: BookshelfTab 39/35/32/37 (SpineView/GridView not rendered by BookshelfTab export)
        'src/components/BookshelfTab.jsx': { statements: 29, branches: 25, functions: 22, lines: 27 },
        // Current: LibraryTab 74/83/65/77
        'src/components/LibraryTab.jsx':  { statements: 64, branches: 73, functions: 55, lines: 67 },
        // Current: OverviewTab 88/76/85/83
        'src/components/OverviewTab.jsx': { statements: 78, branches: 66, functions: 75, lines: 73 },
        // Current: RecsTab 84/94/80/100
        'src/components/RecsTab.jsx':     { statements: 74, branches: 84, functions: 70, lines: 90 },
        // Current: SeriesTab 87/89/86/91
        'src/components/SeriesTab.jsx':   { statements: 77, branches: 79, functions: 76, lines: 81 },
        // Current: api/claude.js 95/96/100/97
        'api/claude.js':                  { statements: 85, branches: 86, functions: 90, lines: 87 },
        // Current: NewReleasesTab 96/93/100/96
        'src/components/NewReleasesTab.jsx':  { statements: 86, branches: 83, functions: 90, lines: 86 },
        // Current: RatingFlashcard 84/73/75/87
        'src/components/RatingFlashcard.jsx': { statements: 74, branches: 63, functions: 65, lines: 77 },
      },
    },
  },
})

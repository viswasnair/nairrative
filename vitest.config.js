import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
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
        'src/lib/bookUtils.js':  { statements: 75, branches: 48, functions: 78, lines: 68 },
        'api/lib/apiUtils.js':   { statements: 78, branches: 68, functions: 90, lines: 84 },

        // Components with active component tests
        // Current: ChatTab 88/100/85/85, MultiSelect 92/96/100/100
        'src/components/ChatTab.jsx':     { statements: 80, branches: 90, functions: 78, lines: 78 },
        'src/components/MultiSelect.jsx': { statements: 85, branches: 88, functions: 95, lines: 95 },
        // Current: RangeFilter 100/100/100/100, DarkTooltip 100/100/100/100
        'src/components/RangeFilter.jsx': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/components/DarkTooltip.jsx': { statements: 90, branches: 90, functions: 90, lines: 90 },

        // Gap-filling tests added 2026-05-06 (floors = actual − 10)
        // Current: AnalysisTab 61/55/38/69
        'src/components/AnalysisTab.jsx': { statements: 51, branches: 45, functions: 28, lines: 59 },
        // Current: BookModal 44/52/24/57
        'src/components/BookModal.jsx':   { statements: 34, branches: 42, functions: 14, lines: 47 },
        // Current: LibraryTab 65/77/57/71
        'src/components/LibraryTab.jsx':  { statements: 55, branches: 67, functions: 47, lines: 61 },
        // Current: OverviewTab 86/61/83/79
        'src/components/OverviewTab.jsx': { statements: 76, branches: 51, functions: 73, lines: 69 },
        // Current: RecsTab 57/83/46/80
        'src/components/RecsTab.jsx':     { statements: 47, branches: 73, functions: 36, lines: 70 },
        // Current: SeriesTab 87/89/86/91
        'src/components/SeriesTab.jsx':   { statements: 77, branches: 79, functions: 76, lines: 81 },
        // Current: api/claude.js 95/96/100/97
        'api/claude.js':                  { statements: 85, branches: 86, functions: 90, lines: 87 },
        // Current: NewReleasesTab 96/93/100/96
        'src/components/NewReleasesTab.jsx':  { statements: 86, branches: 83, functions: 90, lines: 86 },
        // Current: RatingFlashcard 83/66/75/87
        'src/components/RatingFlashcard.jsx': { statements: 73, branches: 56, functions: 65, lines: 77 },
      },
    },
  },
})

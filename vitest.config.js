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
      },
    },
  },
})

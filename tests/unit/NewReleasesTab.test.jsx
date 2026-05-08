import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import NewReleasesTab from '../../src/components/NewReleasesTab.jsx'

// vi.hoisted lets us reference these mocks inside vi.mock (which is hoisted to the top)
const { mockLimit, mockInvoke } = vi.hoisted(() => ({
  mockLimit: vi.fn().mockResolvedValue({ data: [] }),
  mockInvoke: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => ({
            limit: mockLimit,
          }),
        }),
      }),
    }),
    functions: { invoke: mockInvoke },
  },
}))

const SESSION = { user: { id: 'u1' }, access_token: 'tok' }

const BOOKS = [
  { id: 1, title: 'Dune', author: 'Frank Herbert' },
]

const RELEASES = [
  { id: 101, title: 'Winds of Winter', author: 'George R.R. Martin', published_date: '2025-06-01', description: 'Long awaited.' },
  { id: 102, title: 'Foundation Rising', author: 'Isaac Asimov Jr.', published_date: '2025-03-10', description: null },
]

function setup(overrides = {}) {
  return render(
    <NewReleasesTab books={BOOKS} session={null} {...overrides} />
  )
}

describe('NewReleasesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue({ data: [] })
  })

  it('shows empty state when no releases are returned', async () => {
    setup()
    expect(await screen.findByText('No new releases found yet.')).toBeTruthy()
  })

  it('renders release titles when data is returned', async () => {
    mockLimit.mockResolvedValue({ data: RELEASES })
    setup()
    expect(await screen.findByText('Winds of Winter')).toBeTruthy()
    expect(screen.getByText('Foundation Rising')).toBeTruthy()
  })

  it('renders release author names', async () => {
    mockLimit.mockResolvedValue({ data: RELEASES })
    setup()
    expect(await screen.findByText('George R.R. Martin')).toBeTruthy()
    expect(screen.getByText('Isaac Asimov Jr.')).toBeTruthy()
  })

  it('renders truncated description when over 160 chars', async () => {
    const longDesc = 'A'.repeat(200)
    const releases = [{ id: 101, title: 'Verbose Book', author: 'Author', published_date: '2025-01-01', description: longDesc }]
    mockLimit.mockResolvedValue({ data: releases })
    setup()
    await screen.findByText('Verbose Book')
    // Truncated at 160 chars + ellipsis
    expect(screen.getByText('A'.repeat(160) + '…')).toBeTruthy()
  })

  it('filters out releases whose title matches a book already in the library', async () => {
    // BOOKS contains "Dune" — a release with that title should not appear
    const releases = [
      { id: 101, title: 'Dune', author: 'Frank Herbert', published_date: '2025-01-01' },
      { id: 102, title: 'Winds of Winter', author: 'George R.R. Martin', published_date: '2025-02-01' },
    ]
    mockLimit.mockResolvedValue({ data: releases })
    setup()
    expect(await screen.findByText('Winds of Winter')).toBeTruthy()
    expect(screen.queryByText('Dune')).toBeNull()
  })

  it('shows "already read all" message when every release is in the library', async () => {
    const releases = [{ id: 101, title: 'Dune', author: 'Frank Herbert', published_date: '2025-01-01' }]
    mockLimit.mockResolvedValue({ data: releases })
    setup()
    expect(await screen.findByText("You've already read all the new releases!")).toBeTruthy()
  })

  it('Refresh button is absent when session is null', async () => {
    setup({ session: null })
    await screen.findByText('No new releases found yet.')
    expect(screen.queryByRole('button', { name: /Refresh/i })).toBeNull()
  })

  it('Refresh button is present when session is provided', async () => {
    setup({ session: SESSION })
    await screen.findByText('No new releases found yet.')
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeTruthy()
  })

  it('Refresh button calls supabase.functions.invoke("check-releases")', async () => {
    setup({ session: SESSION })
    await screen.findByText('No new releases found yet.')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }))
    })

    expect(mockInvoke).toHaveBeenCalledWith('check-releases')
  })

  it('shows "Last checked" timestamp after a successful refresh', async () => {
    setup({ session: SESSION })
    await screen.findByText('No new releases found yet.')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }))
    })

    expect(screen.getByText(/Last checked/)).toBeTruthy()
  })
})

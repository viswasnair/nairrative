import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiSelect from '../../src/components/MultiSelect.jsx'

const OPTIONS = ['Sci-Fi', 'Fantasy', 'History', 'Biography']

function setup(props = {}) {
  const defaults = {
    options: OPTIONS,
    selected: [],
    onChange: vi.fn(),
    placeholder: 'Select genres',
  }
  return render(<MultiSelect {...defaults} {...props} />)
}

describe('MultiSelect', () => {
  it('shows placeholder when nothing is selected', () => {
    setup({ selected: [] })
    expect(screen.getByText('Select genres')).toBeTruthy()
  })

  it('shows the item label when exactly one is selected', () => {
    setup({ selected: ['Sci-Fi'] })
    expect(screen.getByText('Sci-Fi')).toBeTruthy()
  })

  it('shows "N selected" label when more than one is selected', () => {
    setup({ selected: ['Sci-Fi', 'Fantasy'] })
    expect(screen.getByText('2 selected')).toBeTruthy()
  })

  it('dropdown is hidden initially', () => {
    setup()
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
  })

  it('opens dropdown when trigger is clicked', async () => {
    setup()
    fireEvent.click(screen.getByText('Select genres'))
    expect(screen.getByPlaceholderText('Search…')).toBeTruthy()
  })

  it('renders all options in the dropdown', async () => {
    setup()
    fireEvent.click(screen.getByText('Select genres'))
    for (const opt of OPTIONS) {
      expect(screen.getByText(opt)).toBeTruthy()
    }
  })

  it('filters options based on search text', async () => {
    const user = userEvent.setup()
    setup()
    fireEvent.click(screen.getByText('Select genres'))
    await user.type(screen.getByPlaceholderText('Search…'), 'sci')
    expect(screen.getByText('Sci-Fi')).toBeTruthy()
    expect(screen.queryByText('Fantasy')).toBeNull()
  })

  it('shows "No matches" when search yields nothing', async () => {
    const user = userEvent.setup()
    setup()
    fireEvent.click(screen.getByText('Select genres'))
    await user.type(screen.getByPlaceholderText('Search…'), 'zzz')
    expect(screen.getByText('No matches')).toBeTruthy()
  })

  it('calls onChange with item added when an unselected option is clicked', async () => {
    const onChange = vi.fn()
    setup({ selected: [], onChange })
    fireEvent.click(screen.getByText('Select genres'))
    fireEvent.click(screen.getByText('Sci-Fi'))
    expect(onChange).toHaveBeenCalledWith(['Sci-Fi'])
  })

  it('calls onChange with item removed when a selected option is clicked', async () => {
    const onChange = vi.fn()
    setup({ selected: ['Sci-Fi', 'Fantasy'], onChange })
    fireEvent.click(screen.getByText('2 selected'))
    fireEvent.click(screen.getByText('Sci-Fi'))
    expect(onChange).toHaveBeenCalledWith(['Fantasy'])
  })

  it('shows "Clear all" button when items are selected and clicking it calls onChange([])', async () => {
    const onChange = vi.fn()
    setup({ selected: ['Sci-Fi'], onChange })
    fireEvent.click(screen.getByText('Sci-Fi'))
    fireEvent.click(screen.getByText(/Clear all/))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('does not show "Clear all" when nothing is selected', () => {
    setup({ selected: [] })
    fireEvent.click(screen.getByText('Select genres'))
    expect(screen.queryByText(/Clear all/)).toBeNull()
  })
})

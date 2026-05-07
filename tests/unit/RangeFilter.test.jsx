import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RangeFilter from '../../src/components/RangeFilter.jsx'

const ALL_YEARS = [2018, 2019, 2020, 2021, 2022]
const CHART_ID = 'books-per-year'

function setup(props = {}) {
  const defaults = {
    chartId: CHART_ID,
    allYears: ALL_YEARS,
    ranges: {},
    onSet: vi.fn(),
  }
  return render(<RangeFilter {...defaults} {...props} />)
}

describe('RangeFilter', () => {
  it('renders nothing when allYears is empty', () => {
    const { container } = render(
      <RangeFilter chartId={CHART_ID} allYears={[]} ranges={{}} onSet={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders two selects (From and to)', () => {
    setup()
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
  })

  it('defaults to first year as "from" value when no range is set', () => {
    setup()
    const [fromSelect] = screen.getAllByRole('combobox')
    expect(Number(fromSelect.value)).toBe(2018)
  })

  it('defaults to last year as "to" value when no range is set', () => {
    setup()
    const [, toSelect] = screen.getAllByRole('combobox')
    expect(Number(toSelect.value)).toBe(2022)
  })

  it('uses the provided range values when a range exists', () => {
    setup({ ranges: { [CHART_ID]: { from: 2019, to: 2021 } } })
    const [fromSelect, toSelect] = screen.getAllByRole('combobox')
    expect(Number(fromSelect.value)).toBe(2019)
    expect(Number(toSelect.value)).toBe(2021)
  })

  it('calls onSet with the new "from" year when the From select changes', () => {
    const onSet = vi.fn()
    setup({ onSet, ranges: { [CHART_ID]: { from: 2018, to: 2022 } } })
    const [fromSelect] = screen.getAllByRole('combobox')
    fireEvent.change(fromSelect, { target: { value: '2020' } })
    expect(onSet).toHaveBeenCalledWith(CHART_ID, 2020, 2022)
  })

  it('calls onSet with the new "to" year when the To select changes', () => {
    const onSet = vi.fn()
    setup({ onSet, ranges: { [CHART_ID]: { from: 2018, to: 2022 } } })
    const [, toSelect] = screen.getAllByRole('combobox')
    fireEvent.change(toSelect, { target: { value: '2021' } })
    expect(onSet).toHaveBeenCalledWith(CHART_ID, 2018, 2021)
  })

  it('displays year 2010 as "Pre-2011" in the options', () => {
    setup({ allYears: [2009, 2010, 2011] })
    expect(screen.getAllByText('Pre-2011')).toHaveLength(2) // appears in both selects
  })
})

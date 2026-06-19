import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Today } from '../Today'
import { createInitialState } from '@/state/schema'
import { useStore } from '@/state/store'

describe('Today route', () => {
  it('renders the full workout flow for a lift day', () => {
    const state = createInitialState()
    const dow = String(new Date().getDay())
    state.onboarded = true
    state.config.schedule[dow] = 'squat'
    state.lifts.squat.trainingMax = 150
    useStore.setState({ status: 'ready', state, lastProgression: null })

    render(
      <MemoryRouter>
        <Today />
      </MemoryRouter>,
    )

    expect(screen.getByText('Main work')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
    expect(screen.getByText('Readiness')).toBeInTheDocument()
  })
})

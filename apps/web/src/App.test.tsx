import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('application shell', () => {
  it('identifies the project and active checkpoint', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Event Feedback Hub' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Environment and verification gate ready.'),
    ).toBeInTheDocument()
  })
})

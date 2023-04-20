/* eslint-disable */

const generateUiContainerAppTestJs = () => `
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

describe('App', () => {
  it('renders without crashing', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    const appElement = screen.getByTestId('app')
    await waitFor(() => expect(appElement).toBeInTheDocument())
  })
})
`

module.exports = { generateUiContainerAppTestJs }

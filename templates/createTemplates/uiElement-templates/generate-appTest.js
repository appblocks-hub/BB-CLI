/* eslint-disable */

const generateUiElementAppTestJs = () => `
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './src/App'

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

module.exports = { generateUiElementAppTestJs }

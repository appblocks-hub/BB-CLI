/* eslint-disable */

const generateUiContainerAppJs = () => `
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import AppRoute from './remote/common/routes/appRoute'

const App = () => {
  const handleError = (error, errorInfo) => {
    // handle error
    console.log(error, errorInfo)
  }

  return (
    <ErrorBoundary fallback={<ErrorFallback />} onError={handleError}>
      <div className="App" data-testid="app">
        <React.Suspense fallback="">
          <AppRoute />
        </React.Suspense>
      </div>
    </ErrorBoundary>
  )
}

// Provide a fallback UI for the ErrorBoundary component
function ErrorFallback() {
  return <div>Something went wrong.</div>
}

export default App
`

module.exports = { generateUiContainerAppJs }

import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import FallbackUI from './remote/common/fallbackUI/fallbackUI.tsx'
import AppRoute from './remote/common/routes/appRoute.tsx'
import Header from './remote/components/Header/index.tsx'

const App = () => {
  const handleError = (error:Error, errorInfo:any) => {
    // handle error
    console.log(error, errorInfo)
  }

  return (
    <ErrorBoundary FallbackComponent={FallbackUI} onError={handleError} >
      <React.Suspense fallback="">
        <Header />
        <div className="w-1/2 mx-auto p-8 mt-8 border-dashed border-2 border-sky-500">
          <h1>Container</h1>
          <AppRoute />
        </div>
      </React.Suspense>
    </ErrorBoundary>
  )
}

export default App

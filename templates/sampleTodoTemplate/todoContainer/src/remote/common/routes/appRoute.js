import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

const AppRoute = () => {
  const Home = lazy(() => import('../../components/Home'))

  return (
    <Suspense fallback="">
      <Routes>
        <Route path="/" element={<Home />} exact />
      </Routes>
    </Suspense>
  )
}

export default AppRoute

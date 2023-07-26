import React,{ Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

const AppRoute = () => {
  const Home = lazy(() => import('../../components/Home/index.tsx'))

  return (
    <Suspense fallback="">
      <Routes>
        <Route path="/" element={<Home />}  />
      </Routes>
    </Suspense>
  )
}

export default AppRoute

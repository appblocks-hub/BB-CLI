/* eslint-disable */

const generateUiContainerAppJs = () => `
import React, { lazy } from 'react'
import { Suspense } from 'react'
import env from 'env'

function App() {
  return (
      <h1>Container</h1>
  )
}

export default App`

module.exports = { generateUiContainerAppJs }

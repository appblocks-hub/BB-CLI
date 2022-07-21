/* eslint-disable */

const generateUiElementBootstrapJs = () => `import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
ReactDOM.render(<App />, document.getElementById('root'))
`

module.exports = { generateUiElementBootstrapJs }

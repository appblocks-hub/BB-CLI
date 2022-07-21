/* eslint-disable */

const generateUiContainerBootstrapJs = () => `
import App from './App'
import React from 'react'
import ReactDOM from 'react-dom'

ReactDOM.render(<App />, document.getElementById('root'))
`

module.exports = { generateUiContainerBootstrapJs }

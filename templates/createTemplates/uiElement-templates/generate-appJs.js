/* eslint-disable */
const { capitalize } = require('../../../utils/capitalize')
const generateUiElementAppJs = (name) => `import React from 'react'
import ${capitalize(name)} from './${name}'
export default function App() {
  return (
    <div>
      <${capitalize(name)}/>
    </div>
  )
}
`

module.exports = { generateUiElementAppJs }

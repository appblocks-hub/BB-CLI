/* eslint-disable */

const { capitalize } = require('../../../utils/capitalize')

const generateUiElementJs = (name) => `import React from 'react'
// import env from 'env'
export const ${capitalize(name)} = () => {
  return (
   <p>Hello from ${name} </p>
  )
}
export default ${capitalize(name)}`

module.exports = { generateUiElementJs }

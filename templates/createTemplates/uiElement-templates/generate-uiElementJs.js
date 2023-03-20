/* eslint-disable */

const { capitalize } = require('../../../utils/capitalize')

const generateUiElementJs = (name) => `
import React from 'react'

export const ${capitalize(name)} = () => {
  return (
   <p>Hello from ${name} </p>
  )
}
export default ${capitalize(name)}`

module.exports = { generateUiElementJs }

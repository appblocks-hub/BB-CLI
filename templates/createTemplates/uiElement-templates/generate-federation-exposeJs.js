const generateUiElementFederationExpose = (name) =>
  `
export default {
    "./${name}": "./src/remote/${name}",
}
`.trim()

module.exports = { generateUiElementFederationExpose }

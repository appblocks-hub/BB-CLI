const generateUiElementFederationExpose = (name) => `
export default {
    "./${name}": "./src/remote/${name}",
}
`

module.exports = { generateUiElementFederationExpose }

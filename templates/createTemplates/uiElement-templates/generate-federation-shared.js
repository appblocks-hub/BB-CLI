const generateUiElementFederationShared = () =>
  `
export default {
  '@appblocks/js-sdk': {
    import: '@appblocks/js-sdk',
    shareKey: '@appblocks/js-sdk',
    shareScope: 'default',
    singleton: true,
    version: '^0.0.11',
  },
}
`.trim()

module.exports = { generateUiElementFederationShared }

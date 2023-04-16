const generateCommitlintRc = () => `
{ "extends": ["@commitlint/config-conventional"] }
`
module.exports = { generateUiContainerCommitlintRc: generateCommitlintRc }

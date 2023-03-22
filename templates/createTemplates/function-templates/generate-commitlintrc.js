const generateCommitlintRc = () => `
{ "extends": ["@commitlint/config-conventional"] }
`
module.exports = { generateFunctionCommitlintRc: generateCommitlintRc }

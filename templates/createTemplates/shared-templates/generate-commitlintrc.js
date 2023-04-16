const generateCommitlintRc = () => `
{ "extends": ["@commitlint/config-conventional"] }
`
module.exports = { generateSharedFunctionCommitlintRc: generateCommitlintRc }

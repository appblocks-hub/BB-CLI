const { generateGitIgnore } = require('./generate-gitignore')
const { generateSharedFunctionIndex } = require('./generate-index')
const { generateSharedFunctionPackageJson } = require('./generate-packageJson')
const { generateSharedFunctionReadme } = require('./generate-readme')
const { generateSharedFunctionPrettierRc } = require('./generate-prettierrc')
const { generateSharedFunctionCommitlintRc } = require('./generate-commitlintrc')
const { generateSharedFunctionEsLintRc } = require('./generate-eslintrc')
module.exports = {
  generateGitIgnore,
  generateSharedFunctionIndex,
  generateSharedFunctionPackageJson,
  generateSharedFunctionReadme,
  generateSharedFunctionPrettierRc,
  generateSharedFunctionCommitlintRc,
  generateSharedFunctionEsLintRc,
}

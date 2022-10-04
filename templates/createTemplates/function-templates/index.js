const { generateGitIgnore } = require('./generate-gitignore')
const { generateIndex } = require('./generate-index')
const { generatePackageJson } = require('./generate-packageJson')
const { generateFunctionReadme } = require('./generate-readme')
module.exports = {
  generateGitIgnore,
  generatePackageJson,
  generateIndex,
  generateFunctionReadme,
}

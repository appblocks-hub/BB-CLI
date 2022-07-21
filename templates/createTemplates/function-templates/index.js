const { generateGitIgnore } = require('./generate-gitignore')
const { generateIndex } = require('./generate-index')
const { generatePackageJson } = require('./generate-packageJson')

module.exports = {
  generateGitIgnore,
  generatePackageJson,
  generateIndex,
}

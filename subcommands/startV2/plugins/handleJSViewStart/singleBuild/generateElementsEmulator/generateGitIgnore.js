const generateGitIgnore = `
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
node_modules
/.pnp
.pnp.js
dist
.vscode

# testing
/coverage

# production
/build

# misc
.DS_Store

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`

module.exports = { generateGitIgnore }

const path = require('path')
const { existsSync, writeFileSync, mkdirSync } = require('fs')
const { generateGitIgnore } = require('./generateGitIgnore')
const { generateWebpackConfig } = require('./generateWebpackConfig')
const { generatePublicIndex } = require('./generatePublicIndex')

const generateElementsEmulator = async (emPath, options) => {
  const publicFolder = path.join(emPath, 'public')
  const srcPath = path.join(emPath, 'src')
  const gitIgnorePath = path.join(emPath, '.gitignore')
  const webpackConfigPath = path.join(emPath, 'webpack.config.js')

  if (!existsSync(emPath)) {
    mkdirSync(emPath, { recursive: true })
  }

  if (!existsSync(srcPath)) {
    mkdirSync(srcPath, { recursive: true })
  }

  if (!existsSync(publicFolder)) {
    mkdirSync(publicFolder, { recursive: true })
  }

  writeFileSync(gitIgnorePath, generateGitIgnore)
  writeFileSync(webpackConfigPath, generateWebpackConfig(options))
  writeFileSync(path.join(publicFolder, 'index.html'), generatePublicIndex())
}

module.exports = generateElementsEmulator

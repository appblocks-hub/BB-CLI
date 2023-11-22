const { existsSync } = require('fs')
const path = require('path')

async function handleCmdOptionPlugin(cmdOpts, core) {
  const { default: Plugin } = await import(path.resolve(cmdOpts.plugin))
  new Plugin(cmdOpts.pluginOption).apply(core)
}

async function readBBConfigFile(configFilepath) {
  try {
    const filePath = configFilepath || 'bb.config.js'
    const relativePath = path.resolve(filePath)

    if (!existsSync(relativePath)) return {}

    const { default: configFileContent } = await import(relativePath)

    // Ensure that the content is an object (config)
    if (typeof configFileContent === 'object' && configFileContent !== null) {
      return configFileContent
    }

    console.error('\nError: The bb config file should export an object.')
    return {}
  } catch (error) {
    throw new Error(`\nError reading the The bb config file: ${error.message}`)
  }
}

module.exports = { readBBConfigFile, handleCmdOptionPlugin }

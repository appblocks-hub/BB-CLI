const { existsSync } = require('fs')
const path = require('path')

async function handleCmdOptionPlugin(cmdOpts, core) {
  const { default: Plugin } = await import(path.resolve(cmdOpts.plugin))
  new Plugin(cmdOpts.pluginOption).apply(core)
}

async function handleBBConfigPlugin(configFilepath, core) {
  const bbConfig = await readBBConfigFile(configFilepath)
  if (!bbConfig.plugins?.length) return
  
  bbConfig.plugins.forEach((plugin) => {
    try {
      plugin.apply(core)
    } catch (error) {
      const tapPromiseErr = `Cannot read properties of undefined (reading 'tapPromise')`
      if (!error.message.includes(tapPromiseErr)) throw error
    }
  })
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

module.exports = { readBBConfigFile, handleCmdOptionPlugin, handleBBConfigPlugin }

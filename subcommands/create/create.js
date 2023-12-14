const { spinnies } = require('../../loader')
const { Logger } = require('../../utils/logger')
const CreateCore = require('./createCore')
const HandleBeforeCreate = require('./plugins/handleBeforeCreate')
const HandleFunctions = require('./plugins/handleFunction')
const HandleMultiRepo = require('./plugins/handleMultiRepo')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const HandlePackageBlock = require('./plugins/handlePackageBlock')
const HandleSharedFunction = require('./plugins/handleSharedFunction')
const HandleUIContainer = require('./plugins/handleUIContainer')
const HandleUIDependency = require('./plugins/handleUIDependency')
const HandleUIElement = require('./plugins/handleUIElement')
const { handleBBConfigPlugin } = require('../../utils/plugins')

async function create(blockName, cmdOptions) {
  const { logger } = new Logger('create')
  const core = new CreateCore(blockName, cmdOptions, { logger, spinnies })

  try {
    new HandleOutOfContext().apply(core)
    new HandleBeforeCreate().apply(core)
    new HandlePackageBlock().apply(core)
    new HandleFunctions().apply(core)
    new HandleSharedFunction().apply(core)
    new HandleUIElement().apply(core)
    new HandleUIContainer().apply(core)
    new HandleUIDependency().apply(core)
    new HandleMultiRepo().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(cmdOptions.configPath, core)


    await core.initializePackageConfigManager()
    await core.createBlock()
  } catch (error) {
    logger.error(error)
    spinnies.add('create', { text: error.message })
    spinnies.fail('create', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = create

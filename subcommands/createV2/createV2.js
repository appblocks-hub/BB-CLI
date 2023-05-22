/* eslint-disable */
const { spinnies } = require('../../loader')
const { Logger } = require('../../utils/loggerV2')
const CreateCore = require('./createCore')
const handleBeforeCreate = require('./plugins/handleBeforeCreate')
const handleFunctions = require('./plugins/handleFunction')
const handleMultiRepo = require('./plugins/handleMultiRepo')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const handleSharedFunction = require('./plugins/handleSharedFunction')
const handleUIContainer = require('./plugins/handleUIContainer')
const handleUIDependency = require('./plugins/handleUIDependency')
const handleUIElement = require('./plugins/handleUIElement')

async function create(blockName, cmdOptions) {
  const { logger } = new Logger('create')
  const Create = new CreateCore(blockName, cmdOptions, { logger, spinnies })

  try {
    new HandleOutOfContext().apply(Create)
    new handleBeforeCreate().apply(Create)
    new handleFunctions().apply(Create)
    new handleSharedFunction().apply(Create)
    new handleUIElement().apply(Create)
    new handleUIContainer().apply(Create)
    new handleUIContainer().apply(Create)
    new handleUIDependency().apply(Create)
    new handleMultiRepo().apply(Create)

    await Create.initializePackageConfigManager()
    await Create.createBlock()
  } catch (error) {
    console.log(error)
    logger.error(error)
    spinnies.add('create', { text: error.message })
    spinnies.fail('create', { text: error.message })
    spinnies.stopAll()
  }
}

module.exports = create

/* eslint-disable */
const { spinnies } = require('../../loader')
const { Logger } = require('../../utils/loggerV2')
const CreateCore = require('./createCore')
const handleMultiRepo = require('./plugins/handleMultiRepo')
const HandleOutOfContext = require('./plugins/handleOutOfContext')

async function create(blockName, cmdOptions) {
  const { logger } = new Logger('create')
  const Create = new CreateCore(blockName, cmdOptions, { logger, spinnies })

  new HandleOutOfContext().apply(Create)
  new handleMultiRepo().apply(Create)

  await Create.initializeAppConfig()
  await Create.createBlock()
}

module.exports = create

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')

const { transports } = require('winston')
const { appConfig } = require('../../utils/appconfigStore')
const pullAppblock = require('../../utils/pullAppblock')
const { spinnies } = require('../../loader')
const { getBlockDetails } = require('../../utils/registryUtils')
const { feedback } = require('../../utils/cli-feedback')
const { pullBlock, handleOutOfContextCreation } = require('./util')
const { logger } = require('../../utils/logger')

const pull = async (componentNameWithVersion, options, { cwd = '.' }) => {
  const [componentName, componentVersion] = componentNameWithVersion.split('@')

  logger.add(new transports.File({ filename: 'pull.log' }))
  logger.info(`pull ${componentName} in cwd:${cwd}`)
  /**
   * @type {import('../../utils/jsDoc/types').blockDetailsdataFromRegistry}
   */
  let metaData

  spinnies.add('blockExistsCheck', { text: `Searching for ${componentName}` })

  try {
    /**
     * @type {{status:number,data:{err:string,data:import('../../utils/jsDoc/types').blockDetailsdataFromRegistry,msg:string}}}
     */
    const {
      status,
      data: { err, msg, data: blockDetails },
    } = await getBlockDetails(componentName)

    if (status === 204) {
      spinnies.fail('blockExistsCheck', { text: `${componentName} doesn't exists in block repository` })
      logger.error(`${componentName} not in registry: 204 return`)
      return
    }
    if (err) {
      logger.error(`Error from regsitry: ${msg}`)
      throw new Error(msg).message
    }

    metaData = blockDetails

    await appConfig.init(cwd, null, 'pull')
    logger.info(`appConfig init okay`)

    spinnies.succeed('blockExistsCheck', { text: `${componentName} is available` })
    spinnies.remove('blockExistsCheck')
    logger.info(`${componentName} is available`)

    if (appConfig.isOutOfContext && metaData.BlockType !== 1) {
      /**
       * User is trying to create block not from inside a pacakge block
       */
      logger.info('calling handle out of context creation')
      await handleOutOfContextCreation()
      return
    }

    if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
      /**
       * User is trying to pull a block to a block of type other than pacakage block
       */
      logger.error('Need to be inside and Appblock to pull other blocks')
      throw new Error('Need to be inside an Appblock to pull other blocks')
    }

    if (metaData.BlockType === 1 && !appConfig.isOutOfContext) {
      /**
       * User is trying to pull a package block into a block of another type
       */
      logger.error('Trying to pull appblock to non appblock type')
      throw new Error(`Cannot pull appBlocks,\n ${chalk.yellow(metaData.BlockName)} is an appBlock`).message
    }

    if (metaData.BlockType === 1) {
      logger.info('calling pullAppblock')
      const res = await pullAppblock(componentName)
      process.exit(res ? 0 : 1)
    }

    if (metaData.BlockType !== 1 && appConfig.isInAppblockContext) {
      logger.info('calling pullBlock')
      await pullBlock(metaData, appConfig, cwd, componentName, {
        args: options,
        componentVersion,
      })
    }

    process.exit()
  } catch (err) {
    // console.log('Something went wrong while getting block details..')
    spinnies.add('blockExistsCheck')
    console.log('index.js')

    let message = err.message || err

    if (err.response?.status === 401 || err.response?.status === 403) {
      message = `Access denied for block ${componentName}`
    }

    logger.error(`error in catch:${message}`)
    spinnies.fail('blockExistsCheck', { text: `Something went wrong` })
    feedback({ type: 'info', message })
    spinnies.remove('blockExistsCheck')
    process.exit(1)
  }
}

module.exports = pull

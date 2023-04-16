/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')

const path = require('path')
const { existsSync, readFileSync } = require('fs')
const { transports } = require('winston')
const { appConfig } = require('../../utils/appconfigStore')
const { pullPackage } = require('./pullPackage')
const { spinnies } = require('../../loader')
const { getBlockDetails, getBlockMetaData } = require('../../utils/registryUtils')
const { feedback } = require('../../utils/cli-feedback')
const { pullBlock, handleOutOfContextCreation } = require('./util')
const { logger } = require('../../utils/logger')
const { confirmationPrompt } = require('../../utils/questionPrompts')

const pull = async (pullBlockData, options, { cwd = '.' }) => {
  logger.add(new transports.File({ filename: `./pull.log` }))

  const cwdValue = pullBlockData ? cwd : '../'

  await appConfig.init(cwdValue, null, 'pull', { reConfig: true })

  let hasBlockId = options.id
  let pullId = pullBlockData

  let componentName
  let componentVersion
  let metaData = {}

  logger.info(`appConfig init okay`)
  try {
    ;[componentName, componentVersion] = pullBlockData?.startsWith('@')
      ? pullBlockData?.replace('@', '')?.split('@') || []
      : pullBlockData?.split('@') || []

    if (!componentName && !hasBlockId) {
      if (!existsSync(appConfig.blockConfigName)) {
        throw new Error('Block name or Block config not found')
      }
      const config = JSON.parse(readFileSync(appConfig.blockConfigName))
      if (!config.blockId) throw new Error('Block ID not found in block config')

      componentName = config.name

      const goAhead = await confirmationPrompt({
        message: `You are trying to pull ${componentName} by config ?`,
        default: false,
        name: 'goAhead',
      })

      if (!goAhead) {
        feedback({ type: 'error', message: `Process cancelled` })
        throw new Error('Process cancelled')
      }

      hasBlockId = true
      pullId = config.blockId
      metaData.pull_by_config = true
      metaData.block_config = config
      metaData.pull_by_config_folder_name = path.basename(path.resolve())
    }

    logger.add(new transports.File({ filename: 'pull.log' }))
    logger.info(`pull ${componentName} in cwd:${cwdValue}`)
    /**
     * @type {import('../../utils/jsDoc/types').blockDetailsdataFromRegistry}
     */

    /**
     * @type {{status:number,data:{err:string,data:import('../../utils/jsDoc/types').blockDetailsdataFromRegistry,msg:string}}}
     */

    spinnies.add('blockExistsCheck', { text: `Searching for ${componentName}` })

    // check if pull by id
    if (hasBlockId) {
      const c = await getBlockMetaData(pullId)

      if (c.data.err) {
        throw new Error(c.data.msg)
      }

      if (c.status === 204) {
        spinnies.fail('blockExistsCheck', { text: `${componentName} doesn't exists in block repository` })
        logger.error(`${componentName} not in registry: 204 return`)
        return
      }

      const blockMeta = c.data?.data
      metaData = { ...metaData, ...blockMeta, id: blockMeta.block_id }

      componentName = metaData.block_name
      componentVersion = null
    } else {
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
        logger.error(`Error from registry: ${msg}`)
        throw new Error(msg).message
      }
      metaData = { ...metaData, ...blockDetails }
    }

    spinnies.succeed('blockExistsCheck', { text: `${componentName} is available` })
    spinnies.remove('blockExistsCheck')
    logger.info(`${componentName} is available`)

    if (appConfig.isOutOfContext && metaData.block_type !== 1) {
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
      logger.error('Need to be inside a package to pull other blocks')
      throw new Error('Need to be inside a package to pull other blocks')
    }

    if (metaData.block_type === 1 && !appConfig.isOutOfContext) {
      /**
       * User is trying to pull a package block into a block of another type
       */
      logger.error('Trying to pull package block to non package block type')
      throw new Error(`Cannot pull package block,\n ${chalk.yellow(metaData.block_name)} is an package block`).message
    }

    if (metaData.block_type === 1) {
      logger.info('calling pullPackage')
      await pullPackage({ metaData, componentName, args: options, componentVersion })
    } else if (metaData.block_type !== 1 && appConfig.isInAppblockContext) {
      logger.info('calling pullBlock')
      await pullBlock(metaData, appConfig, cwdValue, componentName, {
        args: options,
        componentVersion,
      })
    }

    process.exit()
  } catch (err) {
    // console.log('Something went wrong while getting block details..')
    spinnies.add('blockExistsCheck')

    let message = err.message || err

    if (err.response?.status === 401 || err.response?.status === 403) {
      message = `Access denied for block ${componentName}`
    }

    logger.error(`error in catch:${message}`)
    spinnies.fail('blockExistsCheck', { text: message })
    spinnies.stopAll()

    process.exit(1)
  }
}

module.exports = pull

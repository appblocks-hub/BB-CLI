const path = require('path')
const chalk = require('chalk')

const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')

const { Logger } = require('../../utils/logger')
const { pexec } = require('../../utils/execPromise')
const { BB_CONFIG_NAME } = require('../../utils/constants')

async function runTest(options) {
  const { inside } = options

  const command = 'npm run test'
  const CONFIGNAME = BB_CONFIG_NAME

  const { logger } = new Logger('run_test')
  logger.info('RUN TEST COMMAND STARTED')

  /**
   * Checks if passed manager name is in the names list given by the user
   * @param {PackageConfigManager | BlockConfigManager} c a manager
   * @returns {boolean}
   */
  const nameSatisfies = (c) => {
    if (inside.length === 0) return true
    return inside.includes(c.config.name)
  }

  /**
   * For debug alone
   */
  logger.debug(`insideList-${inside.join(',')}`)

  const { manager, e } = await ConfigFactory.create(path.resolve(CONFIGNAME))

  if (e?.err) {
    logger.error(e.err.message)
    console.log(e.err.message)
    process.exitCode = 1
    return
  }

  /**
   * @type {Array<string>}
   */
  const pathList = []
  /**
   * @type {Array<string>}
   */
  const roots = []

  if (manager instanceof PackageConfigManager) {
    logger.info('User is inside a package')
    roots.push(manager)
    for (; roots.length > 0; ) {
      const root = roots.pop()
      for await (const m of root.getDependencies()) {
        if (m instanceof PackageConfigManager) {
          logger.info('User is inside a package')
          roots.push(m)
        }
        if (m instanceof BlockConfigManager) {
          logger.info('User is inside a block')
          if (!nameSatisfies(m)) {
            logger.info(`You are inside a block (${m.config.name}) & it does not match any of the given block names`)
            continue
          }
          pathList.push(m)
        }
      }
    }
  }

  if (manager instanceof BlockConfigManager) {
    logger.info('User is inside a block')
    if (!nameSatisfies(manager)) {
      logger.info(`You are inside a block (${manager.config.name}) & it does not match any of the given block names`)
    }
    pathList.push(manager)
  }

  console.log(`\ntests will be run in the following blocks\n`)
  pathList.forEach((v) => {
    console.log(`${chalk.blue(v.config.name)} : ${chalk.italic(v.directory)}`)
    logger.info(v.directory)
  })
  console.log('\n')
  await Promise.allSettled(pathList.map((l) => pexec(command, { cwd: l.directory }, l.config.name))).then((res) => {
    res.forEach((v) => {
      const colour = v.value.err ? chalk.red : chalk.green
      console.log('\n\n', colour(v.value.data), ' : ', colour(v.value.err ? v.value.err : 'Passed'), v.value.out)

      // console.log(generateHyperlink(url, linkText))

      // table.push(rowGenerate(v.value.data), url, v.value.err)
      // console.log(!v.value.err)
    })
  })
  // console.log(table.toString())
}

module.exports = runTest

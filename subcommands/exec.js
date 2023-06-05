const path = require('path')
const { exec } = require('child_process')
const chalk = require('chalk')
const ConfigFactory = require('../utils/configManagers/configFactory')
const { Logger } = require('../utils/loggerV2')
const PackageConfigManager = require('../utils/configManagers/packageConfigManager')
const BlockConfigManager = require('../utils/configManagers/blockConfigManager')
const { BB_CONFIG_NAME } = require('../utils/constants')

function pexec(cmd, options, name) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        // eslint-disable-next-line prefer-promise-reject-errors
        resolve({ name, out: stderr.toString(), err: true })
        return
      }
      resolve({ name, out: stdout.toString(), err: false })
    })
  })
}
async function bbexecV2(command, options) {
  const CONFIGNAME = BB_CONFIG_NAME

  const { logger } = new Logger('exec')
  logger.info('EXEC COMMAND STARTED')

  const { groups, inside, types, limit } = options

  /**
   *
   * @param {PackageConfigManager | BlockConfigManager} c a manager
   * @returns {boolean}
   */
  const typeSatisfies = (c) => {
    if (types.length === 0) return true
    return types.includes(c.config.type)
  }

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
   *
   * @param {PackageConfigManager | BlockConfigManager} c a manager
   * @returns {boolean}
   */
  const groupSatisfies = (c) => {
    if (groups.length === 0) return true
    const pathBits = c.pathRelativeToParent.split(path.sep)
    return pathBits.some((b) => groups.includes(b))
  }

  /**
   * For debug alone
   */
  logger.debug(`groupList-${groups.join(',')}`)
  logger.debug(`insideList-${inside.join(',')}`)
  logger.debug(`typelist-${types.join(',')}`)
  logger.debug(`limit-${limit}`)

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

  // If inside a package, traverse the tree and build pathList
  if (manager instanceof PackageConfigManager) {
    logger.info('User is inside a package')
    roots.push(manager)
    for (; roots.length > 0; ) {
      const root = roots.pop()
      for await (const m of root.getDependencies()) {
        if (m instanceof PackageConfigManager) {
          roots.push(m)
        }
        if (!groupSatisfies(m)) continue
        if (!nameSatisfies(m)) continue
        if (!typeSatisfies(m)) continue
        pathList.push(m)
      }
    }
  }

  if (manager instanceof BlockConfigManager) {
    logger.info('User is inside a block')
    // If inside a block, Check if conditions satisfy
    if (!groupSatisfies(manager)) {
      console.log(`You are inside a block (${manager.config.name}) & is not inside any of the given groups`)
    }
    if (!nameSatisfies(manager)) {
      console.log(`You are inside a block (${manager.config.name}) & it does not match any of the given block names`)
    }
    if (!typeSatisfies(manager)) {
      console.log(`You are inside a block (${manager.config.name}) & it does not match any of the given block types`)
    }
    // if all conditions satisfy, add current block directory to pathList

    pathList.push(manager)
  }

  console.log(`\n${chalk.whiteBright(command)} will be run in the following blocks\n`)
  pathList.forEach((v) => {
    console.log(`${chalk.blue(v.config.name)} : ${chalk.italic(v.directory)}`)
    logger.info(v.directory)
  })
  console.log('\n')
  Promise.allSettled(pathList.map((l) => pexec(command, { cwd: l.directory }, l.config.name))).then((res) => {
    res.forEach((v) => {
      const colour = v.value.err ? chalk.red : chalk.green
      console.log(colour(v.value.name))
      console.log(`${v.value.out}\n`)
    })
  })
}
module.exports = bbexecV2

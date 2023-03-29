/**
 * Action for bb-start
 */

/**
 * @typedef bbStartCommandOptions
 * @type {object}
 * @property {boolean} usePnpm
 */
/**
 * @typedef bbStartCommandArguments
 *
 */

const { readFile } = require('fs/promises')
const path = require('path')
const { AsyncSeriesHook, AsyncSeriesBailHook, AsyncSeriesWaterfallHook } = require('tapable')
// eslint-disable-next-line no-unused-vars
const { AppblockConfigManager } = require('../../utils/appconfig-manager')
const { appConfig } = require('../../utils/appconfigStore')

/**
 * TODO: this should happen in appConfig.init()
 * Finds a package for the current block by moving up the dir tree
 * @param {string} name block name
 * @param {string} dirPath block path
 */
const findMyParentPackage = async (name, myPath, filename) => {
  let parentPackageFound = false
  let parentPackageConfig
  let currentPath = myPath
  let parent = path.dirname(currentPath)
  for (; parent !== currentPath && !parentPackageFound; currentPath = parent, parent = path.dirname(parent)) {
    const { data, err } = await readJsonAsync(path.join(parent, filename))
    if (err) continue
    if (data.type !== 'package') continue
    if (!Object.prototype.hasOwnProperty.call(data.dependencies, name)) continue
    parentPackageFound = true
    parentPackageConfig = { ...data }
  }
  return {
    data: { parent, parentPackageConfig },
    err: currentPath === parent ? `Path exhausted! Couldn't find a package block with ${name} in dependencies` : false,
  }
}

/**
 * What does start do?
 * Load the environment. this includes loading appconfig manager
 * Decide single or multiple or all blocks to start
 * Group the type of blocks to start
 *
 */
class StartCore {
  constructor(blockname, options) {
    this.cmdArgs = { blockname }
    this.cmdOpts = { ...options }
    this.hooks = {
      beforeEnv: new AsyncSeriesBailHook(),
      /**
       * @type {AsyncSeriesBailHook}
       */
      afterEnv: new AsyncSeriesBailHook(['core', 'config']),
      beforeAppConfigInit: new AsyncSeriesHook(),
      afterAppConfigInit: new AsyncSeriesBailHook(),
      /**
       * this.blocksToStart gets filled before grouping
       */
      beforeGroupingBlocks: new AsyncSeriesWaterfallHook(['core', 'config']),
      afterGroupingBlocks: new AsyncSeriesWaterfallHook(['core', 'config']),
      /**
       * Find free ports for each block in group here,
       * preferably consecutive numbers for blocks in one group
       */
      buildEmulator: '',
      buildFnEmulator: new AsyncSeriesHook(['core', 'config']),
      buildJobEmulator: new AsyncSeriesHook(['core', 'config']),
      buildSharedFnEmulator: new AsyncSeriesHook(['core', 'config']),
      /**
       * Building emulator is totaly in hands of user of this class
       */
    }

    /**
     * @type {Array<string>}
     */
    this.blocksToStart = []

    /**
     * @type {Iterable<{type:string,blocks:Array}>}>}
     */
    this.blockGroups = {}
  }

  async setEnvironment() {
    global.rootDir = process.cwd()
    global.usePnpm = false
    await appConfig.initV2()
    if (!appConfig.isInAppblockContext && appConfig.isInBlockContext) {
      /**
       * If blockname is given, but is not same as the block directory user is in, return error
       * eg: bb start ui , called from pck/addTodo
       */
      if (this.cmdArgs.blockname && this.cmdArgs.blockname !== appConfig.getName()) {
        return {
          data: '',
          err: `cannot start ${this.cmdArgs.blockname} from ${appConfig.getName()}`,
        }
      }
      /**
       * Find the package block user is in, and init that as appConfig
       * eg: bb start addTodo, called from pck/a/b/c/addTodo. find path to pck & init from that dir
       */
      const {
        data: { parent },
        err,
      } = await findMyParentPackage(this.cmdArgs.blockname || appConfig.getName(), process.cwd(), appConfig.configName)
      if (err) return { data: '', err }
      this.cmdArgs.blockname = appConfig.getName()
      global.rootDir = parent
      await appConfig.initV2(parent, null, 'start', { reConfig: true })
    }
    const f = await this.hooks.afterEnv?.promise(this, appConfig)
    if (f) return { data: '', err: f }
    return { data: '', err: false }
  }

  /**
   * Block to start will be grouped here
   * When grouping, If there are package blocks, each type in package block
   * should be inside type itself
   * i.e if inside pck1, there are pck12 & pck13
   * the group should look like
   * {...
   *  function:[
   *    {addTodo...},{pck12/addTodo},{pck13/addtTodo}
   *  ]
   * }
   * By doing it like this, later in bb start, fn emulator can set this as path
   * iF blocks inside are for auth, it'll look like 5000/auth/fn
   */
  async groupBlocks() {
    this.blocksToStart = this.cmdArgs.blockname ? [this.cmdArgs.blockname] : [...appConfig.allBlockNames]

    this.blockGroups = {
      'ui-container': [
        ...appConfig.getDependencies(
          true,
          (block) => ['ui-container'].includes(block.meta.type) && this.blocksToStart.includes(block.meta.name)
        ),
      ],
      'ui-elements': [
        ...appConfig.getDependencies(
          true,
          (block) => ['ui-elements'].includes(block.meta.type) && this.blocksToStart.includes(block.meta.name)
        ),
      ],
      function: [
        ...appConfig.getDependencies(
          true,
          (block) => ['function'].includes(block.meta.type) && this.blocksToStart.includes(block.meta.name)
        ),
      ],
      'shared-fn': [
        ...appConfig.getDependencies(
          true,
          (block) => ['shared-fn'].includes(block.meta.type) && this.blocksToStart.includes(block.meta.name)
        ),
      ],
      job: [...appConfig.jobBlocks],
      data: [],
      *[Symbol.iterator]() {
        for (const type in this) {
          if (Object.hasOwnProperty.call(this, type)) {
            yield { type, blocks: this[type] }
          }
        }
      },
    }

    const _g = await this.hooks.afterGroupingBlocks.promise(this, appConfig)
    // console.log(g)
  }

  async buildEmulators() {
    await this.hooks.buildFnEmulator?.promise(this, appConfig)
    await this.hooks.buildJobEmulator?.promise(this, appConfig)
    await this.hooks.buildSharedFnEmulator?.promise(this, appConfig)
  }

  /**
   * Frees the uused locked ports
   */
  async cleanUp() {
    for (const { blocks } of this.blockGroups) {
      blocks.forEach((v) => v.key.abort())
    }
    for (const { blocks } of this.blockGroups) {
      blocks.forEach((v) => v.key.abort())
    }
  }
}

async function readJsonAsync(s) {
  if (typeof s !== 'string') return { data: null, err: true }
  try {
    const file = await readFile(s)
    const data = JSON.parse(file)
    return { data, err: null }
  } catch (err) {
    return { data: null, err }
  }
}
module.exports = StartCore

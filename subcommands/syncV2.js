// const FilterBlocksPlugin = require('./syncV2/plugins/filterBlocksStrategy')
const RegisterNewBlocksPlugin = require('./syncV2/plugins/registerNewBlocksStrategy')
const ReRegisterBlocksStrategy = require('./syncV2/plugins/reRegisterBlocksStrategy')
const SyncCore = require('./syncV2/syncCore')

/**
 *
 * @param {SyncCore} core
 */
// function filterBlocks(core) {}
async function Sync() {
  const t = new SyncCore()
  /**
   * Apply all plugins
   */
  // new FilterBlocksPlugin().apply(t)
  new RegisterNewBlocksPlugin().apply(t)
  new ReRegisterBlocksStrategy().apply(t)
  // t.hooks.onLocalConfigLoad.tapAsync('validatePlugin', (callback) => {
  //   console.log('validatePlugin', callback)
  //   callback()
  // })
  // t.hooks.onLocalConfigLoad.tapAsync('middleValidatePlugin', (callback) => {
  //   console.log('middlevalidatePlugin')
  //   const x = true
  //   if (x) return true

  //   callback()
  // })
  // t.hooks.onLocalConfigLoad.tapAsync('finalValidatePlugin', (callback) => {
  //   console.log('finalvalidatePlugin')
  //   callback()
  // })
  t.hooks.afterEnv.tap('byeByePlugin', (arg2) => console.log('afterEnv one', arg2))
  t.hooks.beforeWalk.tapPromise('beforeWlakPLugin', async () => {
    console.log('before walk')
  })
  // t.hooks.beforeGenerateConfig.tapAsync('validateConfigs', filterBlocks)
  await t.setEnvironment()
  await t.scanDirs()
  await t.buildDepList()
}

module.exports = Sync

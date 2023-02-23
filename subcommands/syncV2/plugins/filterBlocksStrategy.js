const { readFile } = require('fs/promises')
const path = require('path')
// const { blockConfigSchema } = require('../../../utils/schema')
// const SyncCore = require('../syncCore')

class FilterBlocksPlugin {
  // validateBlockConfig(appConfiginLocal) {
  //   try {
  //     blockConfigSchema.validateSync(appConfiginLocal, { abortEarly: false })
  //   } catch (err) {
  //     //   console.log(err)
  //     console.log(err.errors)
  //     // validationData.summary = err.errors
  //     // validationData.isErrored = true
  //     // err?.inner?.forEach((e) =>
  //     //   validationData.detailedReport.push({
  //     //     path: e.path,
  //     //     type: e.type,
  //     //     value: e.value,
  //     //     params: e.params,
  //     //     inner: e.inner,
  //     //     errors: e.errors,
  //     //   })
  //     // )
  //   }
  // }

  apply(syncer) {
    syncer.hooks.beforeGenerateConfig.tapAsync('validateConfigs', async (/** @type {SyncCore} */ core) => {
      console.log(core.blockDirectoriesFound)
      for (let i = 0; i < core.blockDirectoriesFound.length; i += 1) {
        const p = core.blockDirectoriesFound[i]
        console.log('Path:', p)
        const t = await readFile(path.join(p, core.packageConfigFileName), { encoding: 'utf8' }).then((_d) =>
          JSON.parse(_d)
        )
        console.log(t)
        this.validateBlockConfig(t)
        console.log('---------------------------------')
      }
    })
  }
}

module.exports = FilterBlocksPlugin

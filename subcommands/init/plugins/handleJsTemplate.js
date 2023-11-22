/* eslint-disable class-methods-use-this */
const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { nanoid } = require('nanoid')
const { existsSync, readdir } = require('fs')
const { BB_CONFIG_NAME } = require('../../../utils/constants')

class HandleJSTemplate {
  /**
   *
   * @param {InitCore} core
   */
  apply(initCore) {
    initCore.hooks.setTemplate.tapPromise('HandleJSTemplate', async (core) => {
      if (!core.useTemplate || core.cmdOpts?.typescript) return
      
      const { DIR_PATH, packageConfig } = core.templateOptions

      const configPath = path.join(DIR_PATH, BB_CONFIG_NAME)
      const config = await readFile(configPath, { encoding: 'utf8' })

      const templatesFolder = path.join(__dirname, '..', '..', '..', 'templates')
      const templatesPath = path.join(templatesFolder, 'sampleTodoTemplate')
      const templateConfigPath = path.join(templatesFolder, 'sample.block.config.json')
      const templateConfig = await readFile(templateConfigPath, { encoding: 'utf8' })

      const a = JSON.parse(config)
      const b = { ...JSON.parse(templateConfig), ...a }

      // adding id and other predefined fields for templates
      b.blockId = packageConfig.blockId
      b.repoType = packageConfig.repoType
      b.isPublic = packageConfig.isPublic
      b.parentBlockIDs = packageConfig.parentBlockIDs
      b.source.branch = `block_${b.name}`

      readdir(templatesPath, { withFileTypes: true }, async (err, files) => {
        if (err) throw err

        // Filter templateBlock directories
        const templateBlocks = files.filter((file) => file.isDirectory()).map((file) => file.name)
        const newDependencies = {}
        await Promise.allSettled(
          templateBlocks.map(async (templateBlockName) => {
            const newBlockPath = path.join(DIR_PATH, templateBlockName)
            await cp(path.join(templatesPath, templateBlockName), newBlockPath, { recursive: true })

            newDependencies[templateBlockName] = { directory: templateBlockName }
            const blockConfigPath = path.join(newBlockPath, BB_CONFIG_NAME)
            if (existsSync(blockConfigPath)) {
              const currentBlock = JSON.parse(await readFile(blockConfigPath, 'utf8'))

              currentBlock.name = templateBlockName
              currentBlock.blockId = nanoid()
              currentBlock.isPublic = packageConfig.isPublic
              currentBlock.repoType = packageConfig.repoType
              currentBlock.parentBlockIDs = [...packageConfig.parentBlockIDs, b.blockId]
              currentBlock.source.branch = `block_${templateBlockName}`

              await writeFile(blockConfigPath, JSON.stringify(currentBlock, null, 2))

              // NOTE: Find a better solution for below.
              if (currentBlock.type === 'ui-elements') {
                const valPath = path.resolve(newBlockPath, 'src', 'remote', `${templateBlockName}.js`)
                const oldData = await readFile(valPath, 'utf8')
                const newData = oldData.replaceAll(
                  'BB_FUNCTION_URL',
                  `BB_${packageConfig.name.toUpperCase()}_FUNCTION_URL`
                )
                await writeFile(valPath, newData)
              } else if (currentBlock.type === 'ui-container') {
                await Promise.allSettled(
                  ['Home', 'TodoInput', 'TodoItem'].forEach(async (cmp) => {
                    const pathVal = path.resolve(newBlockPath, 'src', 'remote', 'components', cmp, 'index.js')
                    const oldData = await readFile(pathVal, 'utf8')
                    const newData = oldData
                      .replaceAll('BB_FUNCTION_URL', `BB_${packageConfig.name.toUpperCase()}_FUNCTION_URL`)
                      .replaceAll('BB_ELEMENTS_URL', `BB_${packageConfig.name.toUpperCase()}_ELEMENTS_URL`)
                    await writeFile(pathVal, newData)
                  })
                )
              }
            }
          })
        )

        b.dependencies = newDependencies
        await writeFile(path.join(DIR_PATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
      })
    })
  }
}

module.exports = HandleJSTemplate

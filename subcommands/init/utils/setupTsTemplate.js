const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { nanoid } = require('nanoid')
const { existsSync, readdir } = require('fs')
const { BB_CONFIG_NAME } = require('../../../utils/constants')

async function setupTsTemplate(options) {
  const { DIR_PATH, blockVisibility, packageBlockId, packageParentBlockIDs, repoType, packageName } = options

  const configPath = path.join(DIR_PATH, BB_CONFIG_NAME)
  const config = await readFile(configPath, { encoding: 'utf8' })

  const templatesPath = path.join(__dirname, '..', '..', 'templates', 'sampleTsTodoTemplate')
  const templateCOnfigPath = path.join(templatesPath, '..', 'sample.block.config.json')
  const templateConfig = await readFile(templateCOnfigPath, { encoding: 'utf8' })

  const a = JSON.parse(config)
  const b = { ...JSON.parse(templateConfig), ...a }

  // adding id and other predefined fields for templates
  b.blockId = packageBlockId
  b.repoType = repoType
  b.isPublic = blockVisibility
  b.parentBlockIDs = packageParentBlockIDs
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
          currentBlock.isPublic = blockVisibility
          currentBlock.repoType = repoType
          currentBlock.parentBlockIDs = [...packageParentBlockIDs, b.blockId]
          currentBlock.source.branch = `block_${templateBlockName}`

          await writeFile(blockConfigPath, JSON.stringify(currentBlock, null, 2))

          // NOTE: Find a better solution for below.
          if (currentBlock.type === 'ui-elements') {
            const valPath = path.resolve(newBlockPath, 'src', 'remote', `${templateBlockName}.tsx`)
            const oldData = await readFile(valPath, 'utf8')
            const newData = oldData.replaceAll('BB_FUNCTION_URL', `BB_${packageName.toUpperCase()}_FUNCTION_URL`)
            await writeFile(valPath, newData)
          } else if (currentBlock.type === 'ui-container') {
            await Promise.allSettled(
              ['Home', 'TodoInput', 'TodoItem'].forEach(async (cmp) => {
                const pathVal = path.resolve(newBlockPath, 'src', 'remote', 'components', cmp, 'index.tsx')
                const oldData = await readFile(pathVal, 'utf8')
                const newData = oldData
                  .replaceAll('BB_FUNCTION_URL', `BB_${packageName.toUpperCase()}_FUNCTION_URL`)
                  .replaceAll('BB_ELEMENTS_URL', `BB_${packageName.toUpperCase()}_ELEMENTS_URL`)
                await writeFile(pathVal, newData)
              })
            )
          }
        }
      })
    )

    JSON.stringify('')

    b.dependencies = newDependencies
    await writeFile(path.join(DIR_PATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
  })
}

module.exports = setupTsTemplate

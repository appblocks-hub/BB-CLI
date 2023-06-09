const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { nanoid } = require('nanoid')
const { existsSync, readdir } = require('fs')
const { BB_CONFIG_NAME } = require('../../utils/constants')

async function setupTemplateV2(options) {
  const { DIR_PATH, blockVisibility, packageBlockId, packageParentBlockIDs, repoType, packageName } = options

  const configPath = path.join(DIR_PATH, BB_CONFIG_NAME)
  const config = await readFile(configPath, { encoding: 'utf8' })

  const templatesPath = path.join(__dirname, '..', '..', 'templates', 'sample-todo-template-v2')
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
        const newBlockName = `${packageName}_${templateBlockName}`
        const newBlockPath = path.join(DIR_PATH, newBlockName)
        await cp(path.join(templatesPath, templateBlockName), newBlockPath, { recursive: true })

        newDependencies[newBlockName] = { directory: newBlockName }
        const blockConfigPath = path.join(newBlockPath, BB_CONFIG_NAME)
        if (existsSync(blockConfigPath)) {
          const currentBlock = JSON.parse(await readFile(blockConfigPath, 'utf8'))

          currentBlock.name = `${packageName}_${currentBlock.name}`
          currentBlock.blockId = nanoid()
          currentBlock.isPublic = blockVisibility
          currentBlock.repoType = repoType
          currentBlock.parentBlockIDs = [...packageParentBlockIDs, b.blockId]
          currentBlock.source.branch = `block_${currentBlock.name}`

          await writeFile(blockConfigPath, JSON.stringify(currentBlock, null, 2))
        }
      })
    )

    b.dependencies = newDependencies
    await writeFile(path.join(DIR_PATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
  })
}

module.exports = setupTemplateV2

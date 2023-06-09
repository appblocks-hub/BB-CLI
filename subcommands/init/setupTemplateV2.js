const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { nanoid } = require('nanoid')
const { existsSync } = require('fs')
const { BB_CONFIG_NAME } = require('../../utils/constants')

async function setupTemplateV2(options) {
  const { DIRPATH, blockVisibility, packageBlockId, packageParentBlockIDs, repoType } = options

  const configPath = path.join(DIRPATH, BB_CONFIG_NAME)
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

  await cp(templatesPath, DIRPATH, { recursive: true })

  Promise.allSettled(
    Object.keys(b.dependencies).map(async (blockName) => {
      const blockConfigPath = path.join(DIRPATH, b.dependencies[blockName].directory, BB_CONFIG_NAME)
      const currentBlock = JSON.parse(await readFile(blockConfigPath, 'utf8'))
      if (existsSync(blockConfigPath)) {
        currentBlock.blockId = nanoid()
        currentBlock.isPublic = blockVisibility
        currentBlock.repoType = repoType
        currentBlock.parentBlockIDs = [...packageParentBlockIDs, b.blockId]
        currentBlock.source.branch = `block_${currentBlock.name}`

        await writeFile(blockConfigPath, JSON.stringify(currentBlock, null, 2))
      }
    })
  )

  await writeFile(path.join(DIRPATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
  // await writeFile(path.join(DIRPATH, '.gitignore'), 'node_modules\n')
}

module.exports = setupTemplateV2

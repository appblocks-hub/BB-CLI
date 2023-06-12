const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { nanoid } = require('nanoid')
const { existsSync, readdir, rmSync, mkdirSync } = require('fs')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const { generateUiElementFederationExpose } = require('../../templates/createTemplates/uiElement-templates')

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

          currentBlock.name = newBlockName
          currentBlock.blockId = nanoid()
          currentBlock.isPublic = blockVisibility
          currentBlock.repoType = repoType
          currentBlock.parentBlockIDs = [...packageParentBlockIDs, b.blockId]
          currentBlock.source.branch = `block_${newBlockName}`

          // NOTE: Find a better solution for below.
          if (currentBlock.type === 'ui-elements') {
            const oldDataPath = path.resolve(newBlockPath, 'src', 'remote', `${templateBlockName}.js`)
            const newDataPath = path.resolve(newBlockPath, 'src', 'remote', `${newBlockName}.js`)
            
            const appJsPath = path.resolve(newBlockPath, 'src', 'App.js')
            const oldData = await readFile(oldDataPath, 'utf8')

            let newData = oldData
            const oldAppJsData = await readFile(appJsPath, 'utf8')
            let newAppJsData = oldAppJsData
            templateBlocks.forEach((oldBlockName) => {
              newAppJsData = newAppJsData.replaceAll(oldBlockName, `${packageName}_${oldBlockName}`)
              newData = newData.replaceAll(oldBlockName, `${packageName}_${oldBlockName}`)
            })
            if (existsSync(path.dirname(newDataPath))) mkdirSync(path.dirname(newDataPath), { recursive: true })

            await writeFile(newDataPath, newData)
            await writeFile(appJsPath, newAppJsData)

            rmSync(oldDataPath, { recursive: true })

            const fedExposeString = generateUiElementFederationExpose(newBlockName)
            await writeFile(path.join(newBlockPath, 'federation-expose.js'), fedExposeString)
          } else if (currentBlock.type === 'ui-container') {
            await Promise.allSettled(
              ['Home', 'TodoInput', 'TodoItem'].forEach(async (cmp) => {
                const pathVal = path.resolve(newBlockPath, 'components', cmp, 'index.js')
                const oldData = await readFile(pathVal, 'utf8')
                let newData = oldData
                templateBlocks.forEach((oldBlockName) => {
                  newData = newData.replaceAll(oldBlockName, `${packageName}_${oldBlockName}`)
                })
                await writeFile(pathVal, newData)
              })
            )
          }

          await writeFile(blockConfigPath, JSON.stringify(currentBlock, null, 2))
        }
      })
    )

    b.dependencies = newDependencies
    await writeFile(path.join(DIR_PATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
  })
}

module.exports = setupTemplateV2

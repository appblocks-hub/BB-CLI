const { cp, readFile, writeFile } = require('fs/promises')
const path = require('path')
const { BB_CONFIG_NAME } = require('../../utils/constants')

async function setupTemplateV2(options) {
  const { DIRPATH } = options

  const configPath = path.join(DIRPATH, BB_CONFIG_NAME)
  const config = await readFile(configPath, { encoding: 'utf8' })

  const templatesPath = path.join(__dirname, '..', '..', 'templates', 'sample-todo-template-v2')
  const templateCOnfigPath = path.join(templatesPath, '..', 'sample.block.config.json')
  const templateConfig = await readFile(templateCOnfigPath, { encoding: 'utf8' })

  const a = JSON.parse(config)
  const b = { ...JSON.parse(templateConfig), ...a }

  await cp(templatesPath, DIRPATH, { recursive: true })
  await writeFile(path.join(DIRPATH, BB_CONFIG_NAME), JSON.stringify(b, null, 2))
  // await writeFile(path.join(DIRPATH, '.gitignore'), 'node_modules\n')
}

module.exports = setupTemplateV2

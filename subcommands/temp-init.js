const path = require('path')
const { nanoid } = require('nanoid')
const { mkdir, writeFile } = require('fs/promises')
const chalk = require('chalk')
const { isValidBlockName } = require('../utils/blocknameValidator')
const { feedback } = require('../utils/cli-feedback')
const { getBlockName, readInput, setWithTemplate } = require('../utils/questionPrompts')
const setupTemplateV2 = require('./init/setupTemplateV2')
const { generateFunctionReadme } = require('../templates/createTemplates/function-templates')
const { DEFAULT_REPO_TYPE, BB_CONFIG_NAME } = require('../utils/constants')
const { headLessConfigStore } = require('../configstore')
const setupTsTemplate = require('./init/setupTsTemplate')
const ConfigFactory = require('../utils/configManagers/configFactory')
const PackageConfigManager = require('../utils/configManagers/packageConfigManager')
const BlockConfigManager = require('../utils/configManagers/blockConfigManager')
const { blockLangs } = require('../utils/blockLangs')

/**
 * Action for bb-temp-init
 * @param {string} packageName Package name provided by user in command line
 */
const init = async (packageName, { typescript, packageonly:packageOnly }) => {
  let blockLanguage
  const { manager } = await ConfigFactory.create(path.resolve(BB_CONFIG_NAME))
  if (manager instanceof PackageConfigManager) {
    feedback({
      type: 'error',
      message: 'Cannot init from inside a package context\nUse bb create instead with type package',
    })
    return
  }
  if (manager instanceof BlockConfigManager) {
    feedback({ type: 'error', message: 'Cannot init from inside a block context\n' })
    return
  }
  /**
   * Check if user provided name matches valid regex, else prompt for new name
   */
  if (!isValidBlockName(packageName)) {
    feedback({ type: 'warn', message: `${packageName} is not a valid name (Only snake case with numbers is valid)` })

    // eslint-disable-next-line no-param-reassign
    packageName = await getBlockName()
  }

  /**
   * Get appblock versions
   */
  //   const { appblockVersions } = await getAppblockVersionData()
  const appblockVersions = [{ version: '1.0.0' }]

  /**
   * Get the repo type, "Mono" or "Multi"
   * @type {string<'mono'|'multi'}
   */
  // const repoType = await readInput({
  //   type: 'list',
  //   name: 'repoType',
  //   message: 'Select the repository type',
  //   choices: [
  //     { name: 'Mono Repo', value: 'mono' },
  //     { name: 'Multi Repo', value: 'multi' },
  //   ],
  // })
  const repoType = DEFAULT_REPO_TYPE

  const blockVisibility = await readInput({
    type: 'list',
    name: 'blockVisibility',
    message: 'Select the block visibility',
    choices: [
      { name: 'Public', value: true },
      { name: 'Private', value: false },
    ],
  })

  if (packageOnly) {
    blockLanguage = await readInput({
      type: 'list',
      name: 'blockLanguage',
      message: 'Select the language',
      choices: Object.keys(blockLangs).map((item) => ({ name: item, value: blockLangs[item] })),
    })
  }

  /**
   * Create a new package directory, assume there is no name conflict for dir name
   */
  const DIR_PATH = path.join(path.resolve(packageName))
  await mkdir(DIR_PATH, { recursive: true })

  headLessConfigStore(DIR_PATH).set('gitVisibility', blockVisibility ? 'PUBLIC' : 'PRIVATE')

  /**
   * Write the package config to newly created directory
   */
  const packageBlockId = nanoid()
  const packageParentBlockIDs = []
  const packageConfig = {
    name: packageName,
    type: 'package',
    blockId: packageBlockId,
    source: {
      https: null,
      ssh: null,
      branch: `block_${packageName}`,
    },
    parentBlockIDs: packageParentBlockIDs,
    isPublic: blockVisibility,
    supportedAppblockVersions: appblockVersions?.map(({ version }) => version),
    repoType,
  }

  if (packageOnly) {
    packageConfig.language = blockLanguage
    packageConfig.type='raw-package'
  }

  await writeFile(path.join(DIR_PATH, 'block.config.json'), JSON.stringify(packageConfig, null, 2))

  const readmeString = generateFunctionReadme(packageName)
  writeFile(`${DIR_PATH}/README.md`, readmeString)


  if(!packageOnly){
  /**
   * If user wants template, setup sample template
   */
  const { useTemplate } = await setWithTemplate()
  if (useTemplate) {
    const templateOptions = {
      DIR_PATH,
      blockVisibility,
      packageBlockId,
      packageParentBlockIDs,
      repoType,
      packageName,
      typescript,
    }
    if (typescript) await setupTsTemplate(templateOptions)
    else await setupTemplateV2(templateOptions)
  }
}

  console.log('\nExcellent!! You are good to start.')
  console.log(`New Appblocks project ${packageName} is created.`)
  console.log(chalk.dim(`\ncd ${packageName} and start hacking\n`))
  // console.log(chalk.dim(`run bb sync from ${packageName} to register templates as new block`))
}

module.exports = init

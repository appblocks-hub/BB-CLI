const path = require('path')
const { nanoid } = require('nanoid')
const { mkdir, writeFile } = require('fs/promises')
const chalk = require('chalk')
const { isValidBlockName } = require('../utils/blocknameValidator')
const { feedback } = require('../utils/cli-feedback')
const { getBlockName, readInput, setWithTemplate } = require('../utils/questionPrompts')
const setupTemplateV2 = require('./init/setupTemplateV2')


/**
 * Action for bb-temp-init
 * @param {string} packagename Package name provided by user in command line
 */
const init = async (packagename) => {
  /**
   * Check if user provided name matches valid regex, else prompt for new name
   */
  if (!isValidBlockName(packagename)) {
    feedback({ type: 'warn', message: `${packagename} is not a valid name (Only snake case with numbers is valid)` })

    // eslint-disable-next-line no-param-reassign
    packagename = await getBlockName()
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
  const repoType = await readInput({
    type: 'list',
    name: 'repoType',
    message: 'Select the repository type',
    choices: [
      { name: 'Mono Repo', value: 'mono' },
      { name: 'Multi Repo', value: 'multi' },
    ],
  })

  const blockVisibility = await readInput({
    type: 'list',
    name: 'blockVisibility',
    message: 'Select the block visibility',
    choices: [
      { name: 'Public', value: true },
      { name: 'Private', value: false },
    ],
  })

  /**
   * Create a new package directory, assume there is no name conflict for dir name
   */
  const DIRPATH = path.join(path.resolve(packagename))
  await mkdir(DIRPATH, { recursive: true })

  /**
   * Write the package config to newly created directory
   */
  await writeFile(
    path.join(DIRPATH, 'block.config.json'),
    JSON.stringify({
      name: packagename,
      type: 'package',
      blockId:nanoid(),
      source: {
        https: null,
        ssh: null,
        branch: `block_${packagename}`
      },
      parentBlockIDs:[],
      isPublic:blockVisibility,
      supportedAppblockVersions: appblockVersions?.map(({ version }) => version),
      repoType,
    })
  )

  /**
   * If user wants template, setup sample template
   */
  const { useTemplate } = await setWithTemplate()
  if (useTemplate) await setupTemplateV2({ DIRPATH })

  console.log(chalk.dim(`\ncd ${packagename} and start hacking\n`))
  console.log(chalk.dim(`run bb sync from ${packagename} to register templates as new block`))
}

module.exports = init

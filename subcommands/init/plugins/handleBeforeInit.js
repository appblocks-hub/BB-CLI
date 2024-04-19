/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { nanoid } = require('nanoid')
const { isValidBlockName } = require('../../../utils/blockNameValidator')
const { feedback } = require('../../../utils/cli-feedback')
const { readInput, getBlockName, setWithTemplate } = require('../../../utils/questionPrompts')
const { DEFAULT_REPO_TYPE } = require('../../../utils/constants')
const { blockLangs } = require('../../../utils/blockLangs')

class HandleBeforeInit {
  /**
   *
   * @param {InitCore} core
   */
  apply(initCore) {
    initCore.hooks.beforeInit.tapPromise('HandleBeforeInit', async (core) => {
      /**
       * Check if user provided name matches valid regex, else prompt for new name
       */
      if (!isValidBlockName(core.packageName)) {
        feedback({
          type: 'warn',
          message: `${core.packageName} is not a valid name (Only snake case with numbers is valid)`,
        })

        // eslint-disable-next-line no-param-reassign
        core.packageName = await getBlockName()
      }

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

      /**
       * Write the package config to newly created directory
       */
      const packageBlockId = nanoid()
      const packageParentBlockIDs = []

      core.packageConfig = {
        name: core.packageName,
        type: 'package',
        blockId: packageBlockId,
        source: {
          https: null,
          ssh: null,
          branch: `block_${core.packageName}`,
        },
        parentBlockIDs: packageParentBlockIDs,
        isPublic: blockVisibility,
        supportedAppblockVersions: core.appblockVersions?.map(({ version }) => version),
        repoType,
      }

      if (core.cmdOpts.containerized) {
        const blockLanguage = await readInput({
          type: 'list',
          name: 'blockLanguage',
          message: 'Select the language',
          choices: Object.keys(blockLangs).map((item) => ({ name: item, value: blockLangs[item] })),
        })

        core.packageConfig.language = blockLanguage
        core.packageConfig.type = 'containerized'
      } else {
        const { useTemplate } = await setWithTemplate()
        core.useTemplate = useTemplate
      }
    })
  }
}

module.exports = HandleBeforeInit

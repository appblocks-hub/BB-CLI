/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { confirmationPrompt } = require('../../utils/questionPrompts')
const { getLanguageVersionData } = require('../../utils/languageVersion')
const { getDependencies, getDependencyIds } = require('../publish/dependencyUtil')

const checkIsAllBlockSupportDependencies = async (blocks, supportedAppblockVersions) => {
  const result = await Promise.all(
    blocks.map(async (blockManagers) => {
      const { name: blockName } = blockManagers.config

      // Commented since not adding support for existing versions for now
      // if (version) {
      //   const prefersSsh = configstore.get('prefersSsh')
      //   const originUrl = convertGitUrl(source.ssh, prefersSsh ? 'ssh' : 'https')
      //   const Git = new GitManager(path.resolve(), directory, originUrl, prefersSsh)
      //   Git.cd(directory)
      //   await Git.fetch('--all --tags')
      //   Git.checkoutTagWithNoBranch(version)
      // }

      // ========= languageVersion ========================
      spinnies.add('savu', { text: `Getting language versions` })
      const { languageVersionIds, languageVersions } = await getLanguageVersionData({
        blockDetails: { directory: blockManagers.directory, meta: blockManagers.config },
        supportedAppblockVersions,
      })
      spinnies.remove('savu')

      if (!languageVersionIds?.length) return false

      const { dependencies, depExist } = await getDependencies({
        blockDetails: { directory: blockManagers.directory, meta: blockManagers.config },
      })

      if (depExist) {
        spinnies.add('savu', { text: `Checking dependency support for ${blockName}` })
        const { isAllDepExist } = await getDependencyIds({
          blockName,
          languageVersionIds,
          dependencies,
          languageVersions,
          noRequest: true,
        })
        spinnies.remove('savu')

        return isAllDepExist
      }

      return true
    })
  )

  if (result.some((v) => v === false)) {
    const goAhead = await confirmationPrompt({
      message: `Some of the block dependencies are not supported under given appblock version. Do you want to continue ?`,
      name: 'goAhead',
      default: false,
    })

    if (!goAhead) {
      throw new Error(`Cancelled setting appblock versions`)
    }
  }

  return true
}

module.exports = {
  checkIsAllBlockSupportDependencies,
}

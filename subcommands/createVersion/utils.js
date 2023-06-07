/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../loader')
const { readInput, confirmationPrompt } = require('../../utils/questionPrompts')
const { updateReadme } = require('../../utils/registryUtils')
const { getLanguageVersionData } = require('../languageVersion/util')
const { getDependencies, getDependencyIds } = require('../publish/dependencyUtil')
const { uploadReadMe } = require('../../utils/fileAndFolderHelpers')

const uploadBlockReadme = async ({ readmePath, blockId, versionId }) => {
  spinnies.add('cv', { text: `Uploading readme` })
  const res = await uploadReadMe(readmePath, blockId, versionId)
  if (res.status !== 200) {
    throw new Error('Something went wrong while uploading readme.')
  }

  spinnies.update('cv', { text: `Updating readme` })
  const upResp = await updateReadme(blockId, versionId, res.key)
  if (upResp.status !== 200) {
    throw new Error('Something went wrong while updating readme.')
  }
  spinnies.update('cv', { text: `ReadMe updated successfully` })
}

const checkLanguageSupport = async ({ force, blockManager, appblockVersionIds, supportedAppblockVersions }) => {
  // ========= languageVersion ========================
  const { languageVersionIds, languageVersions, allSupported } = await getLanguageVersionData({
    // TODO: remove meta from getDependencies and pass just blockConfig
    blockDetails: { directory: blockManager.directory, meta: blockManager.config },
    appblockVersionIds,
    supportedAppblockVersions,
  })

  if (!allSupported && !force) {
    const goAhead = await confirmationPrompt({
      message: `Some appblock version doesn't have support for given languages. Do you want to continue ?`,
      name: 'goAhead',
      default: false,
    })

    if (!goAhead) throw new Error(`Cancelled on no support`)
  }

  return { languageVersionIds, languageVersions }
}

const checkLangDepSupport = async (options) => {
  const { blockManager, force } = options

  // ========= languageVersion ========================
  const { languageVersionIds, languageVersions } = await checkLanguageSupport(options)

  // ========= dependencies ========================
  // Check if the dependencies exit to link with block
  const { dependencies, depExist } = await getDependencies({
    // TODO: remove meta from getDependencies and pass just blockConfig
    blockDetails: { directory: blockManager.directory, meta: blockManager.config },
  })

  if (!depExist && !force) {
    const noDep = await readInput({
      type: 'confirm',
      name: 'noDep',
      message: 'No package dependencies found to link with block. Do you want to continue ?',
      default: true,
    })

    if (!noDep) process.exit(1)
  } else {
    // eslint-disable-next-line prefer-const
    const { isAllDepExist } = await getDependencyIds({
      languageVersionIds,
      dependencies,
      languageVersions,
      noRequest: true,
      blockName: blockManager.config.name,
    })
    if (!isAllDepExist && !force) {
      const goAhead = await confirmationPrompt({
        message: `Appblock version doesn't have support for some dependencies. Do you want to continue ?`,
        name: 'goAhead',
        default: false,
      })

      if (!goAhead) throw new Error(`Cancelled on no support`)
    }
  }
}

module.exports = {
  uploadBlockReadme,
  checkLanguageSupport,
  checkLangDepSupport,
}

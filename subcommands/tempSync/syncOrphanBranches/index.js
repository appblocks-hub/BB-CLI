/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../loader')
const { ecrHandler } = require('../../../utils/aws/ecr')
const { getBBConfig } = require('../../../utils/config-manager')
const { copyEmulatorCode } = require('../../../utils/emulator-manager')
const {
  generateRootPackageJsonFile,
  generateDockerFile,
  beSingleBuildDeployment,
  generateDockerIgnoreFile,
  generateOrphanBranch,
} = require('./util')

const syncOrphanBranch = async (options) => {
  const { latestWorkSpaceCommitHash, latestworkSpaceCommitMessage, blockMetaDataMap, bbModulesPath, repoUrl } = options

  const blocksArray = Object.keys(blockMetaDataMap)
  for (const item of blocksArray) {
    const block = blockMetaDataMap[item]

    await generateOrphanBranch({ bbModulesPath, latestWorkSpaceCommitHash, block, repoUrl })
  }
}

module.exports = syncOrphanBranch

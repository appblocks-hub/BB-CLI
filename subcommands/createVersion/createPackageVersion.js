const path = require('path')
const chalk = require('chalk')
const { writeFileSync, readFileSync, existsSync } = require('fs')
const semver = require('semver')
const { spinnies } = require('../../loader')
const { getAllBlocksVersions, appBlockAddVersion } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { GitManager } = require('../../utils/gitManagerV2')
const { readInput, confirmationPrompt } = require('../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const { ensureReadMeIsPresent } = require('../../utils/fileAndFolderHelpers')
const { uploadBlockReadme } = require('./utils')

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const createPackageVersion = async ({ packageManager, cmdOptions }) => {
  const { latest, force } = cmdOptions || {}

  const packageConfig = packageManager.config
  const { repoType, name: packageName, blockId: pkBlockId, orphanBranchFolder } = packageConfig

  //  NOTE: if user want to pass specific blocks with version
  //   const givenBlockVersion =
  //     blockVersions?.split(',').reduce((a, v) => {
  //       const [b, ver] = v.split('@')
  //       return { ...a, [b]: ver }
  //     }, {}) || {}
  //   const givenBlockVersionNames = Object.keys(givenBlockVersion)

  const [readmePath] = ensureReadMeIsPresent(packageManager.directory, packageName, false)
  if (!readmePath) throw new Error('Make sure to add a README.md ')

  const memberBlocks = []
  const memberBlockIds = []
  for await (const blockManager of packageManager.getDependencies()) {
    memberBlocks.push(blockManager)
    memberBlockIds.push(blockManager.config.blockId)
  }

  spinnies.add('cv', { text: 'Getting all block versions' })
  const { data, error } = await post(getAllBlocksVersions, {
    latest_only: latest,
    block_ids: memberBlockIds,
    status: [2, 4, 7],
  })
  spinnies.remove('cv')

  if (error) throw error

  const bVersions = data.data || []
  const selectedBlockVersions = {}

  if (bVersions.length === 0) {
    console.log(chalk.yellow(`\nNo release-ready/approved versions found for any member blocks`))
    throw new Error(chalk.red(`Please create and publish version for all member blocks and try again.`))
  }

  if (bVersions.length !== memberBlocks.length) {
    const bVersionBlocks = bVersions.map((bv) => bv.block_id)

    const noVersionBlocks = memberBlocks
      .map((bManger) => {
        if (bVersionBlocks.includes(bManger.config.blockId)) return null
        return bManger.config.name
      })
      .filter((n) => n !== null)
      .join(', ')

    console.log(
      chalk.yellow(`\nNo release ready/approved versions found for ${chalk.gray(noVersionBlocks)} member blocks`)
    )
    throw new Error(`Please create and publish version for all member blocks and try again.`)
  }

  const updatedDependencies = packageConfig.dependencies

  for await (const bkVer of bVersions) {
    const choices = bkVer.block_versions.map((b) => ({ name: b.version_number, value: b }))
    if (!latest) {
      const blockVersion = await readInput({
        type: 'list',
        name: 'blockVersion',
        message: `Select the block version of ${bkVer.block_name}`,
        choices,
      })

      selectedBlockVersions[bkVer.block_id] = { ...blockVersion, block_name: bkVer.block_name }
    } else {
      selectedBlockVersions[bkVer.block_id] = { ...choices[0]?.value, block_name: bkVer.block_name }
    }

    updatedDependencies[bkVer.block_name].versionId = selectedBlockVersions[bkVer.block_id].id
    updatedDependencies[bkVer.block_name].version = selectedBlockVersions[bkVer.block_id].version_number
  }

  spinnies.add('bv', { text: `Checking block versions` })
  const pkBlockVersion = await getAllBlockVersions(pkBlockId)
  spinnies.remove('bv')
  const latestVersion = pkBlockVersion.data?.data?.[0]?.version_number
  if (latestVersion) console.log(`Latest created version is ${latestVersion}`)

  spinnies.stopAll()
  const version =
    cmdOptions.version ||
    (await readInput({
      name: 'version',
      message: 'Enter the package version',
      validate: (ans) => {
        if (!semver.valid(ans)) return 'Invalid version! Please use semantic versioning (major.minor.patch)'
        if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
          return `New version should be greater than last published version ${latestVersion}`
        }
        return true
      },
      default: latestVersion ? semver.inc(latestVersion, 'patch') : '0.0.1',
    }))

  if (!semver.valid(version)) {
    throw new Error('Invalid version! Please use semantic versioning (major.minor.patch)')
  }

  const versionNote =
    cmdOptions.versionNote ||
    (await readInput({
      name: 'versionNote',
      message: 'Enter version note for package (default to empty)',
    }))

  if (!force && latest) {
    const goAhead = await confirmationPrompt({
      message: `${`Continue ${
        packageConfig.name
      }@${version} version creation with below member blocks \n  ${Object.entries(updatedDependencies)
        .map(([bName, bDetails]) => `  ${bName}@${bDetails.version}`)
        .join('\n')}?`}`,
      name: 'goAhead',
      default: true,
    })

    if (!goAhead) throw new Error('Process cancelled')
  }

  const packageConfigData = { ...packageConfig, dependencies: updatedDependencies }
  delete packageConfigData.orphanBranchFolder
  delete packageConfigData.workSpaceFolder

  const reqBody = {
    block_id: pkBlockId,
    version_no: semver.parse(version).version,
    status: 1,
    release_notes: versionNote,
    appblock_versions: packageConfigData.supportedAppblockVersions,
    app_config: packageConfigData,
    parent_block_ids: packageConfigData.parentBlockIDs || [],
  }

  spinnies.add('cv', { text: 'Creating package versions' })
  const { data: addRes, error: addErr } = await post(appBlockAddVersion, reqBody)

  if (addErr) throw addErr

  const versionId = addRes?.data?.id
  await uploadBlockReadme({ readmePath, blockId: pkBlockId, versionId })

  packageConfigData.version = version
  packageConfigData.versionId = versionId

  if (repoType === 'mono') {
    try {
      // handle mono repo git flow
      const parentBranch = packageConfig.source.branch
      const releaseBranch = `block_${packageName}@${version}`

      const Git = new GitManager(orphanBranchFolder, packageConfig.source.ssh)
      await Git.createReleaseBranch(releaseBranch, parentBranch)

      writeFileSync(
        path.join(orphanBranchFolder, packageManager.configName),
        JSON.stringify(packageConfigData, null, 2)
      )

      await Git.stageAll()
      await Git.commit(`release branch for block for version ${version}`)
      await Git.push(releaseBranch)
    } catch (err) {
      if (!['already exists', 'tree clean'].some((e) => err.message.includes(e))) {
        throw err
      }
    }
  } else if (repoType === 'multi') {
    const ignoresApCreated = [
      '._ab_em/*',
      '._ab_em_elements/*',
      '.env.function',
      '.env.view',
      '.tmp/*',
      '.deploy/*',
      '.deploy.config.json/*',
      'cliruntimelogs/*',
      'logs/*',
      'pushlogs/*',
    ]

    const gitignorePath = path.join('.', '.gitignore')
    const gitignoreData = existsSync(gitignorePath) ? readFileSync(gitignorePath).toString() : ''

    const ignoreDependencies = Object.values(packageConfigData.dependencies).map((v) => `${v.directory}/`)
    const newGitIgnore = ignoresApCreated.concat(ignoreDependencies).reduce((acc, ig) => {
      if (acc.split('\n').includes(ig)) return acc
      return `${acc}\n${ig}`
    }, gitignoreData)
    writeFileSync(gitignorePath, newGitIgnore)

    spinnies.update('cv', { text: `Tagging new version ${version}` })

    const Git = new GitManager('.', packageConfigData.source.ssh)
    await Git.addTag(version, versionNote)
    await Git.pushTags()
  }

  spinnies.succeed('cv', { text: 'Created package version successfully' })

  return versionId
}

module.exports = { createPackageVersion }

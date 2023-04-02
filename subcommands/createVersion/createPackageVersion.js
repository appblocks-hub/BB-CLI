const path = require('path')
const chalk = require('chalk')
const { writeFileSync, readFileSync } = require('fs')
const semver = require('semver')
const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { getAllBlocksVersions, appBlockAddVersion } = require('../../utils/api')
const { post } = require('../../utils/axios')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { GitManager } = require('../../utils/gitmanager')
const { pushBlocks } = require('../../utils/pushBlocks')
const { readInput, confirmationPrompt, getGitConfigNameEmail } = require('../../utils/questionPrompts')
const { getAllBlockVersions, updateReadme } = require('../../utils/registryUtils')
const { uploadReadMe, ensureReadMeIsPresent } = require('../../utils/fileAndFolderHelpers')

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const createPackageVersion = async ({ appConfig, args }) => {
  const { latest } = args || {}

  //   const givenBlockVersion =
  //     blockVersions?.split(',').reduce((a, v) => {
  //       const [b, ver] = v.split('@')
  //       return { ...a, [b]: ver }
  //     }, {}) || {}
  //   const givenBlockVersionNames = Object.keys(givenBlockVersion)

  const pkBlockId = appConfig.config.blockId
  const [readmePath] = ensureReadMeIsPresent('.', appConfig.config.name, false)
  if (!readmePath) {
    console.log('Make sure to add a README.md ')
    process.exit(1)
  }

  const dependencies = [...appConfig.dependencies]
  const blockIds = dependencies.map((dep) => dep.meta.blockId)

  spinnies.add('cBv', { text: 'Getting all block versions' })
  const { data, error } = await post(getAllBlocksVersions, {
    latest_only: latest,
    block_ids: blockIds,
    status: [2, 4, 7],
  })
  spinnies.remove('cBv')

  if (error) throw error

  const bVersions = data.data || []
  const selectedBlockVersions = {}

  if (bVersions.length === 0) {
    console.log(chalk.yellow(`\nNo release-ready/approved versions found for any member blocks`))
    console.log(chalk.red(`Please create and publish version for all member blocks and try again.`))
    process.exit(0)
  }
  if (bVersions.length !== dependencies.length) {
    const bVersionBlocks = bVersions.map((bv) => bv.block_id)

    const noVersionBlocks = dependencies
      .map((dep) => {
        if (bVersionBlocks.includes(dep.meta.blockId)) return null
        return dep.meta.name
      })
      .filter((n) => n !== null)
      .join(', ')

    console.log(
      chalk.yellow(`\nNo release ready/approved versions found for ${chalk.gray(noVersionBlocks)} member blocks`)
    )
    console.log(chalk.red(`Please create and publish version for all member blocks and try again.`))
    process.exit(0)
  }

  const updatedDependencies = { ...appConfig.config.dependencies }

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

    updatedDependencies[bkVer.block_name].meta.blockVersionId = selectedBlockVersions[bkVer.block_id].id
    updatedDependencies[bkVer.block_name].meta.blockVersion = selectedBlockVersions[bkVer.block_id].version_number
  }

  const { data: pkBlockVersion } = await getAllBlockVersions(pkBlockId)

  const latestVersion = pkBlockVersion.data?.[0]?.version_number

  const version = await readInput({
    name: 'version',
    message: 'Enter the package version',
    validate: (ans) => {
      if (!semver.valid(ans)) return 'Invalid version'
      if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
        return `New version should be greater than last published version ${latestVersion}`
      }
      return true
    },
    default: latestVersion ? semver.inc(latestVersion, 'patch') : '0.0.1',
  })

  const message = await readInput({
    name: 'msg',
    message: 'Enter a message for new package version',
  })

  const goAhead = await confirmationPrompt({
    message: `${chalk.gray(
      `Continue create package version ${
        appConfig.config.name
      }@${version} with below member blocks\n      ${Object.values(updatedDependencies)
        .map((bDetails) => `${bDetails.meta.name}@${bDetails.meta.blockVersion}`)
        .join(', ')}?`
    )}`,
    name: 'goAhead',
    default: true,
  })

  if (!goAhead) throw new Error('Process cancelled')

  const appConfigData = { ...appConfig.config }
  appConfigData.dependencies = updatedDependencies

  // update gitignore with block_names
  const blockConfigPath = path.join('.', 'block.config.json')
  // const oldBlockConfigData = readFileSync(blockConfigPath).toString()
  writeFileSync(blockConfigPath, JSON.stringify(appConfigData, null, 2))

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
  const gitignoreData = readFileSync(gitignorePath).toString()

  const ignoreDependencies = Object.values(appConfigData.dependencies).map((v) => `${v.directory}/`)
  const newGitIgnore = ignoresApCreated.concat(ignoreDependencies).reduce((acc, ig) => {
    if (acc.split('\n').includes(ig)) return acc
    return `${acc}\n${ig}`
  }, gitignoreData)
  writeFileSync(gitignorePath, newGitIgnore)

  const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
  await pushBlocks(
    gitUserName,
    gitUserEmail,
    `refactor: version ${version}`,
    [{ directory: '.', meta: { name: appConfig.config.name, source: appConfig.config.source, type: 'package' } }],
    true
  )

  spinnies.add('cBv', { text: `Tagging new version ${version}` })

  const blockSource = { ...appConfigData.source }
  const prefersSsh = configstore.get('prefersSsh')
  const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
  const Git = new GitManager('.', 'Not very imp', repoUrl, prefersSsh)
  await Git.addTag(version, message)
  await Git.pushTags()

  const reqBody = {
    block_id: pkBlockId,
    version_no: semver.parse(version).version,
    status: 1,
    release_notes: message,
    appblock_versions: appConfigData.supportedAppblockVersions,
    app_config: appConfigData,
  }

  spinnies.update('cBv', { text: 'Creating package versions' })
  const { data: addRes, error: addErr } = await post(appBlockAddVersion, reqBody)

  if (addErr) throw addErr

  const versionId = addRes?.data?.id

  spinnies.update('p1', { text: `Uploading readme` })
  const res = await uploadReadMe(readmePath, pkBlockId, versionId)
  if (res.status !== 200) {
    throw new Error('Something went wrong while uploading readme.')
  }

  spinnies.update('p1', { text: `Updating readme` })
  const upResp = await updateReadme(pkBlockId, versionId, res.key)
  if (upResp.status !== 200) {
    throw new Error('Something went wrong while updating readme.')
  }
  spinnies.update('p1', { text: `ReadMe updated successfully` })

  spinnies.succeed('cBv', { text: 'Created package version successfully' })

  return versionId
}

module.exports = { createPackageVersion }

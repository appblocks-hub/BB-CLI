/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { execSync } = require('child_process')
const { readFileSync, mkdirSync } = require('fs')
const path = require('path')
const semver = require('semver')
const Spinnies = require('spinnies')
const { configstore } = require('../configstore')
const { appBlockAddVersion, createSourceCodeSignedUrl, saveDependencies } = require('../utils/api')
const { appConfig } = require('../utils/appconfigStore')
const convertGitSshUrlToHttps = require('../utils/convertGitUrl')
const { getShieldHeader } = require('../utils/getHeaders')
const { isClean, getLatestVersion, addTag } = require('../utils/gitCheckUtils')
const { GitManager } = require('../utils/gitmanager')
const { readInput } = require('../utils/questionPrompts')

const createZip = async ({ directory, version }) => {
  const dir = `${directory}`
  const ZIP_TEMP_FOLDER = path.resolve(`./.tmp/upload`)
  const EXCLUDE_IN_ZIP = ['node_modules', '.git'].reduce((acc, ele) => `${acc} -x '${ele}/*'`, '')

  const zipFile = `${ZIP_TEMP_FOLDER}/${version}.zip`
  const zipDir = `${ZIP_TEMP_FOLDER}/${dir.substring(0, dir.lastIndexOf('/'))}`

  mkdirSync(zipDir, { recursive: true })

  await execSync(`cd ${dir} && zip -r ${zipFile} . ${EXCLUDE_IN_ZIP}`)

  return zipFile
}

const publish = async (blockname) => {
  appConfig.init()
  const spinnies = new Spinnies()

  if (!appConfig.has(blockname)) {
    console.log('Block not found!')
    process.exit(1)
  }
  if (appConfig.isLive(blockname)) {
    console.log('Block is live, please stop before operation')
    process.exit(1)
  }
  // TODO - Check if there are any .sync files in the block and warn
  const blockDetails = appConfig.getBlock(blockname)

  try {
    if (!isClean(blockDetails.directory)) {
      console.log('Git directory is not clean, Please push before publish')
      process.exit(1)
    }

    const latestVersion = getLatestVersion(blockDetails.directory)
    if (latestVersion) console.log(`Last published version is ${latestVersion}`)

    const version = await readInput({
      name: 'version',
      message: 'Enter the version',
      validate: (ans) => {
        if (semver.valid(ans)) {
          if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
            return `Last published version is ${latestVersion}`
          }
          return true
        }
        return 'Invalid versioning'
      },
      default: latestVersion ? semver.inc(latestVersion) : '0.0.1',
    })

    const message = await readInput({
      name: 'tagMessage',
      message: 'Enter a message to add to tag.(defaults to empty)',
    })

    spinnies.add('p1', { text: `Publishing new version ${version}` })

    await addTag(blockDetails.directory, version, message)

    const blockSource = blockDetails.meta.source
    const prefersSsh = configstore.get('prefersSsh')
    const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
    const Git = new GitManager(blockDetails.directory, 'Not very imp', repoUrl, prefersSsh)
    // await pushTags(blockDetails.directory)
    await Git.pushTags()

    const blockid = await appConfig.getBlockId(blockname)

    const headers = getShieldHeader()

    // Update source code to appblock cloud

    const zipFile = await createZip({ directory: blockDetails.directory, version })

    const preSignedData = await axios.post(
      createSourceCodeSignedUrl,
      {
        block_type: blockDetails.meta.type,
        block_id: blockid,
        block_name: blockDetails.meta.name,
        block_version: version,
      },
      {
        headers,
      }
    )
    const zipFileData = readFileSync(zipFile)
    await axios.put(preSignedData.data.url, zipFileData, {
      headers: {
        'Content-Type': 'application/zip',
      },
    })

    const resp = await axios.post(
      appBlockAddVersion,
      {
        block_id: blockid,
        version_no: semver.parse(version).version,
        is_release: true,
        release_notes: message,
        source_code_key: preSignedData.data.key,
      },
      { headers }
    )

    const { data } = resp
    if (data.err) {
      throw new Error('Something went wrong from our side\n', data.msg).message
    }

    spinnies.update('p1', { text: `Saving dependencies` })

    // update dependencies => NOTE: currently node
    const packageJson = JSON.parse(readFileSync(path.resolve(blockDetails.directory, 'package.json')))
    const versionId = data.data.id

    const dependencies = [packageJson.dependencies, packageJson.devDependencies]
    dependencies.forEach(async (dep, i) => {
      if (Object.keys(dep)?.length > 0) {
        await axios.post(
          saveDependencies,
          {
            block_id: blockid,
            block_version_id: versionId,
            dependencies: dep,
            dependencies_type: i, // using index since dependencies is 0 and devDependencies is 1
          },
          { headers }
        )
      }
    })

    // const res = data.data
    spinnies.succeed('p1', { text: 'Success' })
  } catch (error) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    process.exit(1)
  }
}

const getPublishedVersion = (name, directory) => {
  try {
    if (!isClean(directory))
      return {
        success: false,
        msg: `Has uncommitted changes -> directory ${directory} `,
      }
    const latestVersion = getLatestVersion(directory)
    return { success: true, latestVersion }
  } catch (error) {
    return { success: false, msg: `${error.message} -> block ${name} ` }
  }
}

module.exports = publish
const myExport = module.exports
myExport.getPublishedVersion = getPublishedVersion

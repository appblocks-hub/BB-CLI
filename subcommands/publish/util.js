const { execSync } = require('child_process')
const { mkdirSync } = require('fs')
const path = require('path')
const { spinnies } = require('../../loader')
const { listAppblockVersions } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { isClean, getLatestVersion } = require('../../utils/gitCheckUtils')
const { readInput } = require('../../utils/questionPrompts')

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

const createZip = async ({ directory, version, excludePaths = [] }) => {
  const dir = `${directory}`
  const ZIP_TEMP_FOLDER = path.resolve(`./.tmp/upload`)
  const EXCLUDE_IN_ZIP = ['node_modules', '.git', '**/node_modules/*', '**/.git/*', ...excludePaths].reduce(
    (acc, ele) => `${acc} -x '${ele}/*'`,
    ''
  )

  const zipFile = `${ZIP_TEMP_FOLDER}/${version}.zip`
  const zipDir = `${ZIP_TEMP_FOLDER}/${dir.substring(0, dir.lastIndexOf('/'))}`

  // TODO get code of specified version

  mkdirSync(zipDir, { recursive: true })

  await execSync(`cd ${dir} && zip -r ${zipFile} . ${EXCLUDE_IN_ZIP}`)

  return zipFile
}

const getAllAppblockVersions = async (options) => {
  const { data, error } = await post(listAppblockVersions, options || {})

  if (error) throw new Error(error)

  return data
}

const getAppblockVersionData = async () => {
  /**
   * For headless CLI operation
   */
  // console.log(typeof process.env.BB_CLI_RUN_HEADLESS)
  if (process.env.BB_CLI_RUN_HEADLESS === 'true') {
    return { appblockVersions: global.HEADLESS_CONFIGS.appblockVersion }
  }
  spinnies.add('abVersion', { text: `Getting appblock versions` })
  const abVersions = await getAllAppblockVersions()
  spinnies.remove('abVersion')

  const choices = abVersions.data?.map(({ version, id }) => ({
    name: version,
    value: { id, version },
  }))

  if (!choices) {
    console.log('Error getting appblocks versions')
    process.exit(1)
  }

  const appblockVersions = await readInput({
    type: 'checkbox',
    name: 'abVersions',
    message: 'Select the appblock version',
    choices,
    validate: (input) => {
      if (!input || input?.length < 1) return `Please add a appblock version`
      return true
    },
  })
  console.log(appblockVersions)
  return { appblockVersions }
}

module.exports = { getPublishedVersion, createZip, getAppblockVersionData, getAllAppblockVersions }

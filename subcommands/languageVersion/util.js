/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { exec } = require('child_process')
const semver = require('semver')
const chalk = require('chalk')
const { post } = require('../../utils/axios')
const {
  getLanguageVersionsApi,
  addLanguageVersionsApi,
  deleteLanguageVersionsApi,
  listLanguageVersions,
} = require('../../utils/api')
const { readInput } = require('../../utils/questionPrompts')
const { spinnies } = require('../../loader')

const getNodeLanguageVersion = async () => [{ name: 'node', version: process.version }]

const getSystemLanguageVersion = async (options) => {
  const { blockDetails } = options

  const {
    directory,
    meta: { language },
  } = blockDetails

  let languageVersions = []

  switch (language) {
    case 'nodejs':
      languageVersions = await getNodeLanguageVersion(directory)
      break
    case 'js':
      languageVersions = await getNodeLanguageVersion(directory)
      break

    default:
      break
  }

  return languageVersions
}

const editLanguageVersionList = async (languageVersions = [], promptConfirm = true) => {
  const defaultValue = languageVersions
    .reduce((acc, { name, version }) => {
      acc.push(`${name}@${version}`)
      return acc
    }, [])
    .join(',')

  if (promptConfirm) {
    const editVersion = await readInput({
      type: 'confirm',
      name: 'editVersion',
      message: `Block supported language versions are listed below \n${defaultValue
        .split(',')
        .map((dv) => `\n  ${dv}`)}\n\n  Do you want to edit?`,
      default: false,
    })

    if (!editVersion) return languageVersions
  }

  const saveLanguageVersionsData = await readInput({
    name: 'languageVersions',
    message: 'Edit the language version list (coma sepetated)',
    validate: (input) => {
      if (!input || input?.length < 1) return `Please add a languageVersion`

      const error = input.split(',').find((rt) => {
        const [, version] = rt.split('@')
        if (!semver.valid(version)) return true
        return false
      })

      if (error) return `${error} is not valid`

      return true
    },
    default: defaultValue,
  })

  return saveLanguageVersionsData.split(',').map((rt) => {
    const [name, version] = rt.split('@')
    return { name, version }
  })
}

const getAttchedLanguageVersions = async (blockId, blockVersionId) => {
  const { data, error } = await post(getLanguageVersionsApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
  })

  if (error) throw error

  return data.data || []
}

const isSameObject = (a, b) => a.name === b.name && a.version === b.version

const onlyInLeft = (left, right, compareFunction) =>
  left.filter((leftValue) => !right.some((rightValue) => compareFunction(leftValue, rightValue)))

const isSameArrayObject = (arr1, arr2) => {
  if (arr1.length < 1 || arr2.length < 1) return false
  return arr1.filter((ar1) => arr2.some((ar2) => isSameObject(ar1, ar2))).length < 1
}
const getUpdatedLanguageVersionsData = async ({
  blockDetails,
  blockId,
  blockVersionId,
  blockVersion,
  isNew = false,
}) => {
  let existingLanguageVersions = []
  let languageVersions = []
  const systemLanguageVersion = await getSystemLanguageVersion({ blockDetails })

  if (blockVersionId) {
    spinnies.add('ex', { text: `Getting languageVersion for ${blockVersion}` })
    existingLanguageVersions = await getAttchedLanguageVersions(blockId, blockVersionId)
    spinnies.remove('ex')
  }

  languageVersions = systemLanguageVersion
    .concat(existingLanguageVersions)
    .filter((v, i, a) => a.findIndex((v2) => isSameObject(v2, v)) === i)

  const updatedLanguageVersion = await editLanguageVersionList(languageVersions)

  if (isNew) {
    return { addLanguageVersionsList: updatedLanguageVersion }
  }

  if (isSameArrayObject(existingLanguageVersions, updatedLanguageVersion)) {
    return { addLanguageVersionsList: [], deleteLanguageVersionsList: [] }
  }

  const addLanguageVersionsList = onlyInLeft(updatedLanguageVersion, existingLanguageVersions, isSameObject)
  const deleteLanguageVersionsList = onlyInLeft(existingLanguageVersions, updatedLanguageVersion, isSameObject)

  return { addLanguageVersionsList, deleteLanguageVersionsList }
}

const addLanguageVersions = async (options) => {
  const { blockVersionId, blockId, addLanguageVersionsList } = options

  const { data, error } = await post(addLanguageVersionsApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
    languageVersions: addLanguageVersionsList,
  })

  if (error) throw new Error(error)

  return data
}

const deleteLanguageVersions = async (options) => {
  const { blockVersionId, blockId, deleteLanguageVersionsList } = options

  const { data, error } = await post(deleteLanguageVersionsApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
    languageVersions: deleteLanguageVersionsList,
  })

  if (error) throw new Error(error)

  return data
}

const updateLanguageVersions = async (options) => {
  const { blockVersionId, blockId, addLanguageVersionsList, deleteLanguageVersionsList } = options
  if (addLanguageVersionsList.length > 0)
    await addLanguageVersions({ blockVersionId, blockId, addLanguageVersionsList })
  if (deleteLanguageVersionsList.length > 0)
    await deleteLanguageVersions({ blockVersionId, blockId, deleteLanguageVersionsList })

  if (addLanguageVersionsList.length <= 0 && deleteLanguageVersionsList.length <= 0) return false
  return true
}

const langVersionsLinkedToAbVersion = async ({ appblockVersionIds, supportedAppblockVersions }, option) => {
  const { search_keyword } = option || {}

  const reqBody = {
    search_keyword,
  }

  if (supportedAppblockVersions) reqBody.appblock_versions = supportedAppblockVersions
  else reqBody.appblock_version_ids = appblockVersionIds

  if (!reqBody.appblock_versions) throw new Error(`No supported appblock versions`)

  const { data, error } = await post(listLanguageVersions, reqBody)
  if (error) throw error

  return data
}

const getLanguageVersionData = async ({
  blockDetails,
  appblockVersionIds,
  supportedAppblockVersions,
  noWarn = false,
}) => {
  let systemLanguageVersion
  if (blockDetails) {
    systemLanguageVersion = await getSystemLanguageVersion({ blockDetails })
  }

  spinnies.add('langVersion', { text: `Getting language versions` })
  const reqObject = {}
  if (systemLanguageVersion) {
    reqObject.search_keyword = systemLanguageVersion[0]?.name
  }

  const langVersions = await langVersionsLinkedToAbVersion({ appblockVersionIds, supportedAppblockVersions }, reqObject)
  spinnies.remove('langVersion')

  if (!blockDetails) {
    return { languageVersionIds: langVersions.data?.map((lang) => lang.id) }
  }

  const langSupportedAppblockVersions = {}
  const choices = langVersions.data?.reduce((acc, lang) => {
    const blockLang = blockDetails.meta.language === 'js' ? 'nodejs' : blockDetails.meta.language
    if (lang.name.includes(blockLang)) {
      langSupportedAppblockVersions[lang.appblock_version] = lang.appblock_version_id
      acc.push({ ...lang, name: lang.name.includes('@') ? lang.name : `${lang.name}@${lang.version}`, value: lang.id })
    }

    return acc
  }, [])

  let allSupported = true

  const keyData = Object.keys(langSupportedAppblockVersions)
  if (!noWarn && supportedAppblockVersions?.length && keyData.length !== supportedAppblockVersions.length) {
    const nonSupportedVersion = supportedAppblockVersions.filter((sav) => !keyData.includes(sav))
    const {
      meta: { name: bName, language: bLang },
    } = blockDetails

    allSupported = false

    console.log(chalk.yellow(`Language ${bLang} ${bName} is not supported in appblock version ${nonSupportedVersion}`))
  }

  // const languageVersionIds = await readInput({
  //   type: 'checkbox',
  //   name: 'languageVersionIds',
  //   message: 'Select the language version',
  //   choices,
  //   validate: (input) => {
  //     if (!input || input?.length < 1) return `Please add a language version`
  //     return true
  //   },
  // })

  return { allSupported, languageVersionIds: choices?.map(({ value }) => value), languageVersions: choices }
}

const languageVersionCheckCommand = {
  nodejs: 'node -v',
  go: 'go version',
  python3: 'python3 -V',
  reactjs: 'npm view react version',
}

const checkLanguageVersionExistInSystem = async ({ supportedAppblockVersions, blockLanguages }) => {
  if (!supportedAppblockVersions?.length) {
    console.log(chalk.yellow(`No linked appblock versions found to check language support` ))
    return []
  }

  spinnies.add('langVersion', { text: `Getting language versions` })
  const langVersionData = await langVersionsLinkedToAbVersion({ supportedAppblockVersions })
  spinnies.remove('langVersion')
  const bklangs = langVersionData?.data?.reduce((acc, { name, version }) => {
    const [langName] = name.split('@')
    if (!blockLanguages.some((l) => langName.includes(l))) return acc

    const [langVer] = version.split('.')
    if (!acc[langName]) acc[langName] = [langVer]
    else acc[langName].push(langVer)

    return acc
  }, {})

  if (Object.keys(bklangs)?.length < 1) {
    throw new Error(
      `Appblocks versions (${supportedAppblockVersions}) doesn't support given languages (${blockLanguages})`
    )
  }

  const errors = []

  await Promise.all(
    Object.entries(bklangs).map(async ([name, versions]) => {
      const prmRes = await new Promise((resolve) => {
        exec(`${languageVersionCheckCommand[name] || `${name} -v`} `, (err, stdout) => {
          if (err) {
            errors.push(`${name} language not found in system`)
            resolve(true)
            return
          }

          const localLangVer = stdout.match(/([0-9]+([.][0-9]+)+)/g)?.[0]?.split('.')[0]

          if (!versions.includes(localLangVer)) {
            errors.push(`Appblocks versions (${supportedAppblockVersions}) doesn't support ${name}@${localLangVer}*`)
          }
          resolve(true)
        })
      })
      return prmRes
    })
  )

  if (errors.length) {
    console.log(chalk.yellow(errors))
    const goAhead = await readInput({
      type: 'confirm',
      name: 'goAhead',
      message: `Do you want to start with above warning ? `,
    })

    if (!goAhead) throw new Error('Cancelled start with warning')
  }

  return []
}

module.exports = {
  getUpdatedLanguageVersionsData,
  addLanguageVersions,
  updateLanguageVersions,
  getAttchedLanguageVersions,
  getLanguageVersionData,
  langVersionsLinkedToAbVersion,
  checkLanguageVersionExistInSystem,
}

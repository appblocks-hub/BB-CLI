/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const semver = require('semver')
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

const langVersionsLinkedToAbVersion = async (appblockVersionId, option) => {
  const { search_keyword } = option
  const { data, error } = await post(listLanguageVersions, {
    appblock_version_id: appblockVersionId,
    search_keyword,
  })

  if (error) throw new Error(error)

  return data
}

const getLanguageVersionData = async ({ blockDetails, appblockVersionId }) => {
  const systemLanguageVersion = await getSystemLanguageVersion({ blockDetails })

  spinnies.add('langVersion', { text: `Getting language versions` })
  const langVersions = await langVersionsLinkedToAbVersion(appblockVersionId, {
    search_keyword: systemLanguageVersion[0]?.name,
  })
  spinnies.remove('langVersion')

  const choices = langVersions.data?.map((lang) => ({
    name: `${lang.name}@${lang.version}`,
    value: lang.id,
  }))

  if (!choices) {
    console.log('Error getting language versions')
    process.exit(1)
  }

  const languageVersionId = await readInput({
    type: 'list',
    name: 'languageVersionId',
    message: 'Select the language version',
    choices,
    validate: (input) => {
      if (!input || input?.length < 1) return `Please add a language version`
      return true
    },
  })

  return { languageVersionId }
}

module.exports = {
  getUpdatedLanguageVersionsData,
  addLanguageVersions,
  updateLanguageVersions,
  getAttchedLanguageVersions,
  getLanguageVersionData,
}

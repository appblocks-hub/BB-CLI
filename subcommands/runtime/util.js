/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const semver = require('semver')
const { post } = require('../../utils/axios')
const { getRuntimesApi, addRuntimesApi, deleteRuntimesApi } = require('../../utils/api')
const { readInput } = require('../../utils/questionPrompts')

const getNodeRuntime = async () => [{ name: 'node', version: process.version }]

const getSystemRuntime = async (options) => {
  const { blockDetails } = options

  const {
    directory,
    meta: { language },
  } = blockDetails

  let runtimes = []

  switch (language) {
    case 'nodejs':
      runtimes = await getNodeRuntime(directory)
      break
    case 'js':
      runtimes = await getNodeRuntime(directory)
      break

    default:
      break
  }

  return runtimes
}

const editRuntimeList = async (runtimes = [], promptConfirm = true) => {
  const defaultValue = runtimes
    .reduce((acc, { name, version }) => {
      acc.push(`${name}@${version}`)
      return acc
    }, [])
    .join(',')

  if (promptConfirm) {
    const editVersion = await readInput({
      type: 'confirm',
      name: 'editVersion',
      message: `Supported runtimes are listed below \n${defaultValue
        .split(',')
        .map((dv) => `\n  ${dv}`)}\n\n  Do you want to edit?`,
      default: false,
    })

    if (!editVersion) return runtimes
  }

  const saveRuntimesData = await readInput({
    name: 'runtimes',
    message: 'Edit the runtime list (coma sepetated)',
    validate: (input) => {
      if (!input || input?.length < 1) return `Please add a runtime`

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

  return saveRuntimesData.split(',').map((rt) => {
    const [name, version] = rt.split('@')
    return { name, version }
  })
}

const getAttchedRuntimes = async (blockId, blockVersionId) => {
  const { data, error } = await post(getRuntimesApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
  })

  if (error) throw error

  return data.data
}

const isSameObject = (a, b) => a.name === b.name && a.version === b.version

const onlyInLeft = (left, right, compareFunction) =>
  left.filter((leftValue) => !right.some((rightValue) => compareFunction(leftValue, rightValue)))

const isSameArrayObject = (arr1, arr2) => {
  if (arr1.length < 1 || arr2.length < 1) return false
  return arr1.filter((ar1) => arr2.some((ar2) => isSameObject(ar1, ar2))).length < 1
}
const getUpdatedRuntimesData = async ({ blockDetails, blockId, blockVersionId }) => {
  let existingRuntimes = []
  let runtimes = []
  const systemRuntime = await getSystemRuntime({ blockDetails })

  if (blockVersionId) {
    existingRuntimes = await getAttchedRuntimes(blockId, blockVersionId)
  }

  runtimes = systemRuntime.concat(existingRuntimes).filter((v, i, a) => a.findIndex((v2) => isSameObject(v2, v)) === i)

  const updatedRuntime = await editRuntimeList(runtimes)

  if (isSameArrayObject(existingRuntimes, updatedRuntime)) {
    return { addRuntimesList: [], deleteRuntimesList: [] }
  }

  const addRuntimesList = onlyInLeft(updatedRuntime, existingRuntimes, isSameObject)
  const deleteRuntimesList = onlyInLeft(existingRuntimes, updatedRuntime, isSameObject)

  return { addRuntimesList, deleteRuntimesList }
}

const addRuntimes = async (options) => {
  const { blockVersionId, blockId, addRuntimesList } = options

  const { data, error } = await post(addRuntimesApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
    runtimes: addRuntimesList,
  })

  if (error) throw new Error(error)

  return data
}

const deleteRuntimes = async (options) => {
  const { blockVersionId, blockId, deleteRuntimesList } = options

  const { data, error } = await post(deleteRuntimesApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
    runtimes: deleteRuntimesList,
  })

  if (error) throw new Error(error)

  return data
}

const updateRuntimes = async (options) => {
  const { blockVersionId, blockId, addRuntimesList, deleteRuntimesList } = options
  if (addRuntimesList.length > 0) await addRuntimes({ blockVersionId, blockId, addRuntimesList })
  if (deleteRuntimesList.length > 0) await deleteRuntimes({ blockVersionId, blockId, deleteRuntimesList })
}

module.exports = { getUpdatedRuntimesData, addRuntimes, updateRuntimes }

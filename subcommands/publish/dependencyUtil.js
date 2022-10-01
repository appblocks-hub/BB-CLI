/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync } = require('fs')
const path = require('path')
const { addDependenciesApi } = require('../../utils/api')
const { post } = require('../../utils/axios')

/**
 *
 * @param {String} directory
 * @returns {Array}
 */

const getPackageJsonDependencies = async (directory) => {
  const packageJson = await JSON.parse(readFileSync(path.resolve(directory, 'package.json')))
  return [packageJson.dependencies, packageJson.devDependencies].reduce((acc, dep, i) => {
    if (!dep) return acc
    Object.entries(dep).forEach(([name, version]) => {
      acc.push({
        name,
        version,
        type: i, // using index since dependencies is 0 and devDependencies is 1
      })
    })
    return acc
  }, [])
}

const getDependencies = async (options) => {
  const { blockDetails } = options

  const {
    directory,
    meta: { language },
  } = blockDetails

  let dependencies = []

  switch (language) {
    case 'nodejs':
      dependencies = await getPackageJsonDependencies(directory)
      break
    case 'js':
      dependencies = await getPackageJsonDependencies(directory)
      break

    default:
      break
  }

  return { dependencies, depExist: dependencies.length > 0 }
}

/**
 *
 * @param {*} options
 */
const addDependencies = async (options) => {
  // update dependencies => NOTE: currently node
  const { blockVersionId, blockId, dependencies } = options

  const { error } = await post(addDependenciesApi, {
    block_id: blockId,
    block_version_id: blockVersionId,
    dependencies,
  })

  if (error) throw new Error(error)
}

module.exports = { getDependencies, addDependencies }

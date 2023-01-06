/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync } = require('fs')
const path = require('path')
const { addDependenciesApi, listDependenciesApi } = require('../../utils/api')
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
        url: '',
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
  const { languageVersionId, dependencies } = options

  const { error } = await post(addDependenciesApi, {
    language_version_id: languageVersionId,
    dependencies,
  })

  if (error) throw error
}

/**
 *
 * @param {*} options
 */
const getDependencyIds = async (options) => {
  const { languageVersionId, dependencies } = options

  const { data, error } = await post(listDependenciesApi, {
    language_version_id: languageVersionId,
    page_limit: 10000,
  })

  if (error) throw error

  const deps = data.data || []

  const newDeps = []
  const depIds = []

  dependencies.forEach((dep) => {
    const depData = deps.find((d) => dep.name === d.name && dep.version === d.version && dep.type === d.type)
    if (depData?.id) depIds.push(depData.id)
    else newDeps.push(dep)
  })

  return { depIds, newDeps }
}

module.exports = { getDependencies, addDependencies, getDependencyIds }

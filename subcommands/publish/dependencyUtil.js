/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { readFileSync } = require('fs')
const path = require('path')
const { addDependenciesApi, checkDependenciesApi, submitForDependenciesReview } = require('../../utils/api')
const { post } = require('../../utils/axios')
// const { confirmationPrompt } = require('../../utils/questionPrompts')

/**
 *
 * @param {String} directory
 * @returns {Array}
 */

const getPackageJsonDependencies = async ({ directory, name: bName, blockId }) => {
  try {
    const packageJson = await JSON.parse(readFileSync(path.resolve(directory, 'package.json')))
    return [packageJson.dependencies, packageJson.devDependencies].reduce((acc, dep, i) => {
      if (!dep) return acc
      Object.entries(dep).forEach(([name, version]) => {
        acc.push({
          name,
          version,
          type: i, // using index since dependencies is 0 and devDependencies is 1
          url: '',
          blockId,
        })
      })
      return acc
    }, [])
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`No package.json found for ${bName} `)
      return []
    }

    throw err
  }
}

const getDependencies = async (options) => {
  const { blockDetails } = options

  const {
    directory,
    meta: { blockId, name, language },
  } = blockDetails

  let dependencies = []

  switch (language) {
    case 'nodejs':
      dependencies = await getPackageJsonDependencies({ directory, name, blockId })
      break
    case 'js':
      dependencies = await getPackageJsonDependencies({ directory, name, blockId })
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

const requestForDepSubmit = async (requestDeps) => {
  const { data, error } = await post(submitForDependenciesReview, {
    dependencies: requestDeps,
  })

  if (error) throw error

  return data?.data
}

/**
 *
 * @param {*} options
 */
const getDependencyIds = async (options) => {
  const { languageVersionIds, dependencies, languageVersions, noRequest = false, blockName, noWarn } = options

  const { data, error } = await post(checkDependenciesApi, {
    language_version_ids: languageVersionIds,
    dependencies,
  })

  if (error) throw error

  const depRes = data.data || {}

  let depIds = depRes.dependency_ids || []

  if (depRes.is_all_exist) {
    return { depIds, isAllDepExist: true }
  }

  const noExistingDeps = {}
  const requestDeps = []

  if (depRes.existing_dependencies?.length) {
    if (!depIds) depIds = []
    depRes.existing_dependencies.forEach((exLang) => {
      const { name: langVersion, value: langId } =
        languageVersions.find(({ value }) => value === exLang[0].language_version_id) || {}
      dependencies.forEach((dep) => {
        const isExist = exLang.find((d) => dep.name === d.name && dep.version === d.version && dep.type === d.type)
        if (!isExist) {
          let langVersionIds = [langId]

          const reqDepIndex = requestDeps.findIndex(
            (d) => dep.name === d.name && dep.version === d.version && dep.type === d.type
          )

          if (reqDepIndex > -1) {
            langVersionIds = [...new Set([...requestDeps[reqDepIndex].language_version_ids, ...langVersionIds])]
            requestDeps[reqDepIndex] = {
              ...requestDeps[reqDepIndex],
              language_version_ids: langVersionIds,
            }
          } else {
            requestDeps.push({ ...dep, language_version_ids: langVersionIds })
          }

          if (!noExistingDeps[langVersion]) noExistingDeps[langVersion] = []
          noExistingDeps[langVersion].push({
            ...dep,
            showVal: `${dep.name}@${dep.version} ${dep.type === 1 ? 'devDependency' : 'dependency'}`,
          })
        } else {
          depIds.push(isExist.id)
        }
      })
    })
  } else {
    dependencies.forEach((dep) => {
      requestDeps.push({
        ...dep,
        language_version_ids: languageVersionIds,
        showVal: `${dep.name}@${dep.version} ${dep.type === 1 ? 'devDependency' : 'dependency'}`,
      })
    })

    languageVersions.forEach(({ name }) => {
      noExistingDeps[name] = requestDeps
    })
  }

  if (!noWarn) {
    Object.entries(noExistingDeps).forEach(([lang, deps]) => {
      console.log(
        chalk.yellow(
          `${lang} does not support listed dependencies for ${blockName} \n${deps.map((d) => d.showVal).join('\n')}\n`
        )
      )
    })
  }

  if (noRequest) return { isAllDepExist: false, depIds: [...new Set(depIds)] }

  // const confirm = await confirmationPrompt({
  //   name: 'confirm',
  //   message: 'Do you want to request for these dependencies support?',
  //   default: false,
  // })

  // if (confirm) {
  await requestForDepSubmit(requestDeps)
  console.log(chalk.yellow(`Requested for non existing dependencies support.`))
  // } else {
  //   console.log(chalk.red(`Version can't be created without dependencies support`))
  // }

  return { requestDeps, depIds: [...new Set(depIds)], isAllDepExist: false }
}

module.exports = { getDependencies, addDependencies, getDependencyIds }

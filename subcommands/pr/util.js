/* eslint-disable no-async-promise-executor */
const open = require('open')
const { default: axios } = require('axios')
const { mkdirSync, readFileSync, closeSync, openSync, writeFileSync } = require('fs')
const inquirer = require('inquirer')
const { tmpdir } = require('os')
const path = require('path')
const { configstore } = require('../../configstore')
const { githubRestOrigin, githubGraphQl } = require('../../utils/api')
const { getGitHeader } = require('../../utils/getHeaders')
const { createPr } = require('../../utils/Mutations')
const generatePrTemplate = require('../../templates/pull-request/genetatePrTemplate')
const { readInput } = require('../../utils/questionPrompts')

/**
 * @returns {Object}
 */
const readPrInputs = async (gitUser) => {
  const question = [
    {
      type: 'input',
      message: 'Title for the pull request',
      name: 'title',
      validate: (input) => {
        if (!input || input?.length < 1) return `Tilte is not valid`
        return true
      },
    },
    // {
    //   type: 'input',
    //   message: 'Body for the pull request',
    //   name: 'body',
    //   validate: (input) => {
    //     if (!input || input?.length < 1) return `Body is not valid`
    //     return true
    //   },
    // },
    {
      type: 'input',
      message: 'The name of the branch you want your changes pulled into [BASE]',
      name: 'baseRefName',
      default: 'main',
    },
    {
      type: 'input',
      message: 'The name of the branch where your changes are implemented [HEAD]',
      name: 'headRefName',
      default: `${gitUser}:main`,
    },
    {
      type: 'confirm',
      message: 'Whether this pull request should be a draft',
      name: 'draft',
      default: false,
    },
    {
      type: 'confirm',
      message: 'Whether this pull request can be modified by maintainer',
      name: 'maintainerCanModify',
      default: true,
    },
  ]

  const promtRes = await inquirer.prompt(question)
  return promtRes
}
const createPrTmpFile = () => {
  const tempPath = tmpdir()
  const tempFilePath = path.join(tempPath, path.resolve(), 'pr/template.md')
  const folder = tempFilePath.replace(/[^/]*$/.exec(tempFilePath)[0], '')
  mkdirSync(folder, { recursive: true })
  closeSync(openSync(tempFilePath, 'w'))
  return tempFilePath
}

/**
 *
 * @param {String} userRepo
 * @returns {Object | String}
 */
const getRepoDetatils = async (userRepo) => {
  try {
    const res = await axios.get(`${githubRestOrigin}/repos/${userRepo}`, { headers: getGitHeader() })
    return res.data
  } catch (err) {
    if (err.response.status === 404) {
      throw new Error('Repo not found Or Trying to fork private repo')
    } else throw new Error(err.response.data.message)
  }
}

const copyPrTemplate = () =>
  new Promise(async (resolve, reject) => {
    try {
      const userTemplate = configstore.get('userPrTemplatePath')
      const tmpPath = createPrTmpFile()
      const templateData = userTemplate
        ? readFileSync(userTemplate, { encoding: 'utf8' }).toString()
        : generatePrTemplate()
      writeFileSync(tmpPath, templateData)
      await open(tmpPath, { wait: true })

      const isPrUpdated = await readInput({
        name: 'isPrUpdated',
        message: 'Is pull request template updated',
        type: 'confirm',
      })

      const body = readFileSync(tmpPath, { encoding: 'utf8' }).toString()

      if (body === templateData) {
        const noPrUpdated = await readInput({
          name: 'noPrUpdated',
          message: 'No changes saved to template, Do you want to continue ?',
          type: 'confirm',
        })

        if (noPrUpdated) resolve(body)
        else resolve(copyPrTemplate())
      }

      if (isPrUpdated) resolve(body)
      else resolve(copyPrTemplate())
    } catch (error) {
      console.log('error', error)
      reject(error)
    }
  })

const getPrBody = async () => copyPrTemplate()

const createPrMutation = async (prInputs) => {
  try {
    const { data } = await axios.post(
      githubGraphQl,
      {
        query: createPr.Q,
        variables: prInputs,
      },
      { headers: getGitHeader() }
    )

    if (data.errors) {
      const errorMessages = data.errors.map(({ message }) => message)
      throw new Error(errorMessages)
    }

    return createPr.Tr(data)
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = { readPrInputs, getRepoDetatils, createPrMutation, copyPrTemplate, getPrBody }

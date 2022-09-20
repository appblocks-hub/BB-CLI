const inquirer = require('inquirer')
const { configstore } = require('../configstore')
const createRepo = require('./createRepo')
const { getOrgId } = require('./questionPrompts')
const { appConfig } = require('./appconfigStore')
/**
 *
 * @param {String} blockShortName Name of block
 * @param {} createFromExistinURL
 * @param {*} clonePath
 * @returns
 */
async function createComponent(blockShortName, createFromExistinURL, clonePath) {
  const question = {
    type: 'list',
    message: 'where to create repo',
    name: 'where',
    choices: ['my git', 'org git'],
  }

  const { answer } = await inquirer.prompt([question])
  if (answer === 'my git') {
    const ret = await createRepo(
      configstore.get('githubUserName'),
      configstore.get('githubUserId'),
      'user',
      null,
      appConfig.prefix || '',
      blockShortName,
      !!createFromExistinURL,
      clonePath || '.'
    )
    return ret
  }
  const [orgName, orgId] = await getOrgId()
  const ret = await createRepo(
    configstore.get('githubUserName'),
    orgId,
    'org',
    orgName,
    appConfig.prefix || '',
    blockShortName,
    !!createFromExistinURL,
    clonePath || '.'
  )
  return ret
}

module.exports = createComponent

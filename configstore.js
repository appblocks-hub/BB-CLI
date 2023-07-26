const Conf = require('conf')
const { existsSync } = require('fs')
const path = require('path')
const { BB_CONFIG_NAME } = require('./utils/constants')

//  * @property {string} githubUserName
//  * @property {string} appBlockUserToken
//  * @property {string} appBlockUserName
//  * @property {string} prefersSsh
//  * @property {string} gitPersonalAccessToken
//  * @property {string} currentSpaceId
//  * @property {string} currentSpaceName
//  * @property {string} githubUserId
//  * @property {string} localGitName
//   @property {string} localGitEmail

const headlessSCHEMA = {
  appblockVersion: {
    type: 'array',
    items: {
      type: 'string',
    },
    default: ['1.0.0'],
  },
  gitTarget: {
    type: 'string',
    default: 'my git',
  },
  gitVisibility: {
    type: 'string',
    default: 'PUBLIC',
  },
  gitDescription: {
    type: 'string',
    default: '',
  },
  blockNamingStrategyFnBody: {
    type: 'string',
    default:
      // eslint-disable-next-line no-template-curly-in-string
      "let i = 0;if (original !== lastTried){ i = parseInt(lastTried.split('_').pop(), 10)};return `${original}_${i + 1}`",
  },
  blockNamingStrategyFnArgs: {
    minItems: 2,
    additionalItems: false,
    type: 'array',
    items: [
      { type: 'string', default: 'original' },
      { type: 'string', default: 'lastTried' },
    ],
    default: ['original', 'lastTried'],
  },
}
const cliSCHEMA = {
  githubUserId: { type: 'string' },
  localGitName: { type: 'string' },
  localGitEmail: { type: 'string', format: 'email' },
  githubUserName: {
    type: 'string',
  },
  appBlockUserToken: {
    type: 'string',
  },
  prefersSsh: {
    type: 'boolean',
  },
}
/**
 * @type {Conf}
 */
const config = new Conf({
  schema: cliSCHEMA,
})
/**
 * @type {Conf}
 */
const headLessConfig = (cwd, updateIfRoot) => {
  /**
   * NOTE: Find a better approach for headless config
   */

  // TODO: remove this once headless config is moved to better approach
  if (updateIfRoot) {
    if (!existsSync(path.resolve(BB_CONFIG_NAME)) || existsSync(path.join('..', BB_CONFIG_NAME))) {
      return { get: () => {}, set: () => {} }
    }
  }

  const hConfig = new Conf({
    configName: 'headless-config',
    cwd: cwd || path.resolve(),
    schema: headlessSCHEMA,
  })
  return hConfig
}

module.exports = {
  configstore: config,
  headLessConfigStore: headLessConfig,
}

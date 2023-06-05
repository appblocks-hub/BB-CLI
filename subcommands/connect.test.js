/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const connect = require('./connect')
const { configstore } = require('../configstore')
const getGithubDeviceCode = require('../utils/getGithubDeviceCode')
const handleGithubAuth = require('../utils/handleGithubAuth')
const { getGithubSignedInUser } = require('../utils/getSignedInUser')

jest.mock('../configstore')
jest.mock('../utils/getGithubDeviceCode')
jest.mock('../utils/handleGithubAuth')
jest.mock('../utils/getSignedInUser')

const { get } = configstore
const logspy = jest.spyOn(global.console, 'log').mockImplementation(() => {})
afterAll(() => {
  logspy.mockReset()
})
afterEach(() => {
  jest.clearAllMocks()
})

describe('Tests with already existing user', () => {
  // const getMock = jest.fn()
  beforeAll(() => {
    configstore.addGitUser('arjun', '1234', 'token')
  })
  afterAll(() => {
    configstore.removeGitUser()
  })

  test('Should check for existing account', async () => {
    const c = await connect('github', { force: false })
    expect(get).toHaveBeenCalledWith('githubUserId')
  })
  test('Should try to get username from github with stored token', async () => {
    const c = await connect('github', { force: false })

    expect(getGithubSignedInUser).toHaveBeenCalledWith('token')
  })
})

describe('Tests with no existing user', () => {
  beforeAll(() => {
    configstore.removeGitUser()
  })
  test('Should not call getGithubSignedInUser', async () => {
    const c = await connect('github', { force: false })
    expect(get).toBeUndefined
    expect(getGithubSignedInUser).toHaveBeenCalledTimes(0)
  })
  test('Should flow -> check of existing user -> get device code -> handle auth', async () => {
    const c = await connect('github', { force: false })
    expect(get).toBeUndefined
    expect(getGithubDeviceCode).toHaveBeenCalledTimes(1)
    expect(handleGithubAuth).toHaveBeenCalledTimes(1)
  })
})

test('Should delete current user and start auth', async () => {
  const c = await connect('github', { force: true })
  expect(configstore.delete).toHaveBeenNthCalledWith(1, 'githubUserId')
  expect(configstore.delete).toHaveBeenNthCalledWith(2, 'githubUserToken')
  expect(get).toHaveBeenCalledWith('githubUserId')
})

/* eslint-disable */

const configstore = require('../../configstore')
const { checkAndSetAuth } = require('../checkAndSetAuth')
const { getGithubSignedInUser } = require('../getSignedInUser')

jest.mock('../../configstore')
jest.mock('../getSignedInUser')

const TESTTOKEN = '#$@!'
const USER = {
  user: { userName: 'testName', userId: 'testId' },
}
test('Should check for stored github token', () => {
  checkAndSetAuth()
  expect(configstore.get).toBeCalledWith('githubUserToken', '')
})

test('Should return on no Token', async () => {
  configstore.get.mockReturnValue('')
  const { redoAuth } = await checkAndSetAuth()
  expect(redoAuth).toEqual(true)
})

describe('If token is present', () => {
  beforeAll(() => {
    configstore.get.mockReturnValue(TESTTOKEN)
  })
  test('Should ping github with it', () => {
    checkAndSetAuth()
    expect(getGithubSignedInUser).toBeCalledWith(TESTTOKEN)
  })
  test('Should crosscheck name and id with returned values', async () => {
    getGithubSignedInUser.mockResolvedValue(USER)
    const { redoAuth } = await checkAndSetAuth()
    expect(configstore.get).toBeCalledWith('githubUserId')
    expect(configstore.get).toBeCalledWith('githubUserName')
    expect(redoAuth).toEqual(false)
  })
})

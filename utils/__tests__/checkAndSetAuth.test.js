/* eslint-disable */

const { configstore } = require('../../configstore')
const { checkAndSetAuth } = require('../checkAndSetAuth')
const { getGithubSignedInUser } = require('../getSignedInUser')

jest.mock('../../configstore')
jest.mock('../getSignedInUser')

const USER = {
  user: { userName: 'testName', userId: 'testId' },
}

describe('if no token is present', () => {
  beforeAll(() => {
    configstore.removeGitUser()
  })
  test('Should return on no Token', async () => {
    const { redoAuth } = await checkAndSetAuth()
    expect(redoAuth).toEqual(true)
  })
})

describe('If token is present', () => {
  test('Should ping github with it', async () => {
    configstore.addGitUser('arjun', 'arjun', '###')
    await checkAndSetAuth()
    expect(getGithubSignedInUser).toBeCalledWith('###')
  })
  test('Should crosscheck name and id with returned values', async () => {
    getGithubSignedInUser.mockResolvedValue(USER)
    configstore.addGitUser(USER.user.userName, USER.user.userId, '&&&')
    // configstore.addGitUser('testName', 'testId')
    const { redoAuth } = await checkAndSetAuth()
    expect(configstore.get).toHaveReturnedWith('testName')
    // expect(configstore.get).toBeCalledWith('githubUserName')
    expect(redoAuth).toEqual(false)
  })
})
test('Should check for stored github token', async () => {
  await checkAndSetAuth()
  expect(configstore.get).toBeCalledWith('githubUserToken', '')
})

/* eslint-disable */

const axios = require('axios')
const { spinnies } = require('../../loader')
const { githubGetDeviceCode, githubClientID } = require('../api')
const { checkAndSetAuth } = require('../checkAndSetAuth')
const checkAuth = require('../checkAuth')
const { ensureUserLogins } = require('../ensureUserLogins')
const handleGithubAuth = require('../handleGithubAuth')

const POSTDATA = {
  client_id: githubClientID,
  scope: 'repo,read:org',
}
const URIENCODEDSTRING = 'ABC%20abc%20123'
const DECODEDSTRING = 'ABC abc 123'
const resp = { data: URIENCODEDSTRING }

jest.mock('../handleGithubAuth')
jest.mock('../checkAndSetAuth')
jest.mock('../checkAuth.js')
jest.mock('axios')
jest.mock('../../loader')

const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {})
afterEach(() => {
  logSpy.mockClear()
})

beforeAll(() => {
  axios.post.mockResolvedValue(resp)
})

afterAll(() => {
  jest.clearAllMocks()
  logSpy.mockRestore()
})

test('Should check auth states', async () => {
  await ensureUserLogins()
  expect(checkAndSetAuth).toBeCalled()
})

describe('If no github account found', () => {
  beforeAll(() => {
    checkAuth.mockResolvedValue({ redoShieldAuth: false })
    checkAndSetAuth.mockResolvedValue({ redoAuth: true })
  })
  test('Should start github login', async () => {
    await ensureUserLogins()
    expect(axios.post).toHaveBeenCalledWith(githubGetDeviceCode, POSTDATA)
    expect(handleGithubAuth).toHaveBeenCalledWith(DECODEDSTRING)
  })
})

describe('If github account is found', () => {
  beforeAll(() => {
    axios.post.mockReset()
    checkAndSetAuth.mockResolvedValue({ redoAuth: false })
  })
  test('Should not start login', async () => {
    await ensureUserLogins()
    expect(axios.post).not.toBeCalled()
  })
})

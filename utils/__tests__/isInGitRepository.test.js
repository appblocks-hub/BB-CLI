/* eslint-disable */

const { isInGitRepository } = require('../gitCheckUtils')
const { execSync } = require('child_process')

const IN_GIT_REPO_CHECK = 'git rev-parse --is-inside-work-tree'

jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process')

  return {
    ...originalModule,
    execSync: jest
      .fn(() => {})
      .mockImplementationOnce(() => {
        throw new Error('fatal')
      })
      .mockImplementationOnce(() => {}),
  }
})

describe('is in git repo check', () => {
  afterAll(() => {
    jest.mock().clearAllMocks()
  })
  test('Should return false', () => {
    const c = isInGitRepository()
    expect(c).toBe(false)
  })
  test('Should return true ', () => {
    const c = isInGitRepository()
    expect(c).toBe(true)
  })
  test('Should call with correct command', () => {
    const c = isInGitRepository()
    expect(execSync).toHaveBeenCalledWith(IN_GIT_REPO_CHECK, {
      stdio: 'ignore',
    })
  })
})

/* eslint-disable */

const { default: axios } = require('axios')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const logout = require('../logout')

jest.mock('axios')
jest.mock('../../loader')
jest.mock('../../utils/cli-feedback')

const successData = {
  data: {
    success: true,
    message: 'ser',
  },
}

const failedData = {
  data: {
    success: false,
    message: 'Token error',
  },
}

afterAll(() => {
  jest.resetAllMocks()
})

test('Should connect to logout endpoint', async () => {
  axios.post.mockResolvedValue(successData)
  await logout()
  expect(axios.post).toHaveBeenCalled()
})

test('Should show error if logout failed', async () => {
  axios.post.mockResolvedValue(failedData)
  await logout()
  expect(feedback).toHaveBeenCalledWith({ type: 'info', message: failedData.data.message })
})

test('Should show error on rejected network call', async () => {
  axios.post.mockRejectedValue(new Error('rejected'))
  await logout()
  expect(feedback).toHaveBeenCalledWith({ type: 'info', message: 'rejected' })
})

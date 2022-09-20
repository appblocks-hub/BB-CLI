/* eslint-disable */

const { configstore } = require('../../configstore')
const { feedback } = require('../../utils/cli-feedback')
const disconnect = require('../disconnect')

jest.mock('../../utils/cli-feedback')
jest.mock('../../configstore')

test('Should only accept github as service', async () => {
  await disconnect('mercury')
  expect(feedback).toHaveBeenCalledWith({ type: 'error', message: 'Only github is supported' })
})

test('Should remove git tokens from configstore', async () => {
  await disconnect('github')
  expect(configstore.delete).toHaveBeenCalledTimes(2)
})

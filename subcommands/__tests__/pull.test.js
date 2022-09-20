/* eslint-disable */

const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { getBlockDetails } = require('../../utils/registryUtils')
const pull = require('../pull')

const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {})

jest.mock('../../utils/registryUtils')
jest.mock('../../loader')
jest.mock('../../utils/cli-feedback')

const mockResolvedData = { status: 200, data: { data: '', err: true, msg: 'something wrong at server' } }
const { fail } = spinnies

afterEach(() => {
  logSpy.mockClear()
  fail.mockClear()
})

afterAll(() => {
  logSpy.mockRestore()
})

test('Should try to get block details', async () => {
  getBlockDetails.mockResolvedValue({ status: 204 })
  await pull('appname', { cwd: '' })
  expect(getBlockDetails).toBeCalledWith('appname')
})

test('Should display error message if block not present', async () => {
  getBlockDetails.mockResolvedValue({ status: 204 })
  await pull('appname', { cwd: '' })
  expect(fail.mock.calls[0][1]).toStrictEqual({ text: `appname doesn't exists in block repository` })
})

test('Should display error message if server error', async () => {
  getBlockDetails.mockResolvedValue(mockResolvedData)
  await pull('appname', { cwd: '' })
  expect(feedback).toBeCalledWith({ type: 'info', message: 'something wrong at server' })
})

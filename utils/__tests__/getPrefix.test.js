/* eslint-disable */

const { getPrefix } = require('../questionPrompts')
const inquirer = require('inquirer')

jest.mock('inquirer')
test('Should return aUserEnteredValue', async () => {
  inquirer.prompt = jest.fn().mockResolvedValue({ subModulePrefix: 'aUserEnteredValue' })
  const prefix = await getPrefix('default')
  expect(prefix).toEqual('aUserEnteredValue')
})
test('Should return the default value passed', async () => {
  inquirer.prompt = jest.fn().mockResolvedValue({ subModulePrefix: '' })
  const prefix = await getPrefix('default')
  expect(prefix).toEqual('default')
})

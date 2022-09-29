/* eslint-disable */

const fs = require('fs')
const isValidAppBlockProject = require('../isValidAppBlockProject')

const VALIDFILES = ['block.config.json']

jest.mock('fs')

afterEach(() => {
  jest.clearAllMocks()
})

test('Should call readDirSync with value passed to main fn', () => {
  fs.readdirSync.mockReturnValue(VALIDFILES)
  isValidAppBlockProject('dir')
  expect(fs.readdirSync).toHaveBeenCalledWith('dir')
})

test('Should check for block.config.json', () => {
  const spy = jest.spyOn(global.Array.prototype, 'includes')
  fs.readdirSync.mockReturnValue(VALIDFILES)
  isValidAppBlockProject('dir')
  expect(spy).toHaveBeenCalledWith('block.config.json')
  spy.mockRestore()
})

test('Should return false on ENOENT', () => {
  fs.readdirSync.mockImplementation(() => {
    let err = new Error('No such File or Directory')
    err.code = 'ENOENT'
    throw err
  })
  const res = isValidAppBlockProject('dir')
  expect(res).toBe(false)
})

test('Should check for type of project if config found', () => {})

test('Should validate mapping', () => {})

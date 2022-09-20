/* eslint-disable */

const { isValidBlockName } = require('../blocknameValidator')

test('Should not accept emoji', () => {
  expect(isValidBlockName('😁')).toBe(false)
})

test('Should not accept emoji with letters', () => {
  expect(isValidBlockName('as😁as')).toBe(false)
})

test('Should accept abc', () => {
  expect(isValidBlockName('123abc')).toBe(true)
})

test('Should accept 123', () => {
  expect(isValidBlockName('123')).toBe(true)
})

test('Should accept 123abc', () => {
  expect(isValidBlockName('123abc')).toBe(true)
})

test('Should accept 123abc-_', () => {
  expect(isValidBlockName('123abc')).toBe(true)
})

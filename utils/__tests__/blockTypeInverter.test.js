/* eslint-disable */

const { blockTypeInverter } = require('../blockTypeInverter')
const { blockTypes } = require('../blockTypes')

blockTypes.forEach((t) => {
  test(`Should return ${t[1]}`, () => {
    const ans = blockTypeInverter(t[0])
    expect(ans).toBe(t[1])
  })
})

blockTypes.forEach((t) => {
  test(`Should return ${t[0]}`, () => {
    const ans = blockTypeInverter(t[1])
    expect(ans).toBe(t[0])
  })
})

test('Should throw if a number outside 1-6 is given', () => {
  expect(() => blockTypeInverter(7)).toThrow()
})

test('Should throw if an unknown type string is given', () => {
  expect(() => blockTypeInverter('a type')).toThrow()
})

test('Should throw if function is passed as arg', () => {
  expect(() => blockTypeInverter(() => {})).toThrow()
})

test('Should throw if object is passed as arg', () => {
  expect(() => blockTypeInverter({})).toThrow()
})

test('Should throw if boolean is passed as arg', () => {
  expect(() => blockTypeInverter(false)).toThrowError('Type must be a string or number')
})

/* eslint-disable */

const { blockTypeInverter } = require('../blockTypeInverter')

test('Should return 1', () => {
  const ans = blockTypeInverter('appBlock')
  expect(ans).toBe(1)
})

test('Should return "data"', () => {
  const ans = blockTypeInverter(5)
  expect(ans).toBe('data')
})

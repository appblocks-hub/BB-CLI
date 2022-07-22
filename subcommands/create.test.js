/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const { create } = require('./create')
const createBlock = require('../utils/createBlock')

jest.mock('../utils/createBlock')

const [p1, p2, ...rest] = process.argv
const testData = [
  {
    args: [p1, p2, 'TODO', '-t', 'uicontainer'],
    expect: 'uicontainer',
  },
  {
    args: [p1, p2, 'TODO', '-t', 'uicomponent'],
    expect: 'uicomponent',
  },
  {
    args: [p1, p2, 'TODO', '-t', 'fncomponent'],
    expect: 'fncomponent',
  },
]

afterEach(() => {
  createBlock.mockClear()
})

testData.forEach((obj) => {
  test('Should call createBlock with ' + obj.expect, async () => {
    await create(obj.args)
    expect(createBlock).toBeCalledWith(obj.expect)
  })
})

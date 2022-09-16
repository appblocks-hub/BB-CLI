/* eslint-disable */
const mock = jest.fn().mockImplementation(() => {
  return { init: jest.fn() }
})

export default mock

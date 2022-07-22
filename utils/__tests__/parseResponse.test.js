/* eslint-disable */

const parse = require('../parseResponse')
const d =
  'device_code=1234&expires_in=899&interval=5&user_code=730B-8F1C&verification_uri=https://github.com/login/device'
const pv = {
  device_code: '1234',
  expires_in: '899',
  interval: '5',
  user_code: '730B-8F1C',
  verification_uri: 'https://github.com/login/device',
}
test('Should parse properly', () => {
  const v = parse(d)
  expect(v).toEqual(pv)
})

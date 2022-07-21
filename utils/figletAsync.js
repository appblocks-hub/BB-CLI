/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
const figlet = require('figlet')

module.exports = function FigletAsync(n) {
  return new Promise((res) => {
    figlet(n, { font: 'Colossal' }, (err, data) => {
      if (err) {
        // console.log('Something went wrong...')
        // fallback print
        console.log(n)
        res()
      }
      console.log(data)
      res()
    })
  })
}

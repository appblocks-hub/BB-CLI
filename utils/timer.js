/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// eslint-disable-next-line prefer-destructuring
let duration = process.argv.slice(2)[0]
const Timer = setInterval(() => {
  if (duration) {
    duration -= 1
  } else {
    stop()
  }
}, 1000)
process.on('message', (m) => {
  // console.log(m);
  if (m === 'KILLTIMER') {
    clearInterval(Timer)
    process.exit(0)
  }
})
function stop() {
  clearInterval(Timer)
  console.log('OTP expired!!')
  process.send('STOP')
  process.exit(0)
}

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { fork } = require('child_process')

function timerThread(seconds) {
  const cpf = fork(path.join(__dirname, 'timer.js'), [seconds])
  // console.log('pid-',cpf.pid);
  // console.log('Thread started for ', seconds);
  cpf.on('message', (m) => {
    // console.log(m);
    if (m === 'STOP') {
      process.exit(0)
    }
  })
  // cpf.on('close',(c)=>console.log('timer stopped',c))
  // cpf.on('exit',(c)=>console.log('timer stopped',c))
  return cpf
}

module.exports = timerThread

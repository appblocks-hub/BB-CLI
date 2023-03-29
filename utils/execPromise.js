const { exec } = require('child_process')

function pexec(cmd, options) {
  return new Promise((resolve) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        resolve({ err: stderr.toString(), out: stdout.toString() })
        return
      }
      resolve({ err: null, out: stdout.toString() })
    })
  })
}

module.exports = { pexec }

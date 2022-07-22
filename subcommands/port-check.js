/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var tcpPortUsed = require('tcp-port-used')

async function validateAndAssignPort(port, startPort) {
  if (port) {
    const isDefaultPortNotAvailable = await checkPort(port)
    // ask, the configured port is busy, do you want start in another port and if yes
    if (isDefaultPortNotAvailable) {
      const [newPort] = await findFreePort(startPort || 3000)
      port = newPort
    }
  } else {
    const [newPort] = await findFreePort(startPort || 3000)
    port = newPort
  }
  return port
}
function checkPort(port, host) {
  let hostUrl = host
  if (!hostUrl) {
    hostUrl = '127.0.0.1'
  }
  return tcpPortUsed.check(port, hostUrl)
}
const net = require('net')
const { updateEnv } = require('../utils/env')

// call method 1: (port, cb(err, freePort))
// call method 2: (portBeg, portEnd, cb(err, freePort))
// call method 3: (portBeg, host, cb(err, freePort))
// call method 4: (portBeg, portEnd, host, cb(err, freePort))
// call method 5: (portBeg, portEnd, host, howmany, cb(err, freePort1, freePort2, ...))

function findFreePortFn(beg, ...rest) {
  const p = rest.slice(0, rest.length - 1),
    cb = rest[rest.length - 1]
  let [end, ip, cnt] = Array.from(p)
  if (!ip && end && !/^\d+$/.test(end)) {
    // deal with method 3
    ip = end
    end = 65534
  } else {
    if (end == null) {
      end = 65534
    }
  }
  if (cnt == null) {
    cnt = 1
  }

  const retcb = cb
  const res = []
  const probe = function (ip, port, cb) {
    const s = net.createConnection({ port: port, host: ip })
    s.on('connect', function () {
      s.end()
      cb(null, port + 1)
    })
    s.on('error', (err) => {
      cb(port)
    }) // can't connect, port is available
  }
  var onprobe = function (port, nextPort) {
    if (port) {
      res.push(port)
      if (res.length >= cnt) {
        retcb(null, ...res)
      } else {
        setImmediate(() => probe(ip, port + 1, onprobe))
      }
    } else {
      if (nextPort >= end) {
        retcb(new Error('No available ports'))
      } else {
        setImmediate(() => probe(ip, nextPort, onprobe))
      }
    }
  }
  return probe(ip, beg, onprobe)
}

function findFreePort(beg, ...rest) {
  const last = rest[rest.length - 1]
  if (typeof last === 'function') {
    findFreePort(beg, ...rest)
  } else {
    return new Promise((resolve, reject) => {
      findFreePortFn(beg, ...rest, (err, ...ports) => {
        if (err) reject(err)
        else resolve(ports)
      })
    })
  }
}

async function validateAndAssignPortProxy(p) {
  /**
   * Since long running processes use npx and all packages are downloaded and installed,
   * and we are not waiting for app to start listening at the port,
   * same port might be assigned again as port used check can fail.
   * So keep a list of assigned ports in one session to avoid assigning same ports
   */

  global.assignedPorts = global.assignedPorts || []
  let port

  port = await validateAndAssignPort(p)
  while (global.assignedPorts.findIndex((v) => v === port) > -1) {
    port = await validateAndAssignPort(port + 1, port + 1)
  }
  global.assignedPorts.push(port)
  return port
}

const getFreePorts = async (appConfig, blockName) => {
  // if block name is passed return a port for that block
  if (blockName) {
    const blockConfig = appConfig.getBlockWithLive(blockName)
    const portValue = await validateAndAssignPortProxy(blockConfig.port)
    return portValue
  }

  const ports = {}

  // Get ports for ui blocks
  for (const block of appConfig.uiBlocks) {
    const bName = block.meta.name
    const blockToStart = appConfig.getBlockWithLive(bName)
    ports[bName] = await validateAndAssignPortProxy(blockToStart.port)
  }

  // Get port for emulator
  ports.emulator = await validateAndAssignPortProxy(5000)

  // Update the ports to env
  const envPortValues = Object.entries(ports).reduce((acc, [bName, bPort]) => {
    if (bName === 'emulator') {
      acc.BLOCK_FUNCTION_URL = `http://localhost:${bPort}`
    } else {
      acc[`BLOCK_ENV_URL_${bName}`] = `http://localhost:${bPort}`
    }
    return acc
  }, {})
  await updateEnv('view', envPortValues)
  await updateEnv('functions', { BLOCK_FUNCTION_URL: envPortValues.BLOCK_FUNCTION_URL })

  return ports
}

module.exports = {
  checkPort,
  findFreePort,
  validateAndAssignPort: validateAndAssignPortProxy,
  getFreePorts,
}

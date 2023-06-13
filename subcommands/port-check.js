/**
 * Copyright (c) Appblocks. and its affiliates.
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
      const [newPort] = await findFreePort(startPort || port || 3000)
      port = newPort
    }
  } else {
    const [newPort] = await findFreePort(startPort || port || 3000)
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

async function validateAndAssignPortProxy(p, pr) {
  /**
   * Since long running processes use npx and all packages are downloaded and installed,
   * and we are not waiting for app to start listening at the port,
   * same port might be assigned again as port used check can fail.
   * So keep a list of assigned ports in one session to avoid assigning same ports
   */

  global.assignedPorts = global.assignedPorts || []
  let port = []

  if (pr > p) {
    for (let i = p; i < pr + 1; i++) {
      let portValue = await validateAndAssignPort(i)
      while (global.assignedPorts.findIndex((v) => v === portValue) > -1) {
        portValue = await validateAndAssignPort(portValue + 1, portValue + 1)
      }
      global.assignedPorts.push(portValue)
      port.push(portValue)
    }
  } else {
    port = await validateAndAssignPort(p)
    while (global.assignedPorts.findIndex((v) => v === port) > -1) {
      port = await validateAndAssignPort(port + 1, port + 1)
    }
    global.assignedPorts.push(port)
  }

  return port
}

const getFreePorts = async (appConfig, blockName, startBlockType) => {
  // if block name is passed return a port for that block
  if (blockName) {
    const blockConfig = appConfig.getBlockWithLive(blockName)
    const portValue = await validateAndAssignPortProxy(blockConfig.port)
    return portValue
  }

  const ports = {}

  if (!startBlockType || startBlockType === 'ui') {
    // Get ports for ui blocks
    for (const block of appConfig.uiBlocks) {
      let bName = block.meta.name
      const blockToStart = appConfig.getBlockWithLive(bName)
      if (blockToStart.isOn && blockToStart.port) {
        if (block.meta.type === 'ui-dep-lib') {
          bName = 'BB_DEP_LIB_URL'
        }
        ports[bName] = await validateAndAssignPortProxy(blockToStart.port)
      }
    }
  }

  if (!startBlockType || startBlockType === 'function') {
    // Get port for emulator
    const emPortFavoured = parseInt(process.env.BB_EM_PORT || 5000)
    ports.emulatorPorts = await validateAndAssignPortProxy(emPortFavoured, emPortFavoured + 5)
    // ports.emulator = await validateAndAssignPortProxy(5000)
  }

  if (!startBlockType || startBlockType === 'ui') {
    const emElePortFavoured = parseInt(process.env.AB_EM_ELEMENTS_PORT || 4200)
    ports.emElements = await validateAndAssignPortProxy(emElePortFavoured, emElePortFavoured + 5)

    const containerFavoured = parseInt(process.env.AB_CONTAINER_PORT || 3000)
    ports.container = await validateAndAssignPortProxy(containerFavoured, containerFavoured + 5)
  }

  // Update the ports to env
  const envPortValues = Object.entries(ports).reduce((acc, [bName, bPort]) => {
    if (!bPort || !bName) return acc
    const url = `http://localhost:${bPort[0] || bPort}`

    if (!startBlockType || startBlockType === 'ui') {
      switch (bName) {
        case 'emElements':
          acc.BB_ELEMENTS_URL = `${url}/remoteEntry.js`
          acc.BB_DEP_LIB_URL = `${url}/remoteEntry.js`
          break

        case 'container':
          acc.BB_CONTAINER_URL = url
          break

        default:
          acc[`BB_ENV_URL_${bName}`] = url
          break
      }
    }
    if (!startBlockType || startBlockType === 'function') {
      switch (bName) {
        case 'emulatorPorts':
          acc.BB_FUNCTION_URL = url
          break

        default:
          acc[`BB_ENV_URL_${bName}`] = url
          break
      }
    }

    return acc
  }, {})

  await updateEnv('view', envPortValues)
  await updateEnv(
    'function',
    envPortValues?.BB_FUNCTION_URL ? { BB_FUNCTION_URL: envPortValues.BB_FUNCTION_URL } : {}
  )

  return ports
}

module.exports = {
  checkPort,
  findFreePort,
  validateAndAssignPort: validateAndAssignPortProxy,
  getFreePorts,
}

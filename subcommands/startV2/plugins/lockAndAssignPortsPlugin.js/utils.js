const os = require('os')
const net = require('net')

class Locked extends Error {
  constructor(port) {
    super(`${port} is locked`)
  }
}

const getLocalHosts = () => {
  const interfaces = os.networkInterfaces()

  // Add undefined value for createServer function to use default host,
  // and default IPv4 host in case createServer defaults to IPv6.
  const results = new Set([undefined, '0.0.0.0'])

  for (const _interface of Object.values(interfaces)) {
    for (const config of _interface) {
      results.add(config.address)
    }
  }

  return results
}

const checkAvailablePort = (options) =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)

    server.listen(options, () => {
      const { port } = server.address()
      server.close(() => {
        resolve(port)
      })
    })
  })

const getAvailablePort = async (options, hosts) => {
  if (options.host || options.port === 0) {
    return checkAvailablePort(options)
  }

  for (const host of hosts) {
    try {
      await checkAvailablePort({ port: options.port, host }) // eslint-disable-line no-await-in-loop
    } catch (error) {
      if (!['EADDRNOTAVAIL', 'EINVAL'].includes(error.code)) {
        throw error
      }
    }
  }

  return options.port
}
module.exports = { Locked, checkAvailablePort, getLocalHosts, getAvailablePort }

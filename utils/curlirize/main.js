/**
 *
 * THIS IS COPIED FROM:
 * https://github.com/anthonygauthier/axios-curlirize/blob/master/src/main.js
 * and modified by hand.
 *
 */
const CurlHelper = require('./CurlHelper')

function defaultLogCallback(curlResult, err) {
  const { command } = curlResult
  if (err) {
    console.error(err)
  } else {
    console.info(command)
  }
}

const curlirize = (instance, callback = defaultLogCallback) => {
  instance.interceptors.request.use((req) => {
    try {
      const curl = new CurlHelper(req)
      req.curlObject = curl
      req.curlCommand = curl.generateCommand()
      req.clearCurl = () => {
        delete req.curlObject
        delete req.curlCommand
        delete req.clearCurl
      }
    } catch (err) {
      // Even if the axios middleware is stopped, no error should occur outside.
      callback(null, err)
    } finally {
      if (req.curlirize !== false) {
        callback({
          command: req.curlCommand,
          object: req.curlObject,
        })
      }
      // eslint-disable-next-line no-unsafe-finally
      return req
    }
  })
}

module.exports = curlirize

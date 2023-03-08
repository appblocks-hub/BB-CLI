const { default: axios } = require('axios')
const { getShieldHeader, getGitRestHeaders, getGitHeader } = require('./getHeaders')

const shieldHTTP = axios.create({ headers: getShieldHeader() })
const gitRestHTTP = axios.create({ headers: getGitRestHeaders() })
const gitHTTP = axios.create({ headers: getGitHeader() })

module.exports = {
  axios,
  shieldHTTP,
  gitRestHTTP,
  gitHTTP,
}

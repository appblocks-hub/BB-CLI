const { default: axios } = require('axios')
const { githubGraphQl } = require('./api')
const { getShieldHeader, getGitRestHeaders, getGitHeader } = require('./getHeaders')

const shieldHTTP = axios.create({ headers: getShieldHeader() })
const gitRestHTTP = axios.create({ headers: getGitRestHeaders() })
const gitGraphHTTP = axios.create({ headers: getGitHeader(), url: githubGraphQl })

module.exports = {
  axios,
  shieldHTTP,
  gitRestHTTP,
  gitGraphHTTP,
}

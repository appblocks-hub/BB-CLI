const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const envConfig = {
  BLOCK_REG_BASE_URL: process.env.BLOCK_REG_BASE_URL || `https://api-blocks-registry.appblocks.com`,
  SHIELD_BASE_URL: process.env.SHIELD_BASE_URL || `https://shield.appblocks.com`,
  APP_REG_BASE_URL: process.env.APP_REG_BASE_URL || `https://api-app-registry.appblocks.com`,
  SPACES_API_BASE_URL: process.env.SPACES_API_BASE_URL || `https://api-spaces.appblocks.com`,
  SPACES_BASE_URL: process.env.SPACES_BASE_URL || `https://spaces.appblocks.com`,
  CLIENT_ID: process.env.CLIENT_ID || `console-appblocks-1842`,
}

module.exports = envConfig

import fs from 'fs'
import path from 'path'
import { createFileSync, sendResponse } from './utils.js'
import { env } from '@appblocks/node-sdk'

// Init environment
env.init()

const handler = ({ req, res }) => {
  try {
    // health check
    if (req.params['health'] === 'health') {
      return sendResponse(res, 200, {
        success: true,
        msg: 'Health check success',
      })
    }

    const DB_FILE = path.resolve('../db.json')
    createFileSync(DB_FILE)
    const data = fs.readFileSync(DB_FILE, { encoding: 'utf8', flag: 'r' })
    const resData = JSON.parse(data || '[]')
    console.log('Response data:\n', resData)
    console.log('\n')
    sendResponse(res, 200, resData)
  } catch (e) {
    console.log(e)
    sendResponse(res, 500, { status: 'failed', errMsg: e.message })
  }
}
export default handler

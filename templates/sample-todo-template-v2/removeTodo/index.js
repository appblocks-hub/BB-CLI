import fs from 'fs'
import path from 'path'
import { getBody, getDB, sendResponse } from './utils.js'
import { env } from '@appblocks/node-sdk'

// Init environment
env.init()

const handler = async ({ req, res }) => {
  try {
    // health check
    if (req.params['health'] === 'health') {
      return sendResponse(res, 200, {
        success: true,
        msg: 'Health check success',
      })
    }

    const DB_FILE = path.resolve('../db.json')
    const inmemDB = getDB(DB_FILE)
    const { id } = await getBody(req)
    console.log('Request to remove item -', id)
    console.log('\n')
    console.log('Data in DB', inmemDB)
    console.log('\n')

    const index = inmemDB.findIndex((obj) => {
      return obj.id == id
    })

    if (index !== -1) {
      inmemDB.splice(index, 1)
      fs.writeFileSync(DB_FILE, JSON.stringify(inmemDB, null, 2))
    }
    console.log('Updated DB:\n', inmemDB)
    sendResponse(res, 200, { status: 'Success' })
  } catch (e) {
    console.log(e)
    sendResponse(res, 500, { status: 'failed', errMsg: e.message })
  }
}

export default handler

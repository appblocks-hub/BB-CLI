import fs from 'fs'
import path from 'path'

/**
 * Create or get file
 * @param {*} filePath
 * @returns
 */
export const createFileSync = (filePath) => {
  let stats
  try {
    stats = fs.statSync(filePath)
  } catch {
    console.log('stat')
  }
  if (stats && stats.isFile()) return

  const dir = path.dirname(filePath)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOENT error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') fs.mkdirSync(dir)
    else throw err
  }

  fs.writeFileSync(filePath, '')
}

/**
 * Read file as DB
 * @returns
 */
export const getDB = (dbFilePath) => {
  try {
    const arr = []
    createFileSync(dbFilePath) // create the file if not present
    const data = fs.readFileSync(dbFilePath, { encoding: 'utf8', flag: 'r' })
    if (data !== '') {
      arr.push(...JSON.parse(data))
    }
    return arr
  } catch (err) {
    console.log('Error initializing DB', err)
    return []
  }
}

/**
 * Function to format and send response
 * @param {*} res
 * @param {*} code
 * @param {*} data
 * @param {*} type
 */
export const sendResponse = (res, code, data, type = 'application/json') => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Content-Type': type,
  }

  res.writeHead(code, headers)
  res.write(JSON.stringify(data))
  res.end()
}

/**
 * Function to extract the body from the request
 * @param {*} req
 * @returns
 */
export const getBody = async (req) => {
  const bodyBuffer = []
  for await (const chunk of req) {
    bodyBuffer.push(chunk)
  }
  const data = Buffer.concat(bodyBuffer).toString()
  return JSON.parse(data || '{}')
}

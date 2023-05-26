const { mkdir, writeFile } = require('fs/promises')
const path = require('path')

const packageJson = () => `
{
  "name": "appblock-emulator",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.17.2",
    "http": "0.0.1-security",
    "cors": "^2.8.5"
  }
}`

const emulatorCode = (blockEmulateData, port) => `
import express from "express"
import http from "http"
import cors from "cors"
import path from "path"

const appHandler = (type) => async (req, res, next) => {
  try {
    const blocks = ${JSON.stringify(blockEmulateData)}

    const url = req.params[0]

    if (url.includes("health")) {
      //check for health param and inject if needed
      req.params.health = "health"
    }

    console.log("url", url)

    const blockData = blocks[url]
    if (!blockData) {
      res.send("requested function not registered in app.").status(404)
      return
    }

    const func_route = path.join(blockData.directory, "index.js" )
    let handler = await import(func_route)
    if (process.env.NODE_ENV === "development") {
      handler = await import(func_route + "?update=" + Date.now())
    }

    console.log("handler = ", handler)

    const event = { req, res, next }
    await handler.default(event)

  } catch (err) {
    console.error(err)
    res.send("Something went wrong. Please check function log").status(500)
  }
}

const app = express()
app.use(cors())
app.all("/*", appHandler("function"))

const server = http.createServer(app)
server.listen(${port})
console.log("Functions emulated on port ${port}")
`

/**
 *
 * @param {import('fs').PathLike} emPath Emulator directory path
 * @returns
 */
async function generateEmFolder(emPath, blockEmulateData, port) {
  const res = { err: false, data: '' }
  try {
    await mkdir(emPath, { recursive: true })
    await writeFile(path.join(emPath, '.gitignore'), '._ab_em/*')
    await writeFile(path.join(emPath, 'index.js'), emulatorCode(blockEmulateData, port).trim())
    await writeFile(path.join(emPath, 'package.json'), packageJson())
    res.data = 'completed'
  } catch (err) {
    res.err = true
    res.data = err.message
  }
  return res
}

module.exports = {
  generateEmFolder,
}
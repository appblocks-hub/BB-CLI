/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express'
import http from 'http'
import { readFile } from 'fs/promises'

const app = express()

app.all('/:route', async (req, res) => {
  const appConfig = JSON.parse(await readFile('./appblock.json', 'utf8'))
  const blocks = Object.keys(appConfig)

  const requestedFunc = req.params.route
  console.log(requestedFunc)

  if (blocks.includes(requestedFunc)) {
    const funcRoute = `${appConfig[requestedFunc].directory}/index.js`
    const handler = await import(funcRoute)
    await handler[requestedFunc](req, res)
  } else {
    res.send('requested function not registered in app.').status(404)
  }
})

const server = http.createServer(app)
server.listen(3000)

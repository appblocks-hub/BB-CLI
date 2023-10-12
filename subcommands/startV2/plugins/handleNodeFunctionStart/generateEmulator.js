const { mkdir, writeFile } = require('fs/promises')
const path = require('path')
const { BB_FOLDERS } = require('../../../../utils/bbFolders')

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
    "@appblocks/node-sdk": "^0.0.7",
    "http": "0.0.1-security",
    "cors": "^2.8.5",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  }
}`

const emulatorCode = (port) =>
  `
import express from "express";
import http from "http";
import cors from "cors";
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import executeMiddleware from "./middlewareHandler.js";
import { getBlock,getFunctionEntryPaths } from "./utils.js";
import { env } from "@appblocks/node-sdk";

env.init()


const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Open api documentation for appblocks',
    version: '1.0.0',
  },
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: getFunctionEntryPaths(),
};

const swaggerSpec = swaggerJSDoc(options);

const appHandler = async (req, res, next) => {
  try {
    let url = req.params[0];

    if (url.includes("health")) {
      req.params.health = "health";
      url = url.replace("/health", "")
    }

    const { block, route } = getBlock(url);
    if (!block) {
      console.log("No block found for url -> ", url);
      res.send("requested function not registered in app.").status(404);
      res.end();
      return;
    }

    console.log("\\nRequest to block ", block.name);
    // Execute middleware functions
    const continueNext = await executeMiddleware(block.middlewares, { req, res, next });
    if (!continueNext) return

    const isDev = process.env.NODE_ENV !== "production";
    const importPath = isDev ? route + "?update=" + Date.now() : route;
    const handler = await import(importPath);

    console.log("handler: ", handler);
    await handler.default({ req, res, next });
  } catch (err) {
    console.error(err);
    res.send("Something went wrong. Please check function log").status(500);
  }
};

const app = express();
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.all("/*", appHandler);

const server = http.createServer(app);
server.listen(${port});
console.log("Functions emulated on port ${port}");
  
`.trim()

const generateMiddlewareHandler = () =>
  `
import { getMiddlewareBlock } from "./utils.js";

const executeMiddleware = async (middlewareList, event) => {
  for (const middlewareName of middlewareList) {
    const isDev = process.env.NODE_ENV !== "production";
    const { block, route } = getMiddlewareBlock(middlewareName);
    if (!block) {
      console.log("No block found for ", middlewareName);
      continue;
    }

    const importPath = isDev ? route + "?update=" + Date.now() : route;
    const middlewareHandler = await import(importPath);
    
    const continueNext = await middlewareHandler.default(event);
    if (!continueNext) return false
  }

  return true
};

export default executeMiddleware;

`.trim()

const generateUtils = (blockList, middlewareBlockList) =>
  `
import path from "path";

const getBlock = (url) => {
  const blocks = ${JSON.stringify(blockList, null, 2)};

  const block = blocks[url];
  const route = block && path.join(block.directory, "index.js");

  return { route, block };
};

const getFunctionEntryPaths=()=>{
  const blocks = ${JSON.stringify(blockList, null, 2)};
  const functionEntryPaths=Object.keys(blocks).map(blockName=>{
    const block=blocks[""+blockName]
   return path.join(block["directory"], "index.js")})

  
  return functionEntryPaths
}



const getMiddlewareBlock = (url) => {
  const blocks = ${JSON.stringify(middlewareBlockList, null, 2)};

  const block = blocks[url];
  const route = block && path.join(block.directory, "index.js");

  return { route, block };
};

export { getBlock, getMiddlewareBlock,getFunctionEntryPaths };

`.trim()

/**
 *
 * @param {import('fs').PathLike} emPath Emulator directory path
 * @returns
 */
async function generateEmFolder(emPath, blockList, port, middlewareBlockList) {
  const res = { err: false, data: '' }
  try {
    await mkdir(emPath, { recursive: true })
    await writeFile(path.join(emPath, '.gitignore'), BB_FOLDERS.BB)
    await writeFile(path.join(emPath, 'index.js'), emulatorCode(port))
    await writeFile(path.join(emPath, 'package.json'), packageJson())
    await writeFile(path.join(emPath, 'middlewareHandler.js'), generateMiddlewareHandler())
    await writeFile(path.join(emPath, 'utils.js'), generateUtils(blockList, middlewareBlockList))
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

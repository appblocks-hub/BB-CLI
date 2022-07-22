const generatePackageJson = (name) => `{
    "name": "${name}",
    "version": "0.0.1",
    "description": "",
    "main": "index.js",
    "scripts": {
      "start": "node index.js --port=3000"
    },
    "type": "module",
    "keywords": [],
    "author": "",
    "license": "ISC",
    "dependencies": {
        "express": "^4.17.3"
    }
  }
`

module.exports = { generatePackageJson }

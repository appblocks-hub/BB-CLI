const generateIndex = (funcName) => `

const ${funcName} = async (req, res) => {

  // health check
  if (req.params["health"] === "health") {
    res.write(JSON.stringify({success: true, msg: "Health check success"}))
    res.end()
  }

  // Add your code here
  res.write(JSON.stringify({success: true, msg: \`Hello ${funcName}\`}))
  res.end()
  
}

export default ${funcName}
`

module.exports = { generateIndex }

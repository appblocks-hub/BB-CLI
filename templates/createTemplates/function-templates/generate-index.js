const generateIndex = (funcName) => `

const handler = async (req, res) => {

  // health check
  if (req.params["health"] === "health") {
    res.write(JSON.stringify({success: true, msg: "Health check success"}))
    res.end()
  }

  // Add your code here
  res.write(JSON.stringify({success: true, msg: \`Happy Hacking\`}))
  res.end()
  
}

export default handler
`

module.exports = { generateIndex }

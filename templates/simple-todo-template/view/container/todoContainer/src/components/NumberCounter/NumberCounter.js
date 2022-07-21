import React, { useEffect } from 'react'
import System from '../../System'

export const NumberCounter = () => {
  const [system, setSystem] = React.useState(undefined)
  function setLayout() {
    setSystem({
      url: 'http://localhost:4003/remoteEntry.js',
      scope: 'NumberCounter',
      module: './NumberCounter',
    })
  }
  useEffect(() => {
    setLayout()
  }, [])
  return <System system={system} />
}

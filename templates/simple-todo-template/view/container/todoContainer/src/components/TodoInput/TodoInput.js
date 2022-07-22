import React, { useEffect } from 'react'
import env from 'env'
import System from '../../System'

export const TodoInput = (props) => {
  const [system, setSystem] = React.useState(undefined)
  function setLayout() {
    setSystem({
      url: `${env.BLOCK_ENV_URL_todoInput}/remoteEntry.js`,
      scope: 'todoInput',
      module: './todoInput',
    })
  }
  useEffect(() => {
    setLayout()
  }, [])
  return <System system={system} {...props} />
}

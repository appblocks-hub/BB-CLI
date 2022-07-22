import React, { useEffect } from 'react'
import env from 'env'
import System from '../../System'

export const TodoItem = (props) => {
  console.log(props, 'gh')
  const [system, setSystem] = React.useState(undefined)
  function setLayout() {
    setSystem({
      url: `${env.BLOCK_ENV_URL_todoItem}/remoteEntry.js`,
      scope: 'todoItem',
      module: './todoItem',
    })
  }
  useEffect(() => {
    setLayout()
  }, [])
  return <System system={system} {...props} />
}

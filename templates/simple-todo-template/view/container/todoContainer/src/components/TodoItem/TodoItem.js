import React from 'react'
import { useFederatedComponent } from 'yah-js-sdk'

const TodoItem = (props) => {
  const system = {
    url: `${process.env.BLOCK_ENV_URL_todoItem}/remoteEntry.js`,
    scope: 'todoItem',
    module: './todoItem',
  }

  const { Component: FederatedComponent, errorLoading } = useFederatedComponent(
    system?.url,
    system?.scope,
    system?.module,
    React
  )

  // console.log(FederatedComponent);
  return (
    <React.Suspense fallback={''}>
      {errorLoading ? `Error loading module "${module}"` : FederatedComponent && <FederatedComponent {...props} />}
    </React.Suspense>
  )
}

export default TodoItem

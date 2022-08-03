import React from 'react'
import { useFederatedComponent } from 'yah-js-sdk'

const TodoInput = (props) => {
  const system = {
    url: `${process.env.BLOCK_ENV_URL_todoInput}/remoteEntry.js`,
    scope: 'todoInput',
    module: './todoInput',
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

export default TodoInput

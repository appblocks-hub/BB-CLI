import React from 'react'
import { useFederatedComponent } from '@appblocks/js-sdk'

const TodoInput = (props) => {
  const system = {
    module: './todoInput',
    scope: 'remotes',
    url: process.env.BB_ELEMENTS_URL,
  }

  const { Component: FederatedComponent, errorLoading } = useFederatedComponent(
    system?.url,
    system?.scope,
    system?.module,
    React
  )
  return (
    <React.Suspense fallback={''}>
      {errorLoading ? `Error loading module "${module}"` : FederatedComponent && <FederatedComponent {...props} />}
    </React.Suspense>
  )
}

export default TodoInput

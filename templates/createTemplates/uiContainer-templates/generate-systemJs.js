/* eslint-disable */

const generateUiContainerSystemJs = () => `
/* eslint-disable */
import React from 'react'
const Loader = () => <p>loading..</p>
export const loadComponent = (scope, module) => async () => {
  await __webpack_init_sharing__('default')
  const container = window[scope] // or get the container somewhere else
  await container.init(__webpack_share_scopes__.default)
  const factory = await window[scope].get(module)
  const Module = factory()
  return Module
}

const useDynamicScript = (args) => {
  const [ready, setReady] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    if (!args.url) {
      return
    }

    const element = document.createElement('script')

    element.src = args.url
    element.type = 'text/javascript'
    element.async = true

    setReady(false)
    setFailed(false)

    element.onload = () => {
      console.log('Dynamic Script Loaded: \${args.url}')
      setReady(true)
    }

    element.onerror = () => {
      console.error('Dynamic Script Error: \${args.url}')
      setReady(false)
      setFailed(true)
    }

    document.head.appendChild(element)

    return () => {
      console.log('Dynamic Script Removed: \${args.url}')
      document.head.removeChild(element)
    }
  }, [args.url])

  return {
    ready,
    failed,
  }
}

function System(props) {
  const { ready, failed } = useDynamicScript({
    url: props.system && props.system.url,
  })

  if (!props.system) {
    return <Loader />
  }

  if (!ready) {
    return <Loader />
  }

  if (failed) {
    return <h2>Failed to load dynamic script: {props.system.url}</h2>
  }

  const Component = React.lazy(
    loadComponent(props.system.scope, props.system.module)
  )
  return (
    <React.Suspense fallback={<Loader />}>
      <Component {...props} />
    </React.Suspense>
  )
}
export default System
`

module.exports = { generateUiContainerSystemJs }

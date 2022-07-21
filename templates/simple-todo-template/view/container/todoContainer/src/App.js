import React, { lazy } from 'react'
import { Suspense } from 'react'
import env from 'env'
const TodoInput = lazy(() => import('./components/TodoInput'))
const TodoItem = lazy(() => import('./components/TodoItem'))

function App() {
  const [todos, setTodos] = React.useState([])
  const [refetch, setRefetch] = React.useState(false)

  React.useEffect(() => {
    fetch(`${env.BLOCK_FUNCTION_URL}/listTodos`)
      .then((res) => res.json())
      .then((data) => {
        setTodos(data ? data.map(({ id, item }) => ({ id, item: item.name })) : [])
        setRefetch(false)
      })
      .catch((err) => console.log(err))
  }, [refetch])
  return (
    <Suspense fallback={<p>loading..</p>}>
      <h1>Container</h1>
      <TodoInput refetch={setRefetch} />
      {todos.map((item) => (
        <TodoItem refetch={setRefetch} item={item.item} id={item.id} key={item.id} />
      ))}
    </Suspense>
  )
}

export default App

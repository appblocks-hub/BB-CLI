import React, { lazy } from 'react'

function Home() {
  const TodoInput = lazy(() => import('../TodoInput'))
  const TodoItem = lazy(() => import('../TodoItem'))

  const [todos, setTodos] = React.useState([])
  const [refetch, setRefetch] = React.useState(false)

  React.useEffect(() => {
    console.log({ e: process.env })
    let updateData = [{ id: 'test', item: 'test' }]
    fetch(`${process.env.BB_FUNCTION_URL}/listTodos`)
      .then((res) => res.json())
      .then((data) => {
        updateData =
          data?.length > 0
            ? data.map(({ id, item }) => ({
                id,
                item: item.name,
              }))
            : []
        setRefetch(false)
      })
      .catch((err) => console.log({ err }))
      .finally(() => {
        setTodos(updateData)
      })
  }, [refetch])

  return (
    <React.Suspense fallback="">
      <TodoInput refetch={setRefetch} />
      {todos.map((item) => (
        <TodoItem refetch={setRefetch} item={item.item} id={item.id} key={item.id} />
      ))}
    </React.Suspense>
  )
}

export default Home

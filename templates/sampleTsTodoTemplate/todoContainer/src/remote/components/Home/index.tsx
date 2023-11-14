import React, { ReactElement, lazy } from 'react'

interface DataFragment {
  id: number,
  item : {name: string}
}

function Home():ReactElement {
  const TodoInput = lazy(() => import('../TodoInput/index.tsx'))
  const TodoItem = lazy(() => import('../TodoItem/index.tsx'))

  const [todos, setTodos] = React.useState<DataFragment[]>([])
  const [refetch, setRefetch] = React.useState(false)

  React.useEffect(() => {
    console.log({ e: process.env })
    let updateData = [{ id: 123, item: {name:'test'} }]
    fetch(`${process.env.BB_FUNCTION_URL}/listTodos`)
      .then((res) => res.json())
      .then((data) => {
        updateData =
          data?.length > 0
            ? data.map(({ id, item }:DataFragment) => ({
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

import React from 'react'
import env from 'env'
export const todoInput = ({ refetch }) => {
  const [todo, setTodo] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const handleAdd = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${env.BLOCK_FUNCTION_URL}/addTodo`, {
        method: 'post',
        body: JSON.stringify({ name: todo }),
      })

      const resp = await res.json()
      console.log(resp)
      setSubmitting(false)
      refetch(true)
    } catch (e) {
      console.log(e)
      setSubmitting(false)
    }
  }
  return (
    <>
      <div className="todo-item">
        <div>
          <input type="text" value={todo} disabled={submitting} onChange={(e) => setTodo(e.target.value)} />
        </div>
        <div>
          <button disabled={submitting} onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>
    </>
  )
}

export default todoInput

import React, { useState } from 'react'

const TodoInput = ({ refetch }) => {
  const [todo, setTodo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.BB_FUNCTION_URL}/addTodo`, {
        method: 'post',
        body: JSON.stringify({ name: todo }),
      })

      const resp = await res.json()
      console.log(resp)
      setSubmitting(false)

      if (refetch) {
        refetch(true)
      }
    } catch (e) {
      console.log(e)
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex center gap-x-4 my-5 mt-8 p-2 border-dashed border-2 border-gray-500">
        <input
          type="text"
          value={todo}
          placeholder="Add Todo"
          disabled={submitting}
          onChange={(e) => setTodo(e.target.value)}
          className="shadow border rounded w-full py-1 px-3 text-gray-700 focus:outline-none focus:shadow-outline text-xl"
        />
        <div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleAdd}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>
    </>
  )
}

export default TodoInput

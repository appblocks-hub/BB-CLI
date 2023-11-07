import React from 'react'

const TodoItem = ({ id, item, refetch }) => {
  const handleDelete = (e) => {
    e.preventDefault()
    const idToRemove = e.target.value.trim()

    fetch(`${process.env.BB_FUNCTION_URL}/removeTodo`, {
      method: 'delete',
      body: JSON.stringify({ id: idToRemove }),
    })
      .then((res) => res.json())
      .then(({ status }) => {
        console.log(status)
        refetch(true)
      })
      .catch((err) => console.log(err))
  }
  return (
    <>
      <div id={id} className="px-3 py-2 my-2 border-dashed border-2 border-red-500 flex items-center justify-between">
        <div>
          <p className="w-full text-grey-darkest text-xl">{item}</p>
        </div>
        <div>
          <button
            className="flex-no-shrink border-2 rounded text-red border-red-500 hover: text-white hover:bg-red-300"
            type="button"
            value={id}
            onClick={handleDelete}
          >
            ❌
          </button>
        </div>
      </div>
    </>
  )
}

export default TodoItem

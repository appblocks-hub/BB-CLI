import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import TodoItem from './remote/todoItem'

export default function App() {
  return <TodoItem refetch={()=>{}} id={123} item={{name:'test'}}/>
}

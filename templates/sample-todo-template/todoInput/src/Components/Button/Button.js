import React from 'react'
import './Button.css'

export const Button = ({ displayText, ...rest }) => {
  return (
    <button className="btn" {...rest}>
      {displayText}
    </button>
  )
}

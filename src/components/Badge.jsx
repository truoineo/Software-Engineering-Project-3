import React from 'react'

export default function Badge({ intent = 'neutral', children }) {
  return (
    <span className={`badge badge-${intent}`}>
      {children}
    </span>
  )
}

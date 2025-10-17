import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login(){
  const [sid, setSid] = useState('')
  const { setStudentId } = useAuth()
  const navigate = useNavigate()

  function submit(e){
    e?.preventDefault()
    const v = (sid||'').trim()
    if (!v) return
    setStudentId(v)
    navigate('/join')
  }

  return (
    <div className="centered">
      <form className="login-card" onSubmit={submit}>
        <h1>Scheduling App</h1>
        <label>Student ID</label>
        <input value={sid} onChange={e=>setSid(e.target.value)} placeholder="Enter your Student ID" />
        <button className="btn btn-primary" type="submit">Log In</button>
      </form>
    </div>
  )
}


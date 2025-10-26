import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login(){
  const [sid, setSid] = useState('')
  const [error, setError] = useState('')
  const { setStudentId } = useAuth()
  const navigate = useNavigate()

  function submit(e){
    e?.preventDefault()
    const v = (sid || '').trim()
    if (!v) {
      setError('Enter your 7-digit student ID.')
      return
    }
    if (!/^\d{7}$/.test(v)) {
      setError('Student ID must be exactly 7 digits.')
      return
    }
    setError('')
    setStudentId(v)
    navigate('/join')
  }

  return (
    <div className="centered">
      <form className="login-card" onSubmit={submit}>
        <h1>Scheduling App</h1>
        <label>Student ID</label>
        <input
          value={sid}
          onChange={e => {
            const next = (e.target.value || '').replace(/\D/g, '').slice(0, 7)
            setSid(next)
            if (error) setError('')
          }}
          placeholder="Enter your Student ID"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-student-id-error' : undefined}
        />
        {error && (
          <p id="login-student-id-error" className="field-hint error">
            {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit">Log In</button>
      </form>
    </div>
  )
}

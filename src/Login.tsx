import { useState } from 'react'
import { supabase } from './supabaseClient'
import { User } from './types'

type Props = {
  onLogin: (user: User) => void
}

export default function Login({ onLogin }: Props) {
  const [id, setId] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('pass', pass)
      .single<User>()

    if (error || !data) {
      setError('ログイン失敗')
    } else {
      localStorage.setItem('user', JSON.stringify(data))
      onLogin(data)
    }
  }

  return (
    <div>
      <h2>ログイン</h2>
      <input type="text" placeholder="ユーザーID" value={id} onChange={(e) => setId(e.target.value)} />
      <br />
      <input type="password" placeholder="パスワード" value={pass} onChange={(e) => setPass(e.target.value)} />
      <br />
      <button onClick={handleLogin}>ログイン</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

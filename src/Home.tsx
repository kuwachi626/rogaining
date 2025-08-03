import { User } from './types'

type Props = {
  user: User
  onLogout: () => void
}

export default function Home({ user, onLogout }: Props) {
  return (
    <div>
      <h2>ホーム</h2>
      <p>ようこそ、{user.id} さん</p>
      <button onClick={onLogout}>ログアウト</button>
    </div>
  )
}

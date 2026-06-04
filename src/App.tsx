import { useEffect, useState } from "react";
import Login from "./Login";
import Home from "./Home";
import AdminDashboard from "./AdminDashboard";
import { User } from "./types";

function App() {
	const [user, setUser] = useState<User | null>(null);
	const [adminToken, setAdminToken] = useState<string | null>(null);
	const [isValidAdmin, setIsValidAdmin] = useState(false);

	useEffect(() => {
		// ユーザーセッションの確認
		const saved = localStorage.getItem("user");
		if (saved) setUser(JSON.parse(saved));

		// URLからパスを取得（base を考慮）
		const basePath = import.meta.env.BASE_URL; // "/rogaining/"
		const fullPath = window.location.pathname;
		const relativePath = fullPath.startsWith(basePath)
			? fullPath.slice(basePath.length)
			: fullPath;

		const adminTokenFromEnv = import.meta.env.VITE_ADMIN_TOKEN;

		// /admin/:token パターンを解析
		const adminMatch = relativePath.match(/^admin\/(.+)$/);
		if (adminMatch) {
			const tokenFromUrl = adminMatch[1];
			setAdminToken(tokenFromUrl);
			// トークンが環境変数と一致するか確認
			if (tokenFromUrl === adminTokenFromEnv) {
				setIsValidAdmin(true);
			}
		}
	}, []);

	const handleLogin = (user: User) => setUser(user);
	const handleLogout = () => {
		localStorage.removeItem("user");
		setUser(null);
	};

	// 管理画面へのアクセス処理
	if (adminToken && !isValidAdmin) {
		return (
			<div className="flex h-screen items-center justify-center bg-red-50">
				<div className="rounded-lg border border-red-200 bg-white p-8 text-center">
					<h1 className="mb-2 text-2xl font-bold text-red-700">
						アクセス拒否
					</h1>
					<p className="text-slate-600">無効な管理者トークンです。</p>
					<a
						href="/"
						className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						ホームに戻る
					</a>
				</div>
			</div>
		);
	}

	if (isValidAdmin) {
		return <AdminDashboard />;
	}

	return user ? (
		<Home user={user} onLogout={handleLogout} />
	) : (
		<Login onLogin={handleLogin} />
	);
}

export default App;

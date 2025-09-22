import { useEffect, useState } from "react";
import Login from "./Login";
import Home from "./Home";
import { User } from "./types";

function App() {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const saved = localStorage.getItem("user");
		if (saved) setUser(JSON.parse(saved));
	}, []);

	const handleLogin = (user: User) => setUser(user);
	const handleLogout = () => {
		localStorage.removeItem("user");
		setUser(null);
	};

	return user ? (
		<Home user={user} onLogout={handleLogout} />
	) : (
		<Login onLogin={handleLogin} />
	);
}

export default App;

import { useState } from "react";
import { supabase } from "./supabaseClient";
import { User } from "./types";

type Props = {
	onLogin: (user: User) => void;
};

export default function Login({ onLogin }: Props) {
	const [id, setId] = useState("");
	const [pass, setPass] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleLogin = async () => {
		const { data, error } = await supabase
			.from("users")
			.select("*")
			.eq("id", id)
			.eq("pass", pass)
			.single<User>();

		if (error || !data) {
			setError("ログイン失敗");
		} else {
			localStorage.setItem("user", JSON.stringify(data));
			onLogin(data);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						ログイン
					</h2>
				</div>
				<div className="mt-8 space-y-6">
					<div className="space-y-4">
						<div>
							<input
								type="text"
								placeholder="ユーザーID"
								value={id}
								onChange={(e) => setId(e.target.value)}
								className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-base"
							/>
						</div>
						<div>
							<input
								type="password"
								placeholder="パスワード"
								value={pass}
								onChange={(e) => setPass(e.target.value)}
								className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-base"
							/>
						</div>
					</div>

					<div>
						<button
							onClick={handleLogin}
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
						>
							ログイン
						</button>
					</div>

					{error && (
						<div className="rounded-md bg-red-50 p-4">
							<p className="text-sm text-red-800 text-center">
								{error}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

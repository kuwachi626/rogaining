import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

type DashboardUser = {
	id: string;
	score: number | string;
	start: boolean;
	goal: boolean;
	goal_time: string | null; // 💡 追加: ゴール時間の型定義
};

export default function AdminDashboard() {
	const [users, setUsers] = useState<DashboardUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdate, setLastUpdate] = useState<string>("");

	// データを取得する関数
	const fetchUsers = async () => {
		setError(null);

		const { data, error } = await supabase
			.from("users")
			// 💡 追加: selectに goal_time を含める
			.select("id, score, start, goal, goal_time")
			.order("score", { ascending: false });

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		setUsers((data ?? []) as DashboardUser[]);
		setLastUpdate(new Date().toLocaleTimeString("ja-JP"));
		setLoading(false);
	};

	// 初期ロード
	useEffect(() => {
		fetchUsers();
	}, []);

	// リアルタイムサブスクリプション設定
	useEffect(() => {
		const channel = supabase
			.channel("users:*")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "users",
				},
				() => {
					fetchUsers();
				},
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}, []);

	const summary = useMemo(() => {
		const total = users.length;
		const finished = users.filter((user) => user.goal).length;
		const inProgress = users.filter(
			(user) => user.start && !user.goal,
		).length;
		const notStarted = total - finished - inProgress;

		return { total, finished, inProgress, notStarted };
	}, [users]);

	// 💡 追加: 日時文字列を読みやすい形式(例: 14:30:00)に変換する関数
	const formatTime = (isoString: string | null) => {
		if (!isoString) return "—";
		try {
			return new Date(isoString).toLocaleTimeString("ja-JP");
		} catch (e) {
			return isoString; // 変換失敗時はそのまま表示
		}
	};

	return (
		<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="mb-4 flex items-center justify-between gap-3">
				<div>
					<p className="text-sm uppercase tracking-wide text-blue-600">
						Admin Dashboard
					</p>
					<h3 className="text-xl font-semibold text-slate-900">
						参加者ランキングと進行状況
					</h3>
				</div>
				<div className="flex items-center gap-3">
					<span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
						{summary.total}名
					</span>
					<p className="text-xs text-slate-400">
						最終更新: {lastUpdate || "—"}
					</p>
				</div>
			</div>

			<div className="mb-4 grid gap-3 md:grid-cols-4">
				<StatCard label="総人数" value={summary.total} tone="blue" />
				<StatCard
					label="ゴール済み"
					value={summary.finished}
					tone="green"
				/>
				<StatCard
					label="進行中"
					value={summary.inProgress}
					tone="amber"
				/>
				<StatCard
					label="未開始"
					value={summary.notStarted}
					tone="slate"
				/>
			</div>

			{error ? (
				<p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
					{error}
				</p>
			) : null}

			{loading ? (
				<p className="text-sm text-slate-500">読み込み中...</p>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full border-collapse text-left text-sm">
						<thead>
							<tr className="bg-slate-50 text-slate-700">
								<th className="border-b border-slate-200 px-3 py-2">
									順位
								</th>
								<th className="border-b border-slate-200 px-3 py-2">
									ユーザー
								</th>
								<th className="border-b border-slate-200 px-3 py-2">
									スコア
								</th>
								<th className="border-b border-slate-200 px-3 py-2">
									状態
								</th>
								{/* 💡 追加: テーブルヘッダー */}
								<th className="border-b border-slate-200 px-3 py-2">
									ゴール時間
								</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user, index) => (
								<tr
									key={user.id}
									className="odd:bg-white even:bg-slate-50/60 hover:bg-slate-100/50"
								>
									<td className="border-b border-slate-100 px-3 py-2 font-semibold">
										{index + 1}
									</td>
									<td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-800">
										{user.id}
									</td>
									<td className="border-b border-slate-100 px-3 py-2">
										{user.score}P
									</td>
									<td className="border-b border-slate-100 px-3 py-2">
										<span
											className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
												user.goal
													? "bg-green-100 text-green-700"
													: user.start
														? "bg-amber-100 text-amber-700"
														: "bg-slate-100 text-slate-700"
											}`}
										>
											{user.goal
												? "ゴール"
												: user.start
													? "進行中"
													: "未開始"}
										</span>
									</td>
									{/* 💡 追加: ゴール時間のデータ表示 */}
									<td className="border-b border-slate-100 px-3 py-2 text-slate-600 font-mono">
										{formatTime(user.goal_time)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

function StatCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "blue" | "green" | "amber" | "slate";
}) {
	const tones = {
		blue: "bg-blue-50 text-blue-700",
		green: "bg-green-50 text-green-700",
		amber: "bg-amber-50 text-amber-700",
		slate: "bg-slate-100 text-slate-700",
	} as const;

	return (
		<article
			className={`rounded-lg border border-slate-200 p-4 ${tones[tone]}`}
		>
			<p className="text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-1 text-2xl font-semibold">{value}</p>
		</article>
	);
}

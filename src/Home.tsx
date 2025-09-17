import { User } from "./types";
import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "./supabaseClient";

type Props = {
	user: User;
	onLogout: () => void;
};

export default function Home({ user, onLogout }: Props) {
	const [qrResult, setQrResult] = useState<string | null>(null);
	const [showScanner, setShowScanner] = useState(false);
	const [scanStatus, setScanStatus] = useState<string | null>(null);
	const [score, setScore] = useState(user.score);

	// QRコード読み取り時の処理
	const handleScan = async (data: any) => {
		if (data && typeof data === "object" && data.text) {
			const qrText = data.text;
			setQrResult(qrText);
			setShowScanner(false);
			console.log("Scanned data:", qrText);

			// QRコード内容がcp_idの場合
			const { data: checkpoint, error } = await supabase
				.from("checkpoints")
				.select("point")
				.eq("cp_id", qrText)
				.single();

			if (error || !checkpoint) {
				alert("チェックポイントが見つかりません");
				return;
			}

			const newScore = score + checkpoint.point;
			setScore(newScore);

			// ユーザーテーブルの得点も更新（必要なら）
			await supabase
				.from("users")
				.update({ score: newScore })
				.eq("id", user.id);
			setScanStatus(
				`一致: ${qrText} の得点 ${checkpoint.point}P を追加しました`
			);
		}
	};

	return (
		<div>
			<h2>ホーム</h2>
			<p>ようこそ、{user.id} さん</p>
			<p>現在{score}P</p>
			<button onClick={onLogout}>ログアウト</button>
			<h3>QRコードを読み取る</h3>
			<button onClick={() => setShowScanner(true)}>
				QRコード読み取り開始
			</button>
			{showScanner && (
				<div>
					<Scanner
						onScan={handleScan}
						onError={(err) => console.error(err)}
						constraints={{
							facingMode: "environment", // 外向きカメラを指定
							width: { ideal: 1280 },
							height: { ideal: 720 },
						}}
						formats={["qr_code"]} // QRコードのみに限定
						styles={{
							container: { width: "100%", maxWidth: "400px" },
							video: { width: "100%" },
						}}
					/>
					<button
						onClick={() => setShowScanner(false)}
						style={{ marginTop: "10px" }}
					>
						読み取り停止
					</button>
				</div>
			)}
			{qrResult && (
				<div>
					<p>読み取った内容: {qrResult}</p>
					{scanStatus && <p>{scanStatus}</p>}
				</div>
			)}
		</div>
	);
}

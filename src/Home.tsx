import { User } from "./types";
import { useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
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
	const [isProcessing, setIsProcessing] = useState(false);
	const [debugLogs, setDebugLogs] = useState<string[]>([]);

	// デバッグログを追加する関数
	const addDebugLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
		console.log(message); // コンソールにも出力
	};

	// QRコード読み取り時の処理
	const handleScan = async (data: any) => {
		if (isProcessing) {
			addDebugLog("処理中のため無視");
			return;
		}

		addDebugLog(`受信データ: ${JSON.stringify(data)}`);

		// データが配列の場合の処理
		let qrText: string | null = null;

		if (Array.isArray(data) && data.length > 0) {
			// 配列の最初の要素からrawValueを取得
			qrText = data[0].rawValue;
			addDebugLog(`配列からQR値を取得: ${qrText}`);
		} else if (data && typeof data === "object" && data.text) {
			// 従来の形式
			qrText = data.text;
			addDebugLog(`オブジェクトからQR値を取得: ${qrText}`);
		} else if (data && typeof data === "object" && data.rawValue) {
			// rawValue形式
			qrText = data.rawValue;
			addDebugLog(`rawValueからQR値を取得: ${qrText}`);
		}

		if (qrText) {
			setIsProcessing(true);
			setQrResult(qrText);
			setShowScanner(false);
			addDebugLog(`QR読み取り成功: ${qrText}`);

			try {
				setScanStatus("チェックポイントを確認中...");
				addDebugLog("データベース検索開始...");

				// QRコード内容がcp_idの場合
				const { data: checkpoint, error } = await supabase
					.from("checkpoints")
					.select("point")
					.eq("cp_id", qrText)
					.single();

				addDebugLog(
					`データベース応答: checkpoint=${JSON.stringify(
						checkpoint
					)}, error=${JSON.stringify(error)}`
				);

				if (error) {
					addDebugLog(`データベースエラー: ${error.message}`);
					setScanStatus(`データベースエラー: ${error.message}`);
					alert(`データベースエラー: ${error.message}`);
					return;
				}

				if (!checkpoint) {
					addDebugLog("チェックポイントが見つからない");
					setScanStatus("チェックポイントが見つかりません");
					alert("チェックポイントが見つかりません");
					return;
				}

				const newScore = score + checkpoint.point;
				setScore(newScore);
				addDebugLog(
					`得点計算: ${score} + ${checkpoint.point} = ${newScore}`
				);

				setScanStatus("ユーザーデータを更新中...");
				addDebugLog("ユーザーデータ更新開始...");

				// ユーザーテーブルの得点も更新
				const { error: updateError } = await supabase
					.from("users")
					.update({ score: newScore })
					.eq("id", user.id);

				if (updateError) {
					addDebugLog(`更新エラー: ${updateError.message}`);
					setScanStatus(`更新エラー: ${updateError.message}`);
					alert(`更新エラー: ${updateError.message}`);
					return;
				}

				addDebugLog("処理完了");
				setScanStatus(
					`成功: ${qrText} の得点 ${checkpoint.point}P を追加しました (合計: ${newScore}P)`
				);
			} catch (error) {
				addDebugLog(`予期しないエラー: ${error}`);
				setScanStatus(`予期しないエラー: ${error}`);
				alert(`予期しないエラーが発生しました: ${error}`);
			} finally {
				setIsProcessing(false);
				addDebugLog("処理終了");
			}
		} else {
			addDebugLog(`QR値を取得できませんでした`);
		}
	};

	const customTracker = (
		detectedCodes: IDetectedBarcode[],
		ctx: CanvasRenderingContext2D
	) => {
		detectedCodes.forEach((code) => {
			// 検出されたコードの周りに赤い枠を描画
			ctx.strokeStyle = "red";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				code.boundingBox.x,
				code.boundingBox.y,
				code.boundingBox.width,
				code.boundingBox.height
			);

			// コードの内容を表示
			ctx.fillStyle = "white";
			ctx.fillRect(
				code.boundingBox.x,
				code.boundingBox.y + code.boundingBox.height,
				code.boundingBox.width,
				20
			);
			ctx.fillStyle = "black";
			ctx.fillText(
				code.rawValue,
				code.boundingBox.x,
				code.boundingBox.y + code.boundingBox.height + 15
			);
		});
	};

	return (
		<div>
			<h2>ホーム</h2>
			<p>ようこそ、{user.id} さん</p>
			<p>現在{score}P</p>
			<button onClick={onLogout}>ログアウト</button>
			<h3>QRコードを読み取る</h3>
			<button
				onClick={() => {
					setShowScanner(true);
					addDebugLog("QRスキャナー開始");
				}}
				disabled={isProcessing}
			>
				{isProcessing ? "処理中..." : "QRコード読み取り開始"}
			</button>
			{showScanner && (
				<div>
					<Scanner
						onScan={handleScan}
						onError={(err) => {
							addDebugLog(`カメラエラー: ${err.message || err}`);
							alert(`カメラエラー: ${err.message || err}`);
						}}
						constraints={{
							facingMode: "environment", // 外向きカメラを指定
						}}
						formats={["qr_code"]} // QRコードのみに限定
						allowMultiple={true}
						components={{
							tracker: customTracker, // コード検出時の視覚的なフィードバックをカスタマイズ
							onOff: true, // スキャンのオンオフを切り替えるボタンを表示する (default: false)
							zoom: true, // ズーム機能を有効にする (default: false)
							finder: false, // ファインダーを表示する (default: true)
							torch: true, // フラッシュライトを有効にする (default: false)
						}}
						styles={{
							container: { width: "100%", maxWidth: "400px" },
							video: { width: "100%" },
						}}
					/>
					<button
						onClick={() => {
							setShowScanner(false);
							addDebugLog("QRスキャナー停止");
						}}
						style={{ marginTop: "10px" }}
					>
						読み取り停止
					</button>
				</div>
			)}
			{qrResult && (
				<div>
					<p>読み取った内容: {qrResult}</p>
					{scanStatus && (
						<p
							style={{
								color: scanStatus.includes("成功")
									? "green"
									: scanStatus.includes("エラー")
									? "red"
									: "blue",
							}}
						>
							{scanStatus}
						</p>
					)}
				</div>
			)}
			{isProcessing && <p>処理中です...</p>}

			{/* デバッグログ表示エリア */}
			<div
				style={{
					marginTop: "20px",
					padding: "10px",
					backgroundColor: "#f0f0f0",
					border: "1px solid #ccc",
					borderRadius: "5px",
				}}
			>
				<h4>デバッグログ:</h4>
				<button
					onClick={() => setDebugLogs([])}
					style={{ marginBottom: "10px" }}
				>
					ログをクリア
				</button>
				<div
					style={{
						maxHeight: "200px",
						overflowY: "auto",
						fontSize: "12px",
						fontFamily: "monospace",
					}}
				>
					{debugLogs.map((log, index) => (
						<div key={index} style={{ marginBottom: "5px" }}>
							{log}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

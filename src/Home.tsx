import { User } from "./types";
import { useState } from "react";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { supabase } from "./supabaseClient";
import Header from "./Header";

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
		<>
			<Header />
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
				<div className="max-w-2xl mx-auto">
					{/* ユーザー情報部分 */}
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<div className="flex justify-between items-center mb-4">
							<div>
								<p className="text-lg text-gray-600 mb-2">
									ようこそ、{user.id} さん
								</p>
								<div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-lg">
									<p className="text-xl font-semibold">
										現在のスコア: {score}P
									</p>
								</div>
							</div>
							<button
								onClick={onLogout}
								className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm"
							>
								ログアウト
							</button>
						</div>
					</div>

					{/* QRスキャナー部分 */}
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<h2 className="text-xl font-semibold text-gray-800 mb-4">
							QRコードスキャン
						</h2>
						<button
							onClick={() => {
								setShowScanner(true);
								addDebugLog("QRスキャナー開始");
							}}
							disabled={isProcessing}
							className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
								isProcessing
									? "bg-gray-300 text-gray-500 cursor-not-allowed"
									: "bg-blue-500 text-white hover:bg-blue-600 active:scale-98"
							}`}
						>
							{isProcessing
								? "処理中..."
								: "QRコード読み取り開始"}
						</button>

						{showScanner && (
							<div className="mt-6 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
								<Scanner
									onScan={handleScan}
									onError={(err) => {
										addDebugLog(
											`カメラエラー: ${
												err.message || err
											}`
										);
										alert(
											`カメラエラー: ${
												err.message || err
											}`
										);
									}}
									constraints={{
										facingMode: "environment",
									}}
									formats={["qr_code"]}
									allowMultiple={true}
									components={{
										tracker: customTracker,
										onOff: true,
										zoom: true,
										finder: false,
										torch: true,
									}}
									styles={{
										container: {
											width: "100%",
											maxWidth: "400px",
											margin: "0 auto",
										},
										video: {
											width: "100%",
											borderRadius: "8px",
										},
									}}
								/>
								<button
									onClick={() => {
										setShowScanner(false);
										addDebugLog("QRスキャナー停止");
									}}
									className="w-full mt-4 py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
								>
									読み取り停止
								</button>
							</div>
						)}
					</div>

					{/* 結果表示部分 */}
					{qrResult && (
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<h3 className="text-lg font-semibold text-gray-800 mb-3">
								読み取り結果
							</h3>
							<div className="bg-gray-50 p-4 rounded-lg mb-3">
								<p className="font-mono text-sm text-gray-700">
									読み取った内容: {qrResult}
								</p>
							</div>
							{scanStatus && (
								<div
									className={`p-4 rounded-lg ${
										scanStatus.includes("成功")
											? "bg-green-100 border border-green-300 text-green-800"
											: scanStatus.includes("エラー")
											? "bg-red-100 border border-red-300 text-red-800"
											: "bg-blue-100 border border-blue-300 text-blue-800"
									}`}
								>
									<p className="font-medium">{scanStatus}</p>
								</div>
							)}
						</div>
					)}

					{/* 処理中表示 */}
					{isProcessing && (
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<div className="flex items-center justify-center">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
								<p className="text-blue-600 font-medium">
									処理中です...
								</p>
							</div>
						</div>
					)}

					{/* デバッグログ表示エリア */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold text-gray-800">
								デバッグログ
							</h3>
							<button
								onClick={() => setDebugLogs([])}
								className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors duration-200"
							>
								ログをクリア
							</button>
						</div>
						<div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-60 overflow-y-auto font-mono text-xs">
							{debugLogs.length === 0 ? (
								<p className="text-gray-500">
									ログはありません
								</p>
							) : (
								debugLogs.map((log, index) => (
									<div
										key={index}
										className="mb-1 hover:bg-gray-800 px-2 py-1 rounded"
									>
										{log}
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

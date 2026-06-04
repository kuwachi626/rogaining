export type User = {
	id: string;
	pass: string;
	score: number | string;
	start?: boolean;
	goal?: boolean;
	goal_time?: string;
	login_token?: string;
};

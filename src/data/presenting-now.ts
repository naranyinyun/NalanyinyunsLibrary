export interface MusicRecommendation {
	title: string;
	album: string;
	artist: string;
	artwork: string;
	recommendedAt?: string;
	url: string;
	reason?: string;
}

export const musicRecommendations: MusicRecommendation[] = [
	{
		title: "Cool Me Down",
		album: "Cool Me Down - Single",
		artist: "Mwk、巡音ルカ",
		artwork: "/presenting/cool_me_down.jpg",
		url: "https://beta.music.apple.com/cn/song/cool-me-down/1703764350",
		recommendedAt: "2026-11-26",
	},
];

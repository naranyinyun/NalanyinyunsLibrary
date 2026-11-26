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
		title: "Wonder Scale",
		album: "Wonder Scale - Single",
		artist: "Hatsuboshi Gakuen、China Kuramoto",
		artwork: "/presenting/900x900bb-60.jpg",
		url: "https://music.apple.com/cn/song/wonder-scale/1744080738",
		recommendedAt: "2026-11-24",
	},
];

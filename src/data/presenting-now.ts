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
		title: "Fuwaffin'girl",
		album: "Never Forget Vacation 5",
		artist: "Yu-dachi",
		artwork: "/presenting/1200x1200bb.webp",
		url: "https://music.apple.com/cn/album/fuwaffingirl/1849570976?i=1849571404",
		recommendedAt: "2026-11-23",
	},
];

const ytdl = require('ytdl-core');

const music = require('../music');

module.exports = async (message, args) => {
	if (message.member) {
		if (ytdl.validateURL(args)) {
			music.newVideo(message, args);
		} else {
			let videos;
			try {
				videos = await music.search(args, 1);
			} catch (err) {
				console.error(err);
			}

			if (videos) {
				music.newVideo(message, videos[0].id.videoId);
			} else {
				message.reply('no videos found for that query.');
			}
		}
	} else {
		message.reply('that command is only available in servers.');
	}
};

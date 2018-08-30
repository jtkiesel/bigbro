const music = require('../music.js');

module.exports = (message, args) => {
	if (message.member) {
		music.sendQueue(message);
	} else {
		message.reply('that command is only available in servers.');
	}
};

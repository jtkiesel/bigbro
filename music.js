const {google} = require('googleapis');

const youtube = google.youtube({version: 'v3', auth: process.env.GOOGLE_KEY});

const search = async (query, limit) => {
	return new Promise((resolve, reject) => {
		youtube.search.list({part: 'snippet', q: query, maxResults: limit}, (err, response) => {
			if (err) {
				reject(err);
			} else {
				resolve(response.data.items);
			}
		});
	});
};

module.exports = {
	search: search
};

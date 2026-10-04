const axios = require('axios');

const QUALITIES = ['1080', '720', '480', '360', '240', '144'];

module.exports = async (req, res) => {
  // CORS Headers (ഫ്രണ്ട് എൻഡിൽ നിന്ന് വിളിച്ച് ഉപയോഗിക്കാൻ)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: 'YouTube URL നൽകേണ്ടതുണ്ട്! (e.g. ?url=YOUR_YOUTUBE_URL)'
    });
  }

  const startTime = Date.now();

  try {
    // പാരാലൽ ആയി റീക്വസ്റ്റുകൾ അയക്കുന്നു (Vercel Timeout ഒഴിവാക്കാൻ Timeout 8 സെക്കന്റ് ആക്കിയിട്ടുണ്ട്)
    const requests = QUALITIES.map(async (resolusi) => {
      try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/v1/ytmp4?url=${encodeURIComponent(url)}&resolusi=${resolusi}`;
        const response = await axios.get(apiUrl, { timeout: 8000 });

        if (response.data && response.data.status && response.data.result?.url) {
          return {
            quality: `${resolusi}p`,
            url: response.data.result.url,
            meta: response.data.result
          };
        }
      } catch (err) {
        return null;
      }
      return null;
    });

    const rawResults = await Promise.all(requests);
    const successfulResponses = rawResults.filter(item => item !== null);

    if (successfulResponses.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'വീഡിയോ ഡൗൺലോഡ് ലിങ്കുകൾ ഒന്നും ലഭിച്ചില്ല.'
      });
    }

    const firstValidMeta = successfulResponses[0].meta;

    const availableDownloads = successfulResponses.map(item => ({
      quality: item.quality,
      url: item.url
    }));

    return res.status(200).json({
      status: true,
      author: "@nexray - ElrayyXml",
      result: {
        title: firstValidMeta.title || "",
        author: firstValidMeta.author || "",
        thumbnail: firstValidMeta.thumbnail || "",
        duration: firstValidMeta.duration || 0,
        format: firstValidMeta.format || "MP4",
        downloads: availableDownloads
      },
      timestamp: new Date().toISOString(),
      response_time: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Internal Server Error',
      error: error.message

    });
  }
};

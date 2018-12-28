const express = require('express');
const router = express.Router();
const Chunker = require('../../jobs/video/Chunker');
const SubtitleExtractor = require('../../jobs/video/SubtitleExtractor');

router.get('/:filename/:anime/:episode', (request, response) => {
    const { filename, anime, episode } = request.params;

   const chunker = new Chunker(anime, filename, episode);
   chunker.chunkSend(request, response);
});

router.get('/subtitle/:filename/:anime/:episode', async (request, response) => {
    const { filename, anime, episode } = request.params;

    const extractor = new SubtitleExtractor(anime, filename, episode);
    const subtitles = await extractor.extract();

    response.json(subtitles);
});

module.exports = router;
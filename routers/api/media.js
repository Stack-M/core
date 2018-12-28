const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/thumbnail/:path/:name', (request, response) => {
    const mediaPath = Buffer.from(request.params.path, 'base64').toString();
    const name = request.params.name;

    const thumbnailFile = `${mediaPath}.stackm-data/${name}.jpg`;

    response.sendFile(thumbnailFile);
});

module.exports = router;
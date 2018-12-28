const express = require('express');
const router = express.Router();
const fs = require('fs');
const Episode = require('../../jobs/indentify/Episode');

function normalizeBrackets(dirName) {
    return dirName.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '');
}

router.get('/root/:path', (request, response) => {
    const decodedPath = Buffer.from(request.params.path, 'base64').toString();

    fs.access(`${decodedPath}.stackm-metadata`, fs.constants.F_OK, (err) => {
        if(err) {
            response.json({
                status: 'error',
                reason: 'Selected path does not appear to be a stackm library'
            });
            return;
        }

        fs.readdir(decodedPath, (err, nodes) => {
            if(err) return;

            const libraryMedium = [];

            function sendMedium() {
                response.json(libraryMedium);
            }

            nodes.forEach((node, nodeIndex) => {
                try {
                    fs.stat(`${decodedPath}${node}`, (statErr, stats) => {
                        if(statErr) return;

                        if(stats.isDirectory()) {
                            libraryMedium.push({
                                name: normalizeBrackets(node),
                                path: `${decodedPath}${node}/`
                            });
                        }

                        if(nodeIndex === nodes.length - 1) {
                            sendMedium();
                        }
                    });
                } catch (e) {
                    // fuck this shit, im outta here
                }
            })
        })
    });
});

router.get('/media/:path', (request, response) => {
    const decodedPath = Buffer.from(request.params.path, 'base64').toString();

    fs.access(`${decodedPath}.stackm-metadata`, fs.constants.F_OK, (err) => {
        if(err) {
            response.json({
                status: 'error',
                reason: 'Selected path does not appear to be a stackm media'
            });
            return;
        }

        fs.readFile(`${decodedPath}.stackm-metadata`, (readErr, mediaData) => {
            if(readErr) return;

            try {
                response.json(JSON.parse(String(mediaData)));
            } catch(err) {
                response.json({error: err});
            }
        });
    });
});

router.get('/episodes/:path/:name', (request, response) => {
    const decodedPath = Buffer.from(request.params.path, 'base64').toString();
    const name = request.params.name;

    const episodeScanner = new Episode(name, decodedPath);

    episodeScanner.find((episodes) => response.json(episodes));
});

module.exports = router;
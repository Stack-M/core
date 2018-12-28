const express = require('express');
const router = express.Router();
const fs = require('fs');

class ServerData {
    constructor() {}
    
    sendStatus(response) {
        fs.readFile('./data/status.json', (err, data) => {
            if(err) return;

            const statusStr = String(data);

            response.json(JSON.parse(statusStr));
        });
    }

    sendLibraries(response) {
        fs.readFile('./data/libraryConfiguration.json', (err, data) => {
            if(err) return;

            const config = String(data);

            response.json(JSON.parse(config));
        });
    }
}

router.get('/status', (request, response) => {
    const serverData = new ServerData();

    serverData.sendStatus(response);
});
router.get('/libraries', (request, response) => {
    const serverData = new ServerData();

    serverData.sendLibraries(response);
});

module.exports = router;
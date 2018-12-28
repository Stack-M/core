const express = require('express');
const router = express.Router();
const fs = require('fs');
const Indexer = require('../../jobs/indexing/Indexer');

const DATA_DIR = './data';
const CONF_FILE = '/libraryConfiguration.json';
const STATUS_FILE = '/status.json';

router.get('/:path/:libraryName', (request, response) => {
    const path = Buffer.from(request.params['path'], 'base64').toString();
    const libraryName = request.params['libraryName'];

    fs.readFile(`${DATA_DIR}${CONF_FILE}`, (confReadError, data) => {
        if(confReadError) return;

        const configuration = JSON.parse(data.toString());

        // if(
        //     configuration.filter(library => library.directory === path).length > 0
        // ) {
        //     response.json({
        //         error: true,
        //         message: 'A library already exists for the directory.'
        //     });
        //     return;
        // }

        configuration.push({
            directory: path,
            name: libraryName
        });

        fs.writeFile(`${DATA_DIR}${CONF_FILE}`, JSON.stringify(configuration, null, 2), (confWriteError) => {
            if(confWriteError) {
                // ehhh
            }

            fs.readFile(`${DATA_DIR}${STATUS_FILE}`, (statusReadError, statData) => {
                if(statusReadError) return;

                const status = JSON.parse(statData.toString());

                if(status.showSetup) {
                    status.showSetup = false;
                    status.lastUpdate = (new Date()).toUTCString();
                    status.alreadySetup = true;
                }

                fs.writeFile(`${DATA_DIR}${STATUS_FILE}`, JSON.stringify(status, null, 2), (statusWriteError) => {
                    if(statusWriteError) {
                        // ehhh
                    }

                    // If we are here everything has been fine and well. Let's submit the indexing to the job handler.
                    const indexer = new Indexer(response.locals.globalWebsocketHandler, configuration[configuration.length - 1]);
                    indexer.start();
                });
            });
        });

        response.json({
            processing: true
        });
    });
});

module.exports = router;
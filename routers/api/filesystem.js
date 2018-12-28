const fs = require('fs');
const windowsDriveLetters = require('windows-drive-letters');
const express = require('express');
const router = express.Router();
const os = require('os');

router.get('/root', async (request, response) => {
    // We need to differentiate between windows and linux here,
    // and use windows-drive-letters for windows system
    // and nothing special for linux, and just start from /home

    if(os.platform() === 'win32') {
        // It's a windows OS
        const letters = await windowsDriveLetters.usedLetters();
        response.json({
            os: 'windows',
            nodes: letters.map(letter => `${letter}:/`)
        });
    }
});

router.get('/traverse/:path', (request, response) => {
    // Get the post parameter and read the dir and send out the structure

    const path = Buffer.from(request.params['path'], 'base64').toString();

    fs.readdir(path, (err, files) => {
        if(err) return;
        
        const directories = files.filter(file => {
            try {
                const stat = fs.statSync(`${path}${file}`);
                return stat.isDirectory();
            } catch (e) {
                return false;
            }
        }).map(dir => `${dir}/`);

        response.json({
            nodes: directories,
            path
        });
    });
});

module.exports = router;
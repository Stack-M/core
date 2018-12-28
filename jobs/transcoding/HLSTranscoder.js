const os = require('os');
const fs = require('fs');
const HLSServer = require('hls-server');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfprobePath(__dirname + '/../../bundled/ffprobe.exe');
ffmpeg.setFfmpegPath(__dirname + '/../../bundled/ffmpeg.exe');
const crypto = require('crypto');
const http = require('http');
const { exec } = require('child_process');

const tmpDir = os.tmpdir();

class HLSTranscoder {
    constructor(anime, episode, filepath) {
        this.anime = anime;
        this.episode = episode;
        this.filepath = filepath;
        // Create a random number for use in the hls server, as the port
        this.port = Math.ceil(Math.random() * 10000);
        this.transcodeOutputDir = null;
        this.uriPath = '';
    }

    createEpisodeTempDir() {
        const storeDirectory = `${this.anime}-ep-${this.episode}`;
        fs.mkdirSync(`${tmpDir.replace(/\\/g, '/')}/${storeDirectory}`);
        this.transcodeOutputDir = `${tmpDir}/${storeDirectory}`;

        return this.transcodeOutputDir;
    }

    getUriPath() {
        const str = `${this.anime}-Ep${this.episode}`;
        
        const hash = crypto.createHash('sha256');
        hash.update(str);
        
        return '/stream/hls/' + encodeURIComponent(hash.digest('base64'));
    }

    startTranscoding() {
        return new Promise((resolve, reject) => {
            const filePath = Buffer.from(this.filepath, "base64").toString();

            const ffmpegPath = __dirname + '/../../bundled/ffmpeg.exe';
            const command = `${ffmpegPath} -i "${filePath}" -profile:v baseline -level 3.0 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${this.transcodeOutputDir}/episode.m3u8"`;
            console.log(command);
            exec(command, (err, stdout, stderr) => {
                resolve({
                    err, stdout, stderr
                });
            });
        });
    }

    setup() {
        // Create the temporary directory
        this.createEpisodeTempDir();

        this.uriPath = this.getUriPath();

        // For now we go with the approach of starting the transcoding as soon as setup is started.
        // Might be changed in a future version if things perform worse in this state.
        this.startTranscoding();
    }

    start(server) {
        // const server = http.createServer((request, response) => {
        //     response.setHeader('Access-Control-Allow-Origin', '*');
        // });
        const hls = new HLSServer(server, {
            path: this.uriPath,
            dir: this.transcodeOutputDir
        });
    }
}

module.exports = HLSTranscoder;
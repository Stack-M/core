const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfprobePath(__dirname + '/../../bundled/ffprobe.exe');

class EpisodeNormalizer {
    constructor(name) {
        this.name = name;
        this.id = '';
    }

    removeBrackets() {
        this.name = this.name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '');
        return this;
    }

    removeSeriesName() {
        this.name = this.name.replace(this.mediaFolderName, '')/*.replace(this.metadata.result.title.romaji, '')*/;
        return this;
    }

    removeVersion() {
        this.name = this.name.replace(/v(\d+)/, '');
        return this;
    }

    digits() {
        if(this.name.toLowerCase().includes('sp') || this.name.toLowerCase().includes('special')) {
            this.name = `Special ${this.name.match(/(\d+)/)[0]}`;
            this.id = `SP${this.name.match(/(\d+)/)[0]}`;
        } else {
            this.name = `Episode ${this.name.match(/(\d+)/)[0]}`;
            this.id = `${this.name.match(/(\d+)/)[0]}`;
        }
        return this;
    }
}

class Time {
    static normalizeSeconds(seconds__) {
        const seconds_ = parseInt(`${seconds__}`, 10);
        let hours   = Math.floor(seconds_ / 3600);
        let minutes = Math.floor((seconds_ - (hours * 3600)) / 60);
        let seconds = seconds_ - (hours * 3600) - (minutes * 60);

        if (seconds < 10) {seconds = "0"+seconds;}

        return (hours === 0 ? '' : hours + ':0') + minutes + ':' + seconds;
    }
}

class Episode {
    constructor(mediaFolderName, path) {
        this.mediaFolderName = mediaFolderName;
        this.mediaPath = path;
        this.metadata = {};
        this.whitelistedFileExt = new Set(['mkv', 'mp4', 'avi']);
    }

    fetchMetadata(cb) {
        fs.readFile(`${this.mediaPath}.stackm-metadata`, (err, metadata) => {
            if(err) return;
            this.metadata = JSON.parse(String(metadata));

            cb();
        });
    }

    find(cb) {
        this.fetchMetadata(() => {
            fs.readdir(this.mediaPath, (err, nodes) => {
                if(err) return;
    
                // nodes are the files within this media directory
                // we need to find out the whitelisted files
    
                const possibleAnimeFiles = nodes.filter(node => {
                    const ext = node.split('.').pop();
                    return this.whitelistedFileExt.has(ext);
                });

    
                const episodeNumbers = possibleAnimeFiles.map(file => {
                    const normalizedEpisode = (new EpisodeNormalizer(file)).removeBrackets().removeSeriesName().removeVersion().digits();
                    return {
                        episode: normalizedEpisode.name,
                        episodeIdentifier: normalizedEpisode.id,
                        fileName: file,
                        thumbnail: `/meida/thumbnail/${Buffer.from(this.mediaPath).toString('base64')}/${file.replace(/\./g, '-')}`
                    };
                })
    
                this.applyVideoDuration(episodeNumbers, cb);
            });
        });
    }

    async applyVideoDuration(episodes, callback) {
        try {
            const response = await Promise.all(episodes.map((episode, index) => new Promise((resolve, reject) => {
                ffmpeg.ffprobe(`${this.mediaPath}${episode.fileName}`, (err, data) => {
                    if(err) {
                        console.log(err);
                        reject({
                            message: "FFProbe failed with the following stderr",
                            stderr: err
                        });
                        return;
                    };
    
                    if(data.format) {
                        resolve({
                            ...episode,
                            duration: Time.normalizeSeconds(data.format.duration),
                            bitrate: data.format.bitrate,
                            format: data.format.format_long_name
                        });
                    } else {
                        resolve({
                            ...episode,
                            duration: 0,
                            bitrate: 0,
                            format: ''
                        });
                        return;
                    }
                });
            })));
            callback(response);
        } catch(e) {
            console.log(e);
        }
    }
}

module.exports = Episode;
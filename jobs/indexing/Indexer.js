const Jobs = require('../Jobs');
const fs = require('fs');
const AnimeSearch = require('../../queries/objects/AnimeSearch');
const Websocket = require('../../concurrency/Websocket');
const ThumbnailGenerator = require('./ThumbnailGenerator');
const EpisodesIndexer = require('./Episode');

class Indexer extends Jobs {
    constructor(websocket, libraryConfiguration) {
        super();
        this.websocket = websocket;
        this.libraryConfiguration = libraryConfiguration;
        this.whitelistedFileExt = new Set(['mkv', 'mp4', 'avi']);
        this.backoffDuration = 1000;
        this.tmdbResults = {};
    }

    normalizeBrackets(dirName) {
        return dirName.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '');
    }

    putNoResultsIndexing(path, cb) {
        fs.writeFile(`${path}.stackm-metadata`, JSON.stringify({
            result: null,
            lastUpdate: (new Date()).toUTCString()
        }), (err) => cb());
    }

    putResultIndexing(path, result, tvdbResult, cb) {
        fs.writeFile(`${path}.stackm-metadata`, JSON.stringify({
            result,
            tvdbResult,
            lastUpdate: (new Date()).toUTCString()
        }), (err) => cb());
    }

    async indexSubDirectory(path, dirName, cb = () => {}) {
        // Remove the [] parts and () parts
        const animeName = this.normalizeBrackets(dirName);
        
        const animeSearch = new AnimeSearch(animeName);
        const searchResult = await animeSearch.getResult();
        const tmdbResults = await animeSearch.tvdbSearch();

        const mediaResults = searchResult['data']['Page']['media'];
            
        this.tmdbResults = tmdbResults['results'];

        if(mediaResults.length === 0) {
            this.putNoResultsIndexing(path, cb);
        } else {
            this.putResultIndexing(path, mediaResults[0], this.tmdbResults[0] ? this.tmdbResults[0] : {notFound: true}, cb);

            if(this.tmdbResults.length !== 0) {
                this.instructToIndexEpisodes(this.tmdbResults[0], path);
            }
        }
    }

    writeStackMRootMetaData(rootLibrary) {
        fs.writeFile(`${rootLibrary}.stackm-metadata`, JSON.stringify({
            indexed: false,
            indexing: true
        }, null, 2), (err) => {});
    }

    markLibraryAsIndexingFinished(rootLibrary) {
        fs.writeFile(`${rootLibrary}.stackm-metadata`, JSON.stringify({
            indexed: true,
            indexing: false
        }, null, 2), (err) => this.notifyClient());
    }

    notifyClient() {
        this.websocket.clientNotify({
            notificationType: 'indexing',
            configuration: this.libraryConfiguration
        });
    }

    generateThumbnails(path, dirname) {
        fs.readdir(path, (err, files) => {
            if(err) return;

            files.forEach(file => {
                if(this.whitelistedFileExt.has(file.split('.').pop())) {
                    const generator = new ThumbnailGenerator(`${path}${file}`, `${path}.stackm-data/`, file.replace(/\./g, '-'));
                    setTimeout(() => generator.create(), this.backoffDuration);
                    this.backoffDuration += 1.5 * 1000;
                }
            });
        })
    }

    instructToIndexEpisodes(tvdbData, path) {
        (new EpisodesIndexer(tvdbData, path)).index();
    }

    async rootIndex(directory) {
        this.writeStackMRootMetaData(directory);

        fs.readdir(directory, (err, nodes) => {
            if(err) return;

            nodes.forEach((node, nodeIndex) => {
                try {
                    fs.stat(`${directory}${node}`, (statErr, stat) => {
                        if(statErr) return;
    
                        if(stat.isDirectory()) {
                            if(nodeIndex === nodes.length - 1) {
                                this.indexSubDirectory(`${directory}${node}/`, node, () => this.markLibraryAsIndexingFinished(directory));
                            } else {
                                this.indexSubDirectory(`${directory}${node}/`, node);
                            }

                            this.generateThumbnails(`${directory}${node}/`);
                        }
                    });
                } catch (e) {
                    //
                }
            });
        })
    }

    start() {
        this.rootIndex(this.libraryConfiguration.directory);
    }
}

module.exports = Indexer;
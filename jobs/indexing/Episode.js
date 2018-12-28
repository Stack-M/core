const SERVER_CONF_PATH = __dirname + '/../../data/serverConfiguration.json';
const fs = require('fs');
const API_ROOT = 'http://api.themoviedb.org/3';
const fetch = require('node-fetch');

function sleep(seconds) {
    return new Promise((resolve, reject) => setTimeout(resolve, seconds * 1000));
}

class Episode {
    constructor(tmdbObject, path) {
        this.tmdbData = tmdbObject;
        this.path = path;
        this.apiKey = JSON.parse(fs.readFileSync(SERVER_CONF_PATH))['TMDB_API_KEY'];
        this.singleSeasonShow = false;
    }

    static queryParameterize(parameters) {
        return Object.entries(parameters).map(entry => `${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`).join('&');
    }

    fetchDetails() {
        return fetch(`${API_ROOT}/tv/${this.tmdbData.id}?${Episode.queryParameterize({
            api_key: this.apiKey
        })}`);
    }

    async fetchEpisodes(season, episode) {
        try {
            const fetchResponse = await fetch(`${API_ROOT}/tv/${this.tmdbData.id}/season/${season}/episode/${episode}?${Episode.queryParameterize({
                api_key: this.apiKey
            })}`);
    
            if(fetchResponse.status === 429) {
                await sleep(fetchResponse.headers.get('Retry-After'));
                return this.fetchEpisodes(season, episode);
            }
    
            return fetchResponse.json();
        } catch (e) {
            return this.fetchEpisodes(season, episode);
        }
    }

    async getDetails() {
        try {
            const fetchResponse = await this.fetchDetails();

            if(fetchResponse.status === 429) {
                await sleep(fetchResponse.headers.get('Retry-After'));
                return this.getDetails();
            }

            return fetchResponse.json();
        } catch (e) {
            return this.getDetails();
        }
    }

    getSeasonEpisodes() {
        return new Promise((resolve, reject) => {
            const structuredSeasons = [];
            this.seasons.forEach(async (season, index) => {
                const episodes = (new Array(season.episode_count)).fill(0).map((v, k) => k + 1);
                const episodesData = await Promise.all(episodes.map(episode => this.fetchEpisodes(season.season_number, episode)));
                
                structuredSeasons.push({
                    ...season,
                    episodes: episodesData
                });

                if(index === this.seasons.length - 1) {
                    resolve(structuredSeasons);
                }
            });
        });
    }

    async index() {
        const details = await this.getDetails();

        const seasons = details.seasons;
        this.seasons = seasons;
        if(details.number_of_seasons === 1) {
            this.singleSeasonShow = true;
        }

        const detailedSeason = await this.getSeasonEpisodes();
        this.saveDetails(details, detailedSeason);
    }

    saveDetails(details, seasons) {
        return new Promise((resolve, reject) => {
            fs.readFile(`${this.path}.stackm-metadata`, (readError, rawMetadata) => {
                if(readError) reject(readError);

                const metadata = JSON.parse(String(rawMetadata));
                metadata.details = details;
                metadata.seasons = seasons;

                fs.writeFile(`${this.path}.stackm-metadata`, JSON.stringify(metadata, null, 2), (writeError) => {
                    if(writeError) reject(writeError);

                    resolve(metadata);
                });
            });
        });
    }
}

module.exports = Episode;
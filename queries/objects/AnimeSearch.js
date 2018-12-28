const fs = require('fs');
const fetch = require('node-fetch');

function sleep(seconds) {
    return new Promise((resolve, reject) => setTimeout(resolve, seconds * 1000));
}

const GRAPHQL_URI = 'https://graphql.anilist.co';
const SERVER_CONF_PATH = __dirname + '/../../data/serverConfiguration.json';

class AnimeSearch {
    constructor(animeName) {
        this.animeName = animeName;
        this.result = {};
    }

    async getResult() {
        const animeInfoQuery = String(fs.readFileSync(`${__dirname}/../anime-info.graphql`));
            
        const variables = {
            page: 1,
            perPage: 1,
            search: this.animeName.toLowerCase()
        };

        const fetchRequest = await fetch(GRAPHQL_URI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: animeInfoQuery,
                variables
            })
        });

        const result = await fetchRequest.json();
        this.result = result;
        return new Promise((resolve, reject) => {
            resolve(result);
        });
    }

    static queryParameterize(parameters) {
        return Object.entries(parameters).map(entry => `${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`).join('&');
    }

    tvdbFetch() {
        return fetch(`http://api.themoviedb.org/3/search/tv?${AnimeSearch.queryParameterize({
            api_key: JSON.parse(fs.readFileSync(SERVER_CONF_PATH))['TMDB_API_KEY'],
            query: this.result['data']['Page']['media'][0].title.romaji
        })}`);
    }

    async tvdbSearch() {
        try {
            const fetchResponse = await this.tvdbFetch();
    
            if(fetchResponse.status === 429) {
                await sleep(parseInt(`${fetchResponse.headers.get('Retry-After')}`, 10));
                return this.tvdbSearch();
            }
        
            return fetchResponse.json();
        } catch (e) {
            return this.tvdbSearch();
        }
    }
}

module.exports = AnimeSearch;
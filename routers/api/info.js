const fetch = require('node-fetch');
const fs = require('fs');
const express = require('express');
const router = express.Router();

const API_URL = 'https://graphql.anilist.co';

class Info {
    constructor(animeName) {
        this.anime = animeName;
    }

    basicSearch(response) {
        fs.readFile('./queries/anime-info.graphql', async (err, data) => {
            if(err) {
                return;
            }

            const query = String(data);

            const payload = {
                variables: {
                    page: 1,
                    perPage: 5,
                    search: this.anime
                },
                query
            };
            
            const apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload, null, 2)
            });
            const searchResult = await apiResponse.json();

            response.end(JSON.stringify(searchResult['data']['Page']['media'], null, 2));
        });
    }
}

router.get('/:anime', (request, response) => {
    const animeParam = request.params['anime'];
    const info = new Info(animeParam);

    info.basicSearch(response);
});

module.exports = router;
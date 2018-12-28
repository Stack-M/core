const express = require('express');
const expressApp = express();
const expressWs = require('express-ws')(expressApp);
const Websocket = require('./concurrency/Websocket');
const infoRouter = require('./routers/api/info');
const serverRouter = require('./routers/api/server');
const filesystemRouter = require('./routers/api/filesystem');
const setupRouter = require('./routers/api/setup');
const scannerRouter = require('./routers/api/scan');
const mediaRouter = require('./routers/api/media');
const watcherRouter = require('./routers/api/watch');
const bodyParser = require('body-parser');
expressApp.use(bodyParser.json()); // support json encoded bodies

let globalWebsocketHandler = null;

expressApp.use((request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.locals.globalWebsocketHandler = globalWebsocketHandler;
    next();
});

expressApp.use('/info', infoRouter);
expressApp.use('/server', serverRouter);
expressApp.use('/fs', filesystemRouter);
expressApp.use('/setup', setupRouter);
expressApp.use('/scan', scannerRouter);
expressApp.use('/meida', mediaRouter);
expressApp.use('/watch', watcherRouter);

expressApp.ws('/server-ws', (websocket, request) => {
    const websocketHandler = new Websocket(websocket);

    websocketHandler.handle();

    globalWebsocketHandler = websocketHandler;
});

expressApp.listen(8050);

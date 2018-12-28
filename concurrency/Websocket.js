class Websocket {
    constructor(ws) {
        this.ws = ws;
        this.started = false;
    }

    handle() {
        this.started = true;

        this.registerHandlers();
    }

    registerHandlers() {
        this.ws.on('message', (event) => this.handleMessageEvent(event));
    }

    handleMessageEvent(event) {
        console.log(event);
    }

    clientNotify(notification) {
        this.ws.send(JSON.stringify({
            type: 'notification',
            ...notification
        }));
    }
}

module.exports = Websocket;
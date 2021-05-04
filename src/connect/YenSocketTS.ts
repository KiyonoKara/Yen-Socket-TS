import * as https from "https";
import * as http from "http";
import { EventEmitter } from "events";
import { InitializeHeaders } from "../util/InitializeHeaders";
import { Options } from "../util/Interfaces";
import { createExpectedKey } from "../util/GenerateKey";
import * as FrameBuffer from "../util/FrameBuffer";
import {BASE_BUFFER} from "../util/constants/Constants";

class YenSocketTS extends EventEmitter {
    declare url: string;
    declare request: http.ClientRequest;

    declare destroyed: boolean;

    private socket: any;
    private head: Buffer;

    constructor(url, public options: Partial<Options> = {}) {
        super(url);

        const IH = new InitializeHeaders();

        this.options = options || {};

        const headersWS = IH.initializeHeaders(url);
        const WSOptions = IH.createOptions(url, headersWS);

        // Opens the handshake
        this.request = https.request(WSOptions);
        // Ending the request is very important
        this.request.end();

        this.request.on('upgrade', (response: http.IncomingMessage, socket: any, head: Buffer) => {
            // Ensure WebSocket connection has the sec-websocket-accept header
            if (!response.headers["sec-websocket-accept"]) {
                throw new Error("The sec-websocket-accept header is missing.");
            }
            // Validate the server key
            const expectedKey = createExpectedKey("sha1", "base64", IH.WSKey);
            if (response.headers["sec-websocket-accept"] !== expectedKey) {
                throw new Error("The sec-websocket-accept header returned a mismatched key.");
            }

            this.emit("open", ({ response, socket }));
            this.destroyed = socket.destroyed;

            const frameBuffer = null;
            FrameBuffer.decode(socket, BASE_BUFFER, frameBuffer);

            socket.on('message', message => {
                this.emit("message", JSON.stringify(message));
            });

            this.socket = socket;
            this.head = head;
        });
    }

    send(data) {
        this.once('message', message => {
            let msg = JSON.parse(message);
            if (msg && msg.op === 10) {
                return this.socket.write(FrameBuffer.messageFrame(data));
            } else {
                return this.socket.write(FrameBuffer.messageFrame(data));
            }
        });
    }
}

//const YS = new YenSocketTS('wss://gateway.discord.gg:443?v=8&encoding=json');
const YS = new YenSocketTS("wss://demo.websocket.me/v3/channel_1?api_key=oCdCMcMPQpbvNjUIzqtvF1d2X2okWpDQj4AwARJuAgtjhzKxVEjQU6IdCjwm&notify_self");
YS.on('open', () => {
    YS.send(JSON.stringify({ data: "Test data" }));
});
YS.on('message', m => {
    console.log(m);
});

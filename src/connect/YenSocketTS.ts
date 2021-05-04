import * as https from "https";
import * as http from "http";
import * as http2 from "http2";
import { EventEmitter } from "events";
import { InitializeHeaders } from "../util/InitializeHeaders";
import { Options } from "../util/Interfaces";
import { createExpectedKey } from "../util/GenerateKey";

class YenSocketTS extends EventEmitter {
    declare url: string;
    declare request: http.ClientRequest;

    declare destroyed: boolean;

    constructor(url, public options: Partial<Options> = {}) {
        super(url);

        const IH = new InitializeHeaders();

        this.options = options || {};

        const headersWS = IH.initializeHeaders(url);
        const WSOptions = IH.createOptions(url, headersWS);

        this.request = https.request(WSOptions);

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
        });
    }
}

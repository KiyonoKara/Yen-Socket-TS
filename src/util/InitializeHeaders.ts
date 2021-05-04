import { URL } from "url";
import * as GenerateKey from "./GenerateKey";
import * as Constants from "./constants/Constants";

interface Options {
    [key: string]: any;
}

export class InitializeHeaders {
    declare WSKey: string;
    constructor(public options: Partial<Options> = {}) {
        this.options = options || {};
        this.WSKey = GenerateKey.generateSecWebSocketKey(16, "base64");
    }

    initializeHeaders(url: string = this.options.url) {
        const wsURL: URL = new URL(url);

        const headers = {
            Host: `${wsURL.host}:${wsURL.port || Constants.DEFAULT_PORT}`,
            Connection: Constants.UPGRADE,
            Upgrade: "websocket",
            "Sec-WebSocket-Key":this.WSKey,
            "Sec-WebSocket-Version": Constants.WS_VERSION
        };
    }
}

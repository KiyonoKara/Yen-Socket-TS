import { URL } from "url";
import * as GenerateKey from "./GenerateKey";
import * as Constants from "./constants/Constants";

interface Options {
    [key: string]: any;
}

export class InitializeHeaders {
    declare WSKey: string;
    declare wsURL: URL;
    constructor(public options: Partial<Options> = {}) {
        this.options = options || {};
        this.WSKey = GenerateKey.generateSecWebSocketKey(16, "base64");
        this.wsURL = new URL(this.options?.url)!;
    }

    initializeHeaders(url: string = this.options.url) {
        const wsURL: URL = new URL(url);

        return {
            Host: `${wsURL.host}:${wsURL.port || Constants.DEFAULT_PORT}`,
            Connection: Constants.UPGRADE,
            Upgrade: "websocket",
            "Sec-WebSocket-Key":this.WSKey,
            "Sec-WebSocket-Version": Constants.WS_VERSION
        };
    };

    createOptions(url: string = this.options.url, headers) {
        const wsURL: URL = new URL(url);

        return {
            agent: false,
            hostname: wsURL.hostname,
            port: wsURL.port || Constants.DEFAULT_PORT,
            method: "GET",
            path: `${wsURL.pathname}${wsURL.search}`,
            headers
        };
    }
}

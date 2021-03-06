import { URL } from "url";
import * as GenerateKey from "./GenerateKey";
import * as Constants from "./constants/Constants";
import { Options } from "./Interfaces";

export class HandleURL {
    declare WSKey: string;
    declare wsURL: URL;

    /**
     * Options parameter that takes JSON objects
     * @param {Partial<Options>} options
     */
    constructor(public options: Partial<Options> = {}) {
        this.options = options || {};
        this.WSKey = GenerateKey.generateSecWebSocketKey(16, "base64");
        if (this.options.url) this.wsURL = new URL(this.options?.url)!;
    }

    /**
     * Breaks down the URL and creates headers specifically for the WebSocket connection
     * @param {string} url - Defaults to the constructor's url from the options
     */
    initializeHeaders(url: string = this.options.url) {
        const wsURL: URL = new URL(url);

        return {
            Host: `${wsURL.host}:${wsURL.port || Constants.DEFAULT_PORT}`,
            Connection: Constants.UPGRADE,
            Upgrade: "websocket",
            "Sec-WebSocket-Key": this.WSKey,
            "Sec-WebSocket-Version": Constants.WS_VERSION
        };
    };

    /**
     * Creates request options for the request
     * @param {string} url
     * @param {object} headers
     */
    createOptions(url: string = this.options.url, headers = this.initializeHeaders(this.options.url)) {
        const wsURL: URL = new URL(url);

        return {
            agent: false,
            hostname: wsURL.hostname,
            port: (wsURL.port || Constants.DEFAULT_PORT) as number,
            method: "GET",
            path: `${wsURL.pathname}${wsURL.search}`,
            headers
        };
    }
}

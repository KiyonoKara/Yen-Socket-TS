import * as tls from "tls";
import * as net from "net";
import { EventEmitter } from "events";
import { HandleURL } from "../util/HandleURL";
import { Options } from "../util/Interfaces";
import { URL } from "url";
import { createExpectedKey, generateSecWebSocketKey } from "../util/GenerateKey";
import * as FrameBuffer from "./util/FrameBuffer";
import { BASE_BUFFER } from "../util/constants/Constants";
import * as Constants from "../util/constants/Constants";
import "../util/Utilities";

const handleURL = new HandleURL();

// Modules for referencing
const modules = {
  "tls": tls,
  "net": net
};

/**
 * YenSocket class
 */
class YenSocket extends EventEmitter {
    declare socket: net.Socket;
    declare path: string;
    declare url: URL;
    declare server: null;
    declare destroyed: boolean;

    declare CONNECTING: number;
    declare OPEN: number;
    declare CLOSING: number;
    declare CLOSED: number
    declare CONNECTION_STATE: number;

    // Headers and request options
    declare WSHeaders;
    declare WSOptions;

    constructor(url, public options: Partial<Options> = {}) {
        super(url);
        this.url = new URL(url);

        this.WSHeaders = handleURL.initializeHeaders(url);
        this.WSOptions = handleURL.createOptions(url, this.WSHeaders);

        this.socket = modules[defineNETorTLS(this.url.protocol)].connect({
            host: this.WSOptions.hostname,
            port: this.WSOptions.port
        });

        this.destroyed = this.socket.destroyed;

        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
        this.CONNECTION_STATE = this.CONNECTING;

        this.path = this.WSOptions.path;
        this.socket.on("connect", () => {
            this.CONNECTION_STATE = this.OPEN;
            this.emit("open");
            this.initiateHandshake(this.WSOptions.hostname, this.WSHeaders["Sec-WebSocket-Key"]);
        });

        this.socket.once("readable", () => {
            const handshakeData = readHandshake(this.socket.read(), this.socket, this);
            if (handshakeData && handshakeData[0]?.equals('HTTP/1.1 101 Switching Protocols')) {
                validateHandshake(handshakeData, this.WSHeaders["Sec-WebSocket-Key"]);
            }
        });

        this.socket.on("data", data => {
            const handshakeData = readHandshake(data, this.socket, this);
            if (handshakeData && handshakeData[0]?.equals('HTTP/1.1 101 Switching Protocols')) {
                noop();
            }
        });

        const frameBuffer = null;
        FrameBuffer.decode(this.socket, BASE_BUFFER, frameBuffer);

        this.socket.on("message", message => {
            if (this.CONNECTION_STATE === this.OPEN) {
                this.emit("message", message);
            }
        });

        this.socket.on("error", error => {
            console.error(error);
        });
    }

    private initiateHandshake(host = this.WSOptions.hostname, key = handleURL.WSKey): void {
        let WebSocketHeaders;
        if (!this.WSHeaders) {
            WebSocketHeaders = {
                Host: `${host || this.url.host}:${this.url.port || Constants.DEFAULT_PORT}`,
                Connection: Constants.UPGRADE,
                Upgrade: "websocket",
                "Sec-WebSocket-Key": key || generateSecWebSocketKey(16, "base64"),
                "Sec-WebSocket-Version": Constants.WS_VERSION
            };
        } else {
            WebSocketHeaders = this.WSHeaders;
        }

        const requestString = YenSocket.createStrRequest(`GET ${this.WSOptions.path} HTTP/1.1`, WebSocketHeaders);
        this.socket.write(requestString);
    }

     private static createStrRequest(rawRequestLine, headers) {
        let headersString = rawRequestLine + '\r\n';

        for (let key in headers) {
            if (headers.hasOwnProperty(key)) {
                headersString += `${key}: ${headers[key]}` + `\r\n`;
            }
        }
        return headersString + "\r\n";
    }

    public send(data, json: boolean = false) {
        if (this.CONNECTION_STATE === this.OPEN) {
            if (json) {
                if (typeof data === "object") {
                    this.socket.write(FrameBuffer.messageFrame(JSON.stringify(data) || data.toString()));
                } else {
                    this.socket.write(FrameBuffer.messageFrame(data));
                }
            } else {
                this.socket.write(FrameBuffer.messageFrame(data));
            }
        }
    }

    public sendOnOpen(data) {
        this.socket.on("connect", () => {
            if (this.CONNECTION_STATE === this.OPEN) {
                this.socket.write(FrameBuffer.messageFrame(data));
            }
        });
    }

    /**
     * Closes a WS connection without regard any special events
     * @param {number} code - Status code for closing the connection
     * @param {string} reason - Close reason
     * @param {boolean} masked - Should usually be masked, true
     */
    public close(code: number = 1000, reason?: string, masked: boolean = true) {
        if (this.CONNECTION_STATE === this.OPEN) {
            this.socket.write(FrameBuffer.closeFrame(code, reason || undefined, masked));
        }
    }

    /**
     * Closes a WS connection on a message event instead of connection event
     * @param {number} code - Status code for closing the connection
     * @param {string} reason - Close reason
     * @param {boolean} masked - Should usually be masked
     */
    public onclose(code: number = 1000, reason?: string, masked: boolean = true) {
        this.on("message", () => {
            this.close(code, reason, masked);
        });
        this.socket.on("close", () => this.emit('close'));
    }

    public destroy() {
        return this.socket.destroyed ? [] : this.socket.destroy();
    }
}

/**
 * Basic logic for checking if protocol is suiting for NET or TLS
 * @param {string} protocol - wss = tls, ws = net
 * @returns {string}
 */
const defineNETorTLS = function(protocol: string): string {
    if (protocol.equals("wss:")) return "tls";
    else return "net";
};

/**
 * Read the incoming handshake, only reads the opening handshake
 * @param buffer - Buffer data
 * @param socket - The socket for emitting events or ending its connection
 * @param cs - Instance of the class for its instance variables
 * @returns {string | buffer} Returns handshake data
 */
const readHandshake = function(buffer: Buffer, socket, cs?: YenSocket) {
    let found = false, i, data;

    // Do the handshake and try to connect
    if (buffer.length > 2097152) {
        // Handles the error(s) for handshakes that are too large
        if (cs.server) {
            socket.end(`HTTP/1.1 400 Bad Request` + `\r\n\r\n`);
        } else {
            socket.end();
            socket.emit('error', "The handshake is too large.");
        }
        return false;
    }

    // Look for for '\r\n\r\n'
    for (i = 0; i < buffer.length - 3; i++) {
        if (buffer[i] === 13 && buffer[i + 2] === 13 && buffer[i + 1] === 10 && buffer[i + 3] === 10) {
            found = true;
            break;
        }
    }

    if (!found) {
        return false;
    }

    data = buffer.slice(0, i + 4).toString().split('\r\n');
    return data;
};

/**
 * Validates the handshake
 * @param {string | any} handshake
 * @param {string} wsKey
 * @returns {boolean} Returns true if the handshake is successful, false if it is not successful, and throws an error
 */
const validateHandshake = function(handshake: string[], wsKey?: string) {
    let headers: any = {}, key;

    if (handshake.length < 4) {
        throw new Error("Invalid handshake, the handshake was too small.");
    }

    if (!handshake[0].match(/^HTTP\/\d\.\d 101( .*)?$/i)) {
        throw new Error("Invalid handshake, the first line is invalid.");
    }

    // Gets all headers
    for (let i = 1; i < handshake.length; i++) {
        let match = handshake[i].match(/^([a-z-]+): (.+)$/i);
        if (match) {
            headers[match[1].toLowerCase()] = match[2];
        }
    }

    if (!headers['upgrade'] || !headers['sec-websocket-accept'] || !headers['connection']) {
        throw new Error("Invalid handshake, required header(s) are missing.");
    }

    if (headers['upgrade']?.toLowerCase() !== "websocket" || headers['connection']?.toLowerCase().split(/\s*,\s*/).indexOf('upgrade') === -1) {
        throw new Error("Invalid handshake, invalid Upgrade/Connection header(s).");
    }

    // Validate the server key
    key = headers['sec-websocket-accept'];
    const expectedKey = createExpectedKey("sha1", "base64", wsKey);
    if (!key.equals(expectedKey)) {
        throw new Error("The sec-websocket-accept header returned a mismatched key.");
    }

    return true;
}

const noop = function() {};

export {
    readHandshake,
    noop
};

import { token } from "../../ext-config/cfg";
const yenSocket = new YenSocket("wss://gateway.discord.gg:443?v=8&encoding=json");

yenSocket.on("message", message => {
    console.log(message);
});

const payload = JSON.stringify({
    op: 2,
    d: {
        token: `Bot ${token}`,
        intents: 513,
        properties: {
            $os: "Linux",
            $browser: "Discord Desktop",
            $device: "PC",
        },
    },
});

yenSocket.sendOnOpen(payload);

//yenSocket.onclose(1000, undefined, true);

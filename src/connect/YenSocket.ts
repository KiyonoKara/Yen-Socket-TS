import * as tls from "tls";
import * as net from "net";
import { EventEmitter } from "events";
import { HandleURL } from "../util/HandleURL";
import { Options } from "../util/Interfaces";
import { URL } from "url";
import {createExpectedKey, generateSecWebSocketKey} from "../util/GenerateKey";
import * as FrameBuffer from "../util/FrameBuffer";
import { BASE_BUFFER } from "../util/constants/Constants";
import * as Constants from "../util/constants/Constants";
import "../util/Utilities";
import * as util from "util";
import * as stream from "stream";
import * as http from "http";

const handleURL = new HandleURL();

const modules = {
  "tls": tls,
  "net": net
};

class YenSocket extends EventEmitter {
    declare socket: net.Socket;
    declare path: string;
    declare url: URL;
    declare server: null;

    // Headers and request options
    declare WSHeaders;
    declare WSOptions;

    constructor(url, public options: Partial<Options> = {}) {
        super(url);
        this.url = new URL(url);

        this.WSHeaders = handleURL.initializeHeaders(url);
        this.WSOptions = handleURL.createOptions(url, this.WSHeaders);

        this.socket = modules[this.defineNETorTLS(this.url.protocol)].connect({
            host: this.WSOptions.hostname,
            port: this.WSOptions.port
        });

        this.path = this.WSOptions.path;

        this.socket.on("connect", () => {
            this.initiateHandshake(this.WSOptions.hostname, this.WSHeaders["Sec-WebSocket-Key"]);
        });

        this.socket.once("readable", () => {
            readHandshake(this.socket.read(), this.socket, this);
        });

        this.socket.on("data", data => {
            //console.log(data.toString());
        });

        this.socket.on("error", error => {
            console.error(error);
        });
    }

    initiateHandshake(host = this.WSOptions.hostname, key = handleURL.WSKey): void {
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

        const requestString = this.createStrRequest(`GET ${this.WSOptions.path} HTTP/1.1`, WebSocketHeaders);
        this.socket.write(requestString);
    }

    createStrRequest(rawRequestLine, headers) {
        let headersString = rawRequestLine + '\r\n';

        for (let key in headers) {
            if (headers.hasOwnProperty(key)) {
                headersString += `${key}: ${headers[key]}` + `\r\n`;
            }
        }
        return headersString + "\r\n";
    }

    defineNETorTLS(protocol: string): string {
        if (protocol.equals("wss:")) return "tls";
        else return "net";
    }
}

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

const yenSocket = new YenSocket("wss://gateway.discord.gg:443?v=8&encoding=json");

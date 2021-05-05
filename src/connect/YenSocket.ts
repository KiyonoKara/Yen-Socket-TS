import * as tls from "tls";
import * as net from "net";
import { EventEmitter } from "events";
import { HandleURL } from "../util/HandleURL";
import { Options } from "../util/Interfaces";
import { createExpectedKey } from "../util/GenerateKey";
import * as FrameBuffer from "../util/FrameBuffer";
import { BASE_BUFFER } from "../util/constants/Constants";

class YenSocket extends EventEmitter {
    declare socket: net.Socket;
    declare path: string;

    constructor(url, public options: Partial<Options> = {}) {
        super(url);

        const IH = new HandleURL();
        const headersWS = IH.initializeHeaders(url);
        const WSOptions = IH.createOptions(url, headersWS);

        this.socket = tls.connect({ host: WSOptions.hostname, port: WSOptions.port });
        this.path = WSOptions.path;
    }



    createStrRequest(rawRequestLine, headers) {
        let headerString = rawRequestLine + '\r\n';

        for (let key in headers) {
            if (headers.hasOwnProperty(key)) {
                headerString += `${key}: ${headers[key]}\r\n`;
            }
        }

        return headerString + '\r\n';
    }
}

const yenSocket = new YenSocket("ws://gateway.discord.gg:443?v=8&encoding=json");

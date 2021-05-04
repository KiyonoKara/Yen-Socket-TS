import { URL } from "url";
import * as GenerateKey from "./GenerateKey";

interface Options {
    [key: string]: any;
}

export class InitializeHeaders {
    declare WSKey: string;
    constructor(public options: Partial<Options> = {}) {
        this.options = options || {};
        this.WSKey = GenerateKey.generateSecWebSocketKey(16, "base64");
    }
}

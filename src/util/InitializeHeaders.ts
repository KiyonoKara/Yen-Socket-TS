import { URL } from "url";

interface Options {
    [key: string]: any;
}

export class InitializeHeaders {
    constructor(public options: Partial<Options> = {}) {
        this.options = options || {};
    }

}

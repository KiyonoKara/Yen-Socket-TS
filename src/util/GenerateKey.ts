import * as crypto from "crypto";
import { GUID } from "./constants/Constants";

export function generateSecWebSocketKey(size: number = 16, encoding: BufferEncoding = "base64"): string {
    return crypto.randomBytes(size).toString(encoding);
}

export function createExpectedKey(algorithm: string = "sha1", encoding: any = "base64", secWebSocketKey: string = generateSecWebSocketKey()): string {
    return crypto
        .createHash(algorithm)
        .update(`${secWebSocketKey}${GUID}`)
        .digest(encoding)
        ?.toString();
}



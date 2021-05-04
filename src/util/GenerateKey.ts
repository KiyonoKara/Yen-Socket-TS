import * as crypto from "crypto";
import { GUID } from "./constants/Constants";

/**
 * Generate a sec WebSocket key with a default size of 16 and an encoding of base64
 * @param size - Preferably 16
 * @param encoding - Base64 is preferred but other encodings are doable
 */
export function generateSecWebSocketKey(size: number = 16, encoding: BufferEncoding = "base64"): string {
    return crypto.randomBytes(size).toString(encoding);
}

/**
 * Create an expected key that is compared with the upgraded WebSocket connection headers
 * @param {string} algorithm - Hash algorithm
 * @param {any} encoding - Uses 'any' type to cast to the BinaryToTextEncoding type
 * @param secWebSocketKey - Use the sec-WebSocket key or it will generate one on its own
 */
export function createExpectedKey(algorithm: string = "sha1", encoding: any = "base64", secWebSocketKey: string = generateSecWebSocketKey()): string {
    return crypto
        .createHash(algorithm)
        .update(`${secWebSocketKey}${GUID}`)
        .digest(encoding)
        ?.toString();
}

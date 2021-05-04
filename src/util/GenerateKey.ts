import * as crypto from "crypto";
import { GUID } from "./constants/Constants";

export function generateSecWebSocketKey(size: number = 16, encoding: BufferEncoding = "base64"): string {
    return crypto.randomBytes(size).toString(encoding);
}

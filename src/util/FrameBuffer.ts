import { BASE_BUFFER } from "./constants/Constants";

export function decode(socket, buffer, frameBuffer = null) {
    this.socket = socket;
    buffer = BASE_BUFFER;
    frameBuffer = null;

    this.socket.on('data', data => {
        buffer = Buffer.concat([buffer, data], buffer.length + data.length);

        if (buffer.length > 2) {
            const buf0 = buffer[0];
            const hb = buf0 >> 4;
            const fin = hb === 8;
            const opcode = buf0 % 16;

            const buf1 = buffer[1];
            const hasMask = buf1 >> 7;
            let length = buf1 % 128;
            let start = hasMask ? 6 : 2;
            if (buffer.length < start + length) return;
            if (length === 126) {
                length = buffer.readUInt16BE(2);
                start += 2;
            } else if (length === 127) {
                length =
                    buffer.readUInt32BE(2) * Math.pow(2, 32) + buffer.readUInt32BE(6);
                start += 8;
            }
            if (buffer.length < start + length) return;
            let payload = buffer.slice(start);
            if (hasMask) {
                const mask = buffer.slice(start - 4, start);
                for (let index = 0; index < payload.length; index++) {
                    payload[this.i] ^= mask[this.i % 4];
                }
            }
            buffer = buffer.slice(start + length);
            if (opcode === 1) {
                payload = payload.toString();
                frameBuffer = frameBuffer ? frameBuffer + payload : payload;
                if (fin) {
                    this.socket.emit("message", JSON.parse(frameBuffer));
                    frameBuffer = null;
                }
            }
            if (opcode === 8) {
                if (payload.length >= 2) {
                    const code = payload.readUInt16BE(0);
                    const reason = payload.slice(2).toString();
                    console.log(`Connection closed, Opcode: ${opcode}`, `Code: ${code}`, `Reason: ${reason || "No reason"}`);
                }
            }
        }
    });
}

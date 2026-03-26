import { Buffer } from "node:buffer";

export interface OSCArg {
  type: "f" | "i" | "s";
  value: number | string;
}

function padString(s: string): Buffer {
  const buf = Buffer.from(s + "\0");
  const padLen = 4 - (buf.length % 4);
  return padLen < 4 ? Buffer.concat([buf, Buffer.alloc(padLen)]) : buf;
}

export function encodeOSCMessage(address: string, args: OSCArg[]): Buffer {
  const addressBuf = padString(address);

  let typeTag = ",";
  const argBufs: Buffer[] = [];

  for (const arg of args) {
    typeTag += arg.type;
    if (arg.type === "f") {
      const buf = Buffer.alloc(4);
      buf.writeFloatBE(arg.value as number, 0);
      argBufs.push(buf);
    } else if (arg.type === "i") {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(arg.value as number, 0);
      argBufs.push(buf);
    } else if (arg.type === "s") {
      argBufs.push(padString(arg.value as string));
    }
  }

  const typeBuf = padString(typeTag);
  return Buffer.concat([addressBuf, typeBuf, ...argBufs]);
}

export function encodeOSCFloat(address: string, value: number): Buffer {
  return encodeOSCMessage(address, [{ type: "f", value }]);
}

export function decodeOSCMessage(
  buf: Buffer
): { address: string; args: Array<{ type: string; value: number | string }> } | null {
  try {
    let i = 0;
    const nullIdx = buf.indexOf(0, i);
    if (nullIdx < 0) return null;
    const address = buf.toString("ascii", i, nullIdx);
    i = nullIdx + 1;
    i = Math.ceil(i / 4) * 4;

    if (i >= buf.length || buf[i] !== 0x2c) return null;
    const typeNullIdx = buf.indexOf(0, i);
    if (typeNullIdx < 0) return null;
    const typeTag = buf.toString("ascii", i + 1, typeNullIdx);
    i = typeNullIdx + 1;
    i = Math.ceil(i / 4) * 4;

    const args: Array<{ type: string; value: number | string }> = [];
    for (const t of typeTag) {
      if (t === "f" && i + 4 <= buf.length) {
        args.push({ type: "f", value: buf.readFloatBE(i) });
        i += 4;
      } else if (t === "i" && i + 4 <= buf.length) {
        args.push({ type: "i", value: buf.readInt32BE(i) });
        i += 4;
      } else if (t === "s") {
        const strEnd = buf.indexOf(0, i);
        if (strEnd < 0) break;
        args.push({ type: "s", value: buf.toString("ascii", i, strEnd) });
        i = strEnd + 1;
        i = Math.ceil(i / 4) * 4;
      }
    }

    return { address, args };
  } catch {
    return null;
  }
}

import { Buffer as BufferLib } from "buffer/";

const isNode = typeof (globalThis as any)?.process?.versions?.node === "string";
// We cast globalThis to any to keep typescript happy
const g: any = globalThis as any;

export function fromB64ToArray(str: string): Uint8Array | null {
  if (str == null) {
    return null;
  }
  if (isNode) {
    return new Uint8Array(Buffer.from(str, "base64"));
  } else {
    const binaryString = g.atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

export function fromUrlB64ToArray(str: string): Uint8Array | null {
  return fromB64ToArray(fromUrlB64ToB64(str));
}

export function fromHexToArray(str: string): Uint8Array {
  if (isNode) {
    return new Uint8Array(Buffer.from(str, "hex"));
  } else {
    const bytes = new Uint8Array(str.length / 2);
    for (let i = 0; i < str.length; i += 2) {
      bytes[i / 2] = parseInt(str.substr(i, 2), 16);
    }
    return bytes;
  }
}

export function fromUtf8ToArray(str: string): Uint8Array {
  if (isNode) {
    return new Uint8Array(Buffer.from(str, "utf8"));
  } else {
    const strUtf8 = unescape(encodeURIComponent(str));
    const arr = new Uint8Array(strUtf8.length);
    for (let i = 0; i < strUtf8.length; i++) {
      arr[i] = strUtf8.charCodeAt(i);
    }
    return arr;
  }
}

export function fromByteStringToArray(str: string): Uint8Array | null {
  if (str == null) {
    return null;
  }
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

export function fromBufferToB64(buffer: ArrayBuffer): string | null {
  if (buffer == null) {
    return null;
  }
  if (isNode) {
    return Buffer.from(buffer).toString("base64");
  } else {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return g.btoa(binary);
  }
}

export function fromBufferToUrlB64(buffer: ArrayBuffer): string | null {
  const b64 = fromBufferToB64(buffer);
  return b64 == null ? null : fromB64toUrlB64(b64);
}

export function fromB64toUrlB64(b64Str: string): string {
  return b64Str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function fromBufferToUtf8(buffer: ArrayBuffer): string {
  return BufferLib.from(buffer).toString("utf8");
}

export function fromBufferToByteString(buffer: ArrayBuffer): string {
  return String.fromCharCode.apply(null, new Uint8Array(buffer) as unknown as number[]);
}

// ref: https://stackoverflow.com/a/40031979/1090359
export function fromBufferToHex(buffer: ArrayBuffer): string {
  if (isNode) {
    return Buffer.from(buffer).toString("hex");
  } else {
    const bytes = new Uint8Array(buffer);
    return Array.prototype.map
      .call(bytes, (x: number) => ("00" + x.toString(16)).slice(-2))
      .join("");
  }
}

/**
 * Converts a hex string to an ArrayBuffer.
 * Note: this doesn't need any Node specific code as parseInt() / ArrayBuffer / Uint8Array
 * work the same in Node and the browser.
 * @param {string} hexString - A string of hexadecimal characters.
 * @returns {ArrayBuffer} The ArrayBuffer representation of the hex string.
 */
export function hexStringToArrayBuffer(hexString: string): ArrayBuffer {
  // Check if the hexString has an even length, as each hex digit represents half a byte (4 bits),
  // and it takes two hex digits to represent a full byte (8 bits).
  if (hexString.length % 2 !== 0) {
    throw "HexString has to be an even length";
  }

  // Create an ArrayBuffer with a length that is half the length of the hex string,
  // because each pair of hex digits will become a single byte.
  const arrayBuffer = new ArrayBuffer(hexString.length / 2);

  // Create a Uint8Array view on top of the ArrayBuffer (each position represents a byte)
  // as ArrayBuffers cannot be edited directly.
  const uint8Array = new Uint8Array(arrayBuffer);

  // Loop through the bytes
  for (let i = 0; i < uint8Array.length; i++) {
    // Extract two hex characters (1 byte)
    const hexByte = hexString.substr(i * 2, 2);

    // Convert hexByte into a decimal value from base 16. (ex: ff --> 255)
    const byteValue = parseInt(hexByte, 16);

    // Place the byte value into the uint8Array
    uint8Array[i] = byteValue;
  }

  return arrayBuffer;
}

export function fromUrlB64ToB64(urlB64Str: string): string {
  let output = urlB64Str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw new Error("Illegal base64url string!");
  }
  return output;
}

export function fromUtf8ToB64(utfStr: string): string {
  if (isNode) {
    return Buffer.from(utfStr, "utf8").toString("base64");
  } else {
    return BufferLib.from(utfStr, "utf8").toString("base64");
  }
}

export function fromUtf8ToUrlB64(utfStr: string): string | null {
  return fromBufferToUrlB64(fromUtf8ToArray(utfStr));
}

export function fromB64ToUtf8(b64Str: string): string {
  if (isNode) {
    return Buffer.from(b64Str, "base64").toString("utf8");
  } else {
    return BufferLib.from(b64Str, "base64").toString("utf8");
  }
}

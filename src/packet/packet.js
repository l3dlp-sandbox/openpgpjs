// GPG4Browsers - An OpenPGP implementation in javascript
// Copyright (C) 2011 Recurity Labs GmbH
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 3.0 of the License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

/**
 * @fileoverview Functions for reading and writing packets
 * @module packet/packet
 */

import { ArrayStream, getWriter as streamGetWriter } from '@openpgp/web-stream-tools';
import enums from '../enums';
import util from '../util';

export function readSimpleLength(bytes) {
  let len = 0;
  let offset;
  const type = bytes[0];


  if (type < 192) {
    [len] = bytes;
    offset = 1;
  } else if (type < 255) {
    len = ((bytes[0] - 192) << 8) + (bytes[1]) + 192;
    offset = 2;
  } else if (type === 255) {
    len = util.readNumber(bytes.subarray(1, 1 + 4));
    offset = 5;
  }

  return {
    len: len,
    offset: offset
  };
}

/**
 * Encodes a given integer of length to the openpgp length specifier to a
 * string
 *
 * @param {Integer} length - The length to encode
 * @returns {Uint8Array} String with openpgp length representation.
 */
export function writeSimpleLength(length) {
  if (length < 192) {
    return new Uint8Array([length]);
  } else if (length > 191 && length < 8384) {
    /*
      * let a = (total data packet length) - 192 let bc = two octet
      * representation of a let d = b + 192
      */
    return new Uint8Array([((length - 192) >> 8) + 192, (length - 192) & 0xFF]);
  }
  return util.concatUint8Array([new Uint8Array([255]), util.writeNumber(length, 4)]);
}

export function writePartialLength(power) {
  if (power < 0 || power > 30) {
    throw new Error('Partial Length power must be between 1 and 30');
  }
  return new Uint8Array([224 + power]);
}

export function writeTag(tag_type) {
  /* we're only generating v4 packet headers here */
  return new Uint8Array([0xC0 | tag_type]);
}

/**
 * Writes a packet header version 4 with the given tag_type and length to a
 * string
 *
 * @param {Integer} tag_type - Tag type
 * @param {Integer} length - Length of the payload
 * @returns {String} String of the header.
 */
export function writeHeader(tag_type, length) {
  /* we're only generating v4 packet headers here */
  return util.concatUint8Array([writeTag(tag_type), writeSimpleLength(length)]);
}

/**
 * Whether the packet type supports partial lengths per RFC4880
 * @param {Integer} tag - Tag type
 * @returns {Boolean} String of the header.
 */
export function supportsStreaming(tag) {
  return [
    enums.packet.literalData,
    enums.packet.compressedData,
    enums.packet.symmetricallyEncryptedData,
    enums.packet.symEncryptedIntegrityProtectedData,
    enums.packet.aeadEncryptedData
  ].includes(tag);
}

/**
 * Generic static Packet Parser function
 *
 * @param {Uint8Array | ReadableStream<Uint8Array>} input - Input stream as string
 * @param {Function} callback - Function to call with the parsed packet
 * @returns {Boolean} Returns false if the stream was empty and parsing is done, and true otherwise.
 */
export async function readPacket(reader, useStreamType, callback) {
  let writer;
  let callbackReturned;
  try {
    const peekedBytes = await reader.peekBytes(2);
    // some sanity checks
    if (!peekedBytes || peekedBytes.length < 2 || (peekedBytes[0] & 0x80) === 0) {
      throw new Error('Error during parsing. This message / key probably does not conform to a valid OpenPGP format.');
    }
    const headerByte = await reader.readByte();
    let tag = -1;
    let format = -1;
    let packetLength;

    format = 0; // 0 = old format; 1 = new format
    if ((headerByte & 0x40) !== 0) {
      format = 1;
    }

    let packetLengthType;
    if (format) {
      // new format header
      tag = headerByte & 0x3F; // bit 5-0
    } else {
      // old format header
      tag = (headerByte & 0x3F) >> 2; // bit 5-2
      packetLengthType = headerByte & 0x03; // bit 1-0
    }

    const packetSupportsStreaming = supportsStreaming(tag);
    let packet = null;
    if (useStreamType && packetSupportsStreaming) {
      if (useStreamType === 'array') {
        const arrayStream = new ArrayStream();
        writer = streamGetWriter(arrayStream);
        packet = arrayStream;
      } else {
        const transform = new TransformStream();
        writer = streamGetWriter(transform.writable);
        packet = transform.readable;
      }
      // eslint-disable-next-line callback-return
      callbackReturned = callback({ tag, packet });
    } else {
      packet = [];
    }

    let wasPartialLength;
    do {
      if (!format) {
        // 4.2.1. Old Format Packet Lengths
        switch (packetLengthType) {
          case 0:
            // The packet has a one-octet length. The header is 2 octets
            // long.
            packetLength = await reader.readByte();
            break;
          case 1:
            // The packet has a two-octet length. The header is 3 octets
            // long.
            packetLength = (await reader.readByte() << 8) | await reader.readByte();
            break;
          case 2:
            // The packet has a four-octet length. The header is 5
            // octets long.
            packetLength = (await reader.readByte() << 24) | (await reader.readByte() << 16) | (await reader.readByte() <<
              8) | await reader.readByte();
            break;
          default:
            // 3 - The packet is of indeterminate length. The header is 1
            // octet long, and the implementation must determine how long
            // the packet is. If the packet is in a file, this means that
            // the packet extends until the end of the file. In general,
            // an implementation SHOULD NOT use indeterminate-length
            // packets except where the end of the data will be clear
            // from the context, and even then it is better to use a
            // definite length, or a new format header. The new format
            // headers described below have a mechanism for precisely
            // encoding data of indeterminate length.
            packetLength = Infinity;
            break;
        }
      } else { // 4.2.2. New Format Packet Lengths
        // 4.2.2.1. One-Octet Lengths
        const lengthByte = await reader.readByte();
        wasPartialLength = false;
        if (lengthByte < 192) {
          packetLength = lengthByte;
          // 4.2.2.2. Two-Octet Lengths
        } else if (lengthByte >= 192 && lengthByte < 224) {
          packetLength = ((lengthByte - 192) << 8) + (await reader.readByte()) + 192;
          // 4.2.2.4. Partial Body Lengths
        } else if (lengthByte > 223 && lengthByte < 255) {
          packetLength = 1 << (lengthByte & 0x1F);
          wasPartialLength = true;
          if (!packetSupportsStreaming) {
            throw new TypeError('This packet type does not support partial lengths.');
          }
          // 4.2.2.3. Five-Octet Lengths
        } else {
          packetLength = (await reader.readByte() << 24) | (await reader.readByte() << 16) | (await reader.readByte() <<
            8) | await reader.readByte();
        }
      }
      if (packetLength > 0) {
        let bytesRead = 0;
        while (true) {
          if (writer) await writer.ready;
          const { done, value } = await reader.read();
          if (done) {
            if (packetLength === Infinity) break;
            throw new Error('Unexpected end of packet');
          }
          const chunk = packetLength === Infinity ? value : value.subarray(0, packetLength - bytesRead);
          if (writer) await writer.write(chunk);
          else packet.push(chunk);
          bytesRead += value.length;
          if (bytesRead >= packetLength) {
            reader.unshift(value.subarray(packetLength - bytesRead + value.length));
            break;
          }
        }
      }
    } while (wasPartialLength);

    if (writer) {
      await writer.ready;
      await writer.close();
    } else {
      packet = util.concatUint8Array(packet);
      // eslint-disable-next-line callback-return
      await callback({ tag, packet });
    }
  } catch (e) {
    if (writer) {
      await writer.abort(e);
      return true;
    } else {
      throw e;
    }
  } finally {
    if (writer) {
      await callbackReturned;
    }
  }
}

export class UnsupportedError extends Error {
  constructor(...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedError);
    }

    this.name = 'UnsupportedError';
  }
}

// unknown packet types are handled differently depending on the packet criticality
export class UnknownPacketError extends UnsupportedError {
  constructor(...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedError);
    }

    this.name = 'UnknownPacketError';
  }
}

export class MalformedPacketError extends UnsupportedError {
  constructor(...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedError);
    }

    this.name = 'MalformedPacketError';
  }
}

export class UnparseablePacket {
  constructor(tag, rawContent) {
    this.tag = tag;
    this.rawContent = rawContent;
  }

  write() {
    return this.rawContent;
  }
}

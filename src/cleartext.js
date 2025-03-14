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

import { armor, unarmor } from './encoding/armor';
import enums from './enums';
import util from './util';
import { PacketList, LiteralDataPacket, SignaturePacket } from './packet';
import { Signature } from './signature';
import { createVerificationObjects, createSignaturePackets } from './message';
import defaultConfig from './config';

// A Cleartext message can contain the following packets
const allowedPackets = /*#__PURE__*/ util.constructAllowedPackets([SignaturePacket]);

/**
 * Class that represents an OpenPGP cleartext signed message.
 * See {@link https://tools.ietf.org/html/rfc4880#section-7}
 */
export class CleartextMessage {
  /**
   * @param {String} text - The cleartext of the signed message
   * @param {Signature} signature - The detached signature or an empty signature for unsigned messages
   */
  constructor(text, signature) {
    // remove trailing whitespace and normalize EOL to canonical form <CR><LF>
    this.text = util.removeTrailingSpaces(text).replace(/\r?\n/g, '\r\n');
    if (signature && !(signature instanceof Signature)) {
      throw new Error('Invalid signature input');
    }
    this.signature = signature || new Signature(new PacketList());
  }

  /**
   * Returns the key IDs of the keys that signed the cleartext message
   * @returns {Array<module:type/keyid~KeyID>} Array of keyID objects.
   */
  getSigningKeyIDs() {
    const keyIDs = [];
    const signatureList = this.signature.packets;
    signatureList.forEach(function(packet) {
      keyIDs.push(packet.issuerKeyID);
    });
    return keyIDs;
  }

  /**
   * Sign the cleartext message
   * @param {Array<Key>} signingKeys - private keys with decrypted secret key data for signing
   * @param {Array<Key>} recipientKeys - recipient keys to get the signing preferences from
   * @param {Signature} [signature] - Any existing detached signature
   * @param {Array<module:type/keyid~KeyID>} [signingKeyIDs] - Array of key IDs to use for signing. Each signingKeyIDs[i] corresponds to privateKeys[i]
   * @param {Date} [date] - The creation time of the signature that should be created
   * @param {Array} [signingKeyIDs] - User IDs to sign with, e.g. [{ name:'Steve Sender', email:'steve@openpgp.org' }]
   * @param {Array} [recipientUserIDs] - User IDs associated with `recipientKeys` to get the signing preferences from
   * @param {Array} [notations] - Notation Data to add to the signatures, e.g. [{ name: 'test@example.org', value: new TextEncoder().encode('test'), humanReadable: true, critical: false }]
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<CleartextMessage>} New cleartext message with signed content.
   * @async
   */
  async sign(signingKeys, recipientKeys = [], signature = null, signingKeyIDs = [], date = new Date(), signingUserIDs = [], recipientUserIDs = [], notations = [], config = defaultConfig) {
    const literalDataPacket = new LiteralDataPacket();
    literalDataPacket.setText(this.text);
    const newSignature = new Signature(await createSignaturePackets(literalDataPacket, signingKeys, recipientKeys, signature, signingKeyIDs, date, signingUserIDs, recipientUserIDs, notations, true, config));
    return new CleartextMessage(this.text, newSignature);
  }

  /**
   * Verify signatures of cleartext signed message
   * @param {Array<Key>} keys - Array of keys to verify signatures
   * @param {Date} [date] - Verify the signature against the given date, i.e. check signature creation time < date < expiration time
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {Promise<Array<{
   *   keyID: module:type/keyid~KeyID,
   *   signature: Promise<Signature>,
   *   verified: Promise<true>
   * }>>} List of signer's keyID and validity of signature.
   * @async
   */
  verify(keys, date = new Date(), config = defaultConfig) {
    const signatureList = this.signature.packets.filterByTag(enums.packet.signature); // drop UnparsablePackets
    const literalDataPacket = new LiteralDataPacket();
    // we assume that cleartext signature is generated based on UTF8 cleartext
    literalDataPacket.setText(this.text);
    return createVerificationObjects(signatureList, [literalDataPacket], keys, date, true, config);
  }

  /**
   * Get cleartext
   * @returns {String} Cleartext of message.
   */
  getText() {
    // normalize end of line to \n
    return this.text.replace(/\r\n/g, '\n');
  }

  /**
   * Returns ASCII armored text of cleartext signed message
   * @param {Object} [config] - Full configuration, defaults to openpgp.config
   * @returns {String | ReadableStream<String>} ASCII armor.
   */
  armor(config = defaultConfig) {
    // emit header and checksum if one of the signatures has a version not 6
    const emitHeaderAndChecksum = this.signature.packets.some(packet => packet.version !== 6);
    const hash = emitHeaderAndChecksum ?
      Array.from(new Set(this.signature.packets.map(
        packet => enums.read(enums.hash, packet.hashAlgorithm).toUpperCase()
      ))).join() :
      null;

    const body = {
      hash,
      text: this.text,
      data: this.signature.packets.write()
    };

    // An ASCII-armored sequence of Signature packets that only includes v6 Signature packets MUST NOT contain a CRC24 footer.
    return armor(enums.armor.signed, body, undefined, undefined, undefined, emitHeaderAndChecksum, config);
  }
}

/**
 * Reads an OpenPGP cleartext signed message and returns a CleartextMessage object
 * @param {Object} options
 * @param {String} options.cleartextMessage - Text to be parsed
 * @param {Object} [options.config] - Custom configuration settings to overwrite those in [config]{@link module:config}
 * @returns {Promise<CleartextMessage>} New cleartext message object.
 * @async
 * @static
 */
export async function readCleartextMessage({ cleartextMessage, config, ...rest }) {
  config = { ...defaultConfig, ...config };
  if (!cleartextMessage) {
    throw new Error('readCleartextMessage: must pass options object containing `cleartextMessage`');
  }
  if (!util.isString(cleartextMessage)) {
    throw new Error('readCleartextMessage: options.cleartextMessage must be a string');
  }
  const unknownOptions = Object.keys(rest); if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(', ')}`);

  const input = await unarmor(cleartextMessage);
  if (input.type !== enums.armor.signed) {
    throw new Error('No cleartext signed message.');
  }
  const packetlist = await PacketList.fromBinary(input.data, allowedPackets, config);
  verifyHeaders(input.headers, packetlist);
  const signature = new Signature(packetlist);
  return new CleartextMessage(input.text, signature);
}

/**
 * Compare hash algorithm specified in the armor header with signatures
 * @param {Array<String>} headers - Armor headers
 * @param {PacketList} packetlist - The packetlist with signature packets
 * @private
 */
function verifyHeaders(headers, packetlist) {
  const checkHashAlgos = function(hashAlgos) {
    const check = packet => algo => packet.hashAlgorithm === algo;

    for (let i = 0; i < packetlist.length; i++) {
      if (packetlist[i].constructor.tag === enums.packet.signature && !hashAlgos.some(check(packetlist[i]))) {
        return false;
      }
    }
    return true;
  };

  const hashAlgos = [];
  headers.forEach(header => {
    const hashHeader = header.match(/^Hash: (.+)$/); // get header value
    if (hashHeader) {
      const parsedHashIDs = hashHeader[1]
        .replace(/\s/g, '') // remove whitespace
        .split(',')
        .map(hashName => {
          try {
            return enums.write(enums.hash, hashName.toLowerCase());
          } catch (e) {
            throw new Error('Unknown hash algorithm in armor header: ' + hashName.toLowerCase());
          }
        });
      hashAlgos.push(...parsedHashIDs);
    } else {
      throw new Error('Only "Hash" header allowed in cleartext signed message');
    }
  });

  if (hashAlgos.length && !checkHashAlgos(hashAlgos)) {
    throw new Error('Hash algorithm mismatch in armor header and signature');
  }
}

/**
 * Creates a new CleartextMessage object from text
 * @param {Object} options
 * @param {String} options.text
 * @static
 * @async
 */
export async function createCleartextMessage({ text, ...rest }) {
  if (!text) {
    throw new Error('createCleartextMessage: must pass options object containing `text`');
  }
  if (!util.isString(text)) {
    throw new Error('createCleartextMessage: options.text must be a string');
  }
  const unknownOptions = Object.keys(rest); if (unknownOptions.length > 0) throw new Error(`Unknown option: ${unknownOptions.join(', ')}`);

  return new CleartextMessage(text);
}

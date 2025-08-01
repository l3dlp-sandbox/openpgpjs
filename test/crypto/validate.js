import { use as chaiUse, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised'; // eslint-disable-line import/newline-after-import
chaiUse(chaiAsPromised);

import openpgp from '../initOpenpgp.js';
import { bigIntToUint8Array, modExp, uint8ArrayToBigInt } from '../../src/crypto/biginteger.ts';

const armoredDSAKey = `-----BEGIN PGP PRIVATE KEY BLOCK-----

lQNTBF69PO8RCACHP4KLQcYOPGsGV9owTZvxnvHvvrY8W0v8xDUL3y6CLc05srF1
kQp/81iUfP5g57BEiDpJV95kMh+ulBthIOGnuMCkodJjuBICB4K6BtFTV4Fw1Q5S
S7aLC9beCaMvvGHXsK6MbknYl+IVJY7Zmml1qUSrBIQFGp5kqdhIX4o+OrzZ1zYj
ALicqzD7Zx2VRjGNQv7UKv4CkBOC8ncdnq/4/OQeOYFzVbCOf+sJhTgz6yxjHJVC
fLk7w8l2v1zV11VJuc8cQiQ9g8tjbKgLMsbyzy7gl4m9MSCdinG36XZuPibZrSm0
H8gKAdd1FT84a3/qU2rtLLR0y8tCxBj89Xx/AQCv7CDmwoU+/yGpBVVl1mh0ZUkA
/VJUhnJfv5MIOIi3AQf8CS9HrEmYJg/A3z0DcvcwIu/9gqpRLTqH1iT5o4BCg2j+
Cog2ExYkQl1OEPkEQ1lKJSnD8MDwO3BlkJ4cD0VSKxlnwd9dsu9m2+F8T+K1hoA7
PfH89TjD5HrEaGAYIdivLYSwoTNOO+fY8FoVC0RR9pFNOmjiTU5PZZedOxAql5Os
Hp2bYhky0G9trjo8Mt6CGhvgA3dAKyONftLQr9HSM0GKacFV+nRd9TGCPNZidKU8
MDa/SB/08y1bBGX5FK5wwiZ6H5qD8VAUobH3kwKlrg0nL00/EqtYHJqvJ2gkT5/v
h8+z4R4TuYiy4kKF2FLPd5OjdA31IVDoVgCwF0WHLgf/X9AiTr/DPs/5dIYN1+hf
UJwqjzr3dlokRwx3CVDcOVsdkWRwb8cvxubbsIorvUrF02IhYjHJMjIHT/zFt2zA
+VPzO4zabUlawWVepPEwrCtXgvn9aXqjhAYbilG3UZamhfstGUmbmvWVDadALwby
EO8u2pfLhI2lep63V/+KtUOLhfk8jKRSvxvxlYAvMi7sK8kB+lYy17XKN+IMYgf8
gMFV6XGKpdmMSV3jOvat8cI6vnRO0i+g3jANP3PfrFEivat/rVgxo67r4rxezfFn
J29qwB9rgbRgMBGsbDvIlQNV/NWFvHy2uQAEKn5eX4CoLsCZoR2VfK3BwBCxhYDp
/wAA/0GSmI9MlMnLadFNlcX2Bm4i15quZAGF8JxwHbj1dhdUEYq0E1Rlc3QgPHRl
c3RAdGVzdC5pbz6IlAQTEQgAPBYhBAq6lCI5EfrbHP1qZCxnOy/rlEGVBQJevTzv
AhsDBQsJCAcCAyICAQYVCgkICwIEFgIDAQIeBwIXgAAKCRAsZzsv65RBlUPoAP9Q
aTCWpHWZkvZzC8VU64O76fHp31rLWlcZFttuDNLyeAEAhOxkQHk6GR88R+EF5mrn
clr63t9Q4wreqOlO0NR5/9k=
=UW2O
-----END PGP PRIVATE KEY BLOCK-----
`;

const armoredElGamalKey = `-----BEGIN PGP PRIVATE KEY BLOCK-----

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
vqBGKJzmO5q3cECw
=X9kJ
-----END PGP PRIVATE KEY BLOCK-----`;

async function cloneKeyPacket(key) {
  const keyPacket = new openpgp.SecretKeyPacket();
  await keyPacket.read(key.keyPacket.write());
  return keyPacket;
}

async function generatePrivateKeyObject(options) {
  const config = { rejectCurves: new Set() };
  const { privateKey } = await openpgp.generateKey({ ...options, userIDs: [{ name: 'Test', email: 'test@test.com' }], format: 'object', config });
  return privateKey;
}

/* eslint-disable no-invalid-this */
export default () => {
  describe('EdDSA parameter validation (legacy format)', function() {
    let eddsaKey;
    let anotherEddsaKey;
    before(async () => {
      eddsaKey = await generatePrivateKeyObject({ curve: 'ed25519Legacy' });
      anotherEddsaKey = await generatePrivateKeyObject({ curve: 'ed25519Legacy' });
    });

    it('EdDSA params should be valid', async function() {
      await expect(eddsaKey.keyPacket.validate()).to.not.be.rejected;
    });

    it('detect invalid edDSA Q', async function() {
      const eddsaKeyPacket = await cloneKeyPacket(eddsaKey);
      eddsaKeyPacket.publicParams.Q = anotherEddsaKey.keyPacket.publicParams.Q;
      await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

      const infQ = new Uint8Array(eddsaKeyPacket.publicParams.Q.length);
      eddsaKeyPacket.publicParams.Q = infQ;
      await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });
  });

  describe('ECC curve validation', function() {
    let eddsaKey;
    let ecdhKey;
    let ecdsaKey;
    before(async () => {
      eddsaKey = await generatePrivateKeyObject({ curve: 'ed25519Legacy' });
      ecdhKey = eddsaKey.subkeys[0];
      ecdsaKey = await generatePrivateKeyObject({ curve: 'nistP256' });
    });

    it('EdDSA params are not valid for ECDH', async function() {
      const { oid, Q } = eddsaKey.keyPacket.publicParams;
      const { seed } = eddsaKey.keyPacket.privateParams;

      const ecdhKeyPacket = await cloneKeyPacket(ecdhKey);
      const ecdhOID = ecdhKeyPacket.publicParams.oid;

      ecdhKeyPacket.publicParams.oid = oid;
      await expect(ecdhKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

      ecdhKeyPacket.publicParams.oid = ecdhOID;
      ecdhKeyPacket.publicParams.Q = Q;
      ecdhKeyPacket.privateParams.d = seed;
      await expect(ecdhKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('EdDSA params are not valid for ECDSA', async function() {
      const { oid, Q } = eddsaKey.keyPacket.publicParams;
      const { seed } = eddsaKey.keyPacket.privateParams;

      const ecdsaKeyPacket = await cloneKeyPacket(ecdsaKey);
      const ecdsaOID = ecdsaKeyPacket.publicParams.oid;
      ecdsaKeyPacket.publicParams.oid = oid;
      await expect(ecdsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

      ecdsaKeyPacket.publicParams.oid = ecdsaOID;
      ecdsaKeyPacket.publicParams.Q = Q;
      ecdsaKeyPacket.privateParams.d = seed;
      await expect(ecdsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('ECDH x25519 params are not valid for ECDSA', async function() {
      const { oid, Q } = ecdhKey.keyPacket.publicParams;
      const { d } = ecdhKey.keyPacket.privateParams;

      const ecdsaKeyPacket = await cloneKeyPacket(ecdsaKey);
      ecdsaKeyPacket.publicParams.oid = oid;
      ecdsaKeyPacket.publicParams.Q = Q;
      ecdsaKeyPacket.privateParams.d = d;
      await expect(ecdsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('ECDSA params are not valid for EdDSA', async function() {
      const { oid, Q } = ecdsaKey.keyPacket.publicParams;
      const { d } = ecdsaKey.keyPacket.privateParams;

      const eddsaKeyPacket = await cloneKeyPacket(eddsaKey);
      const eddsaOID = eddsaKeyPacket.publicParams.oid;
      eddsaKeyPacket.publicParams.oid = oid;
      await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

      eddsaKeyPacket.publicParams.oid = eddsaOID;
      eddsaKeyPacket.publicParams.Q = Q;
      eddsaKeyPacket.privateParams.seed = d;
      await expect(eddsaKeyPacket.validate()).to.be.rejected;
    });

    it('ECDH x25519 params are not valid for EdDSA', async function() {
      const { oid, Q } = ecdhKey.keyPacket.publicParams;
      const { d } = ecdhKey.keyPacket.privateParams;

      const eddsaKeyPacket = await cloneKeyPacket(eddsaKey);
      const eddsaOID = eddsaKeyPacket.publicParams.oid;
      eddsaKeyPacket.publicParams.oid = oid;
      await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

      eddsaKeyPacket.publicParams.oid = eddsaOID;
      eddsaKeyPacket.publicParams.Q = Q;
      eddsaKeyPacket.privateParams.seed = d;
      await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });
  });

  const curves = ['curve25519Legacy', 'nistP256', 'nistP384', 'nistP521', 'secp256k1', 'brainpoolP256r1', 'brainpoolP384r1', 'brainpoolP512r1'];
  curves.forEach(curve => {
    describe(`ECC ${curve} parameter validation`, () => {
      let ecdsaKey;
      let ecdhKey;
      let anotherEcdsaKey;
      let anotherEcdhKey;
      before(async () => {
        if (curve !== 'curve25519Legacy') {
          ecdsaKey = await generatePrivateKeyObject({ curve });
          ecdhKey = ecdsaKey.subkeys[0];
          anotherEcdsaKey = await generatePrivateKeyObject({ curve });
          anotherEcdhKey = anotherEcdsaKey.subkeys[0];
        } else {
          const eddsaKey = await generatePrivateKeyObject({ curve: 'ed25519Legacy' });
          ecdhKey = eddsaKey.subkeys[0];
          const anotherEddsaKey = await generatePrivateKeyObject({ curve: 'ed25519Legacy' });
          anotherEcdhKey = anotherEddsaKey.subkeys[0];
        }
      });

      it(`ECDSA ${curve} params should be valid`, async function() {
        if (!ecdsaKey) {
          this.skip();
        }
        await expect(ecdsaKey.keyPacket.validate()).to.not.be.rejected;
      });

      it(`ECDSA ${curve} - detect invalid Q`, async function() {
        if (!ecdsaKey) {
          this.skip();
        }
        const keyPacket = await cloneKeyPacket(ecdsaKey);
        keyPacket.publicParams.Q = anotherEcdsaKey.keyPacket.publicParams.Q;
        await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
        const infQ = new Uint8Array(anotherEcdsaKey.keyPacket.publicParams.Q.length);
        infQ[0] = 4;
        keyPacket.publicParams.Q = infQ;
        await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
      });

      it(`ECDH ${curve} params should be valid`, async function() {
        await expect(ecdhKey.keyPacket.validate()).to.not.be.rejected;
      });

      it(`ECDH ${curve} - detect invalid Q`, async function() {
        const keyPacket = await cloneKeyPacket(ecdhKey);
        keyPacket.publicParams.Q = anotherEcdhKey.keyPacket.publicParams.Q;
        await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');

        const infQ = new Uint8Array(keyPacket.publicParams.Q.length);
        keyPacket.publicParams.Q = infQ;
        infQ[0] = 4;
        await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
      });
    });
  });

  // new EdDSA/XECDH algos
  ['25519', '448'].forEach(curveID => {
    describe(`Ed${curveID}/X${curveID} parameter validation`, function() {
      let eddsaKey;
      let ecdhXKey;
      let anotherEddsaKey;
      let anotherEcdhXKey;
      before(async () => {
        eddsaKey = await generatePrivateKeyObject({ type: `curve${curveID}` });
        ecdhXKey = eddsaKey.subkeys[0];
        anotherEddsaKey = await generatePrivateKeyObject({ type: `curve${curveID}` });
        anotherEcdhXKey = anotherEddsaKey.subkeys[0];
      });

      it(`Ed${curveID} params should be valid`, async function() {
        await expect(eddsaKey.keyPacket.validate()).to.not.be.rejected;
      });

      it(`detect invalid Ed${curveID} public point`, async function() {
        const eddsaKeyPacket = await cloneKeyPacket(eddsaKey);
        eddsaKeyPacket.publicParams.A = anotherEddsaKey.keyPacket.publicParams.A;
        await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

        const infA = new Uint8Array(eddsaKeyPacket.publicParams.A.length);
        eddsaKeyPacket.publicParams.A = infA;
        await expect(eddsaKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
      });

      it(`X${curveID} params should be valid`, async function() {
        await expect(ecdhXKey.keyPacket.validate()).to.not.be.rejected;
      });

      it(`detect invalid X${curveID} public point`, async function() {
        const ecdhXKeyPacket = await cloneKeyPacket(ecdhXKey);
        ecdhXKeyPacket.publicParams.A = anotherEcdhXKey.keyPacket.publicParams.A;
        await expect(ecdhXKeyPacket.validate()).to.be.rejectedWith('Key is invalid');

        const infA = new Uint8Array(ecdhXKeyPacket.publicParams.A.length);
        ecdhXKeyPacket.publicParams.A = infA;
        await expect(ecdhXKeyPacket.validate()).to.be.rejectedWith('Key is invalid');
      });
    });
  });

  describe('RSA parameter validation', function() {
    let rsaKey;
    let anotherRsaKey;
    before(async () => {
      rsaKey = await generatePrivateKeyObject({ type: 'rsa', rsaBits: 2048 });
      anotherRsaKey = await generatePrivateKeyObject({ type: 'rsa', rsaBits: 2048 });
    });

    it('generated RSA params are valid', async function() {
      await expect(rsaKey.keyPacket.validate()).to.not.be.rejected;
    });

    it('detect invalid RSA n', async function() {
      const keyPacket = await cloneKeyPacket(rsaKey);
      keyPacket.publicParams.n = anotherRsaKey.keyPacket.publicParams.n;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect invalid RSA e', async function() {
      const keyPacket = await cloneKeyPacket(rsaKey);
      const e = keyPacket.publicParams.e;
      e[0]++; // e is hard-coded so we don't take it from `anotherRsaKey`
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });
  });

  describe('DSA parameter validation', function() {
    let dsaKey;
    before(async () => {
      dsaKey = await openpgp.readKey({ armoredKey: armoredDSAKey });
    });

    it('DSA params should be valid', async function() {
      await expect(dsaKey.keyPacket.validate()).to.not.be.rejected;
    });

    it('detect invalid DSA p', async function() {
      const keyPacket = await cloneKeyPacket(dsaKey);
      const p = keyPacket.publicParams.p;
      p[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect invalid DSA y', async function() {
      const keyPacket = await cloneKeyPacket(dsaKey);
      const y = keyPacket.publicParams.y;

      y[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect invalid DSA g', async function() {
      const keyPacket = await cloneKeyPacket(dsaKey);
      const g = keyPacket.publicParams.g;

      g[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');

      keyPacket.publicParams.g = new Uint8Array([1]);
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });
  });

  describe('ElGamal parameter validation', function() {
    let egKey;
    before(async () => {
      egKey = (await openpgp.readKey({ armoredKey: armoredElGamalKey })).subkeys[0];
    });

    it('params should be valid', async function() {
      await expect(egKey.keyPacket.validate()).to.not.be.rejected;
    });

    it('detect invalid p', async function() {
      const keyPacket = await cloneKeyPacket(egKey);
      const p = keyPacket.publicParams.p;
      p[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect invalid y', async function() {
      const keyPacket = await cloneKeyPacket(egKey);
      const y = keyPacket.publicParams.y;
      y[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect invalid g', async function() {
      const keyPacket = await cloneKeyPacket(egKey);
      const g = keyPacket.publicParams.g;

      g[0]++;
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');

      keyPacket.publicParams.g = new Uint8Array([1]);
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });

    it('detect g with small order', async function() {
      const keyPacket = await cloneKeyPacket(egKey);
      const { p, g } = keyPacket.publicParams;

      const _1n = BigInt(1);
      const pBN = uint8ArrayToBigInt(p);
      const gBN = uint8ArrayToBigInt(g);
      // g**(p-1)/2 has order 2
      const gOrd2 = modExp(gBN, (pBN - _1n) >> _1n, pBN);
      keyPacket.publicParams.g = bigIntToUint8Array(gOrd2);
      await expect(keyPacket.validate()).to.be.rejectedWith('Key is invalid');
    });
  });
};

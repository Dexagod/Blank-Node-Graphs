# RDFJS Sign
A set of utilities for signing RDF. :warning: Not for production use :warning:

[![GitHub license](https://img.shields.io/github/license/jeswr/rdfjs-sign.svg)](https://github.com/jeswr/rdfjs-sign/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/@jeswr/rdfjs-sign.svg)](https://www.npmjs.com/package/@jeswr/rdfjs-sign)
[![build](https://img.shields.io/github/actions/workflow/status/jeswr/rdfjs-sign/nodejs.yml?branch=main)](https://github.com/jeswr/rdfjs-sign/tree/main/)
[![Dependabot](https://badgen.net/badge/Dependabot/enabled/green?icon=dependabot)](https://dependabot.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage
```ts
import { DataFactory } from 'n3';
import {
  generateKeyPair, exportKey, signQuads, verifyQuads, importKey,
} from '@jeswr/rdfjs-sign';

const { quad, namedNode } = DataFactory;

const q1 = quad(namedNode('http://example.org/s'), namedNode('http://example.org/p'), namedNode('http://example.org/o1'));
const q2 = quad(namedNode('http://example.org/s'), namedNode('http://example.org/p'), namedNode('http://example.org/o2'));
const q3 = quad(namedNode('http://example.org/s'), namedNode('http://example.org/p'), namedNode('http://example.org/o3'));
const keyPair = await generateKeyPair();
const signature = await signQuads([q1, q2], keyPair.privateKey);

// true
await verifyQuads([q2, q1], signature, keyPair.publicKey);

// false
await verifyQuads([q1, q3], signature, keyPair.publicKey);

// true
await verifyQuads([q2, q1], signature, await importKey(await exportKey(keyPair.publicKey)));
```

## CLI Usage
To sign data with a private key
```
npx @jeswr/rdfjs-sign --private-key ./key.json --hash "abc123"
```

To sign a hash with a private key
```
npx @jeswr/rdfjs-sign --private-key ./key.json --data ./data.ttl
```

## License
©2024–present
[Jesse Wright](https://github.com/jeswr),
[MIT License](https://github.com/jeswr/rdfjs-sign/blob/master/LICENSE).

This is based on code written in [this prototype](https://github.com/SolidLabResearch/Vienna-prototype/blob/a902b3351c70dc00bb2494cc331f6f21289ad0f5/packaging/createSignedPackage.ts) in collaboration with [Ruben Dedecker](https://github.com/Dexagod) and [Wout Slabbinck](https://github.com/woutslabbinck).

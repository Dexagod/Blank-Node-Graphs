# event-emitter-promisify
Utility to resolve EventEmitters as a promise

[![GitHub license](https://img.shields.io/github/license/jeswr/promisify-event-emitter.svg)](https://github.com/jeswr/promisify-event-emitter/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/event-emitter-promisify.svg)](https://www.npmjs.com/package/event-emitter-promisify)
[![build](https://img.shields.io/github/workflow/status/jeswr/promisify-event-emitter/Node.js%20CI)](https://github.com/jeswr/promisify-event-emitter/tree/main/)
[![Dependabot](https://badgen.net/badge/Dependabot/enabled/green?icon=dependabot)](https://dependabot.com/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage

By default `promisifyEventEmitter` returns a promise which resolves to undefined if the `end` event is called, and rejects if the `error` event is called.

```ts
import { promisifyEventEmitter } from 'event-emitter-promisify'

const stream = new Readable();
stream.push(null);
await promisifyEventEmitter(stream.on('data', () => {}));
```

The return value on `end` can also be customized. For instance:

```ts
export default function arrayifyStream<T = any>(stream: EventEmitter): Promise<T[]> {
  const array: T[] = [];
  return promisifyEventEmitter(stream.on('data', data => array.push(data)), array);
}
```

## License
©2022–present
[Jesse Wright](https://github.com/jeswr),
[MIT License](https://github.com/jeswr/promisify-event-emitter/blob/master/LICENSE).

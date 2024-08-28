"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signParams = exports.keyParams = void 0;
exports.keyParams = {
    name: 'ECDSA',
    namedCurve: 'P-384',
};
exports.signParams = {
    name: exports.keyParams.name,
    hash: 'SHA-512',
};

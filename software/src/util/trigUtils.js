"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTrigToStore = exports.serializeTrigFromStore = void 0;
const n3_1 = require("n3");
function serializeTrigFromStore(store) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const writer = new n3_1.Writer({ format: 'application/trig' });
            writer.addQuads(store.getQuads(null, null, null, null));
            writer.end((error, result) => {
                if (error || !result) {
                    throw new Error('Could not serialize package string correctly');
                }
                resolve(indentTrigString(result));
            });
        });
    });
}
exports.serializeTrigFromStore = serializeTrigFromStore;
function parseTrigToStore(content) {
    const store = new n3_1.Store();
    store.addQuads(new n3_1.Parser({ format: 'application/trig' }).parse(content));
    return store;
}
exports.parseTrigToStore = parseTrigToStore;
function indentTrigString(trigString) {
    let result = '';
    const indent = '\t';
    let indented = false;
    for (let line of trigString.split('\n')) {
        line = line.replace(/\s\s+/g, '\t');
        if (line.includes('{')) {
            indented = true;
            result += line + '\n';
        }
        else if (line.includes('}')) {
            indented = false;
            result += line + '\n';
        }
        else {
            result += indented ? indent + line + '\n' : line + '\n';
        }
    }
    return result.trimEnd();
}

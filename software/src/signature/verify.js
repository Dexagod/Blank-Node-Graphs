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
exports.verifySignature = exports.verifyAllSignatures = void 0;
const rdf_retrieval_1 = require("@dexagod/rdf-retrieval");
const rdfjs_sign_1 = require("@jeswr/rdfjs-sign");
const crypto_1 = require("crypto");
const n3_1 = require("n3");
const util_1 = require("../util/util");
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const { namedNode } = n3_1.DataFactory;
function verifyAllSignatures(store) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const signatureSubjects = store.getQuads(null, namedNode(vocab_common_rdf_1.RDF.type), util_1.SignOntology.DataIntegrityProof, null).map(q => q.subject);
        const signatureInfoList = [];
        for (let subject of signatureSubjects) {
            const contentManipulationSubject = store.getQuads(subject, namedNode(util_1.SignOntology.contentManipulation), null, null)[0].object;
            signatureInfoList.push({
                issuer: store.getQuads(subject, namedNode(util_1.SignOntology.issuer), null, null)[0].object.value,
                proofValue: store.getQuads(subject, namedNode(util_1.SignOntology.proofValue), null, null)[0].object.value,
                verificationMethod: store.getQuads(subject, namedNode(util_1.SignOntology.verificationMethod), null, null)[0].object.value,
                cryptoSuite: store.getQuads(subject, namedNode(util_1.SignOntology.cryptosuite), null, null)[0].object.value,
                target: store.getQuads(subject, namedNode(util_1.SignOntology.target), null, null)[0].object,
                hashMethod: store.getQuads(contentManipulationSubject, namedNode(util_1.SignOntology.hashMethod), null, null)[0].object.value,
                canonicalizationMethod: (_a = store.getQuads(contentManipulationSubject, namedNode(util_1.SignOntology.canonicalizationMethod), null, null)[0]) === null || _a === void 0 ? void 0 : _a.object.value,
            });
        }
        let verificationResults = [];
        for (let signatureInfo of signatureInfoList) {
            verificationResults.push(verifySignature(store, signatureInfo));
        }
        let awaitedResults = Promise.all(verificationResults);
        return awaitedResults;
    });
}
exports.verifyAllSignatures = verifyAllSignatures;
function verifySignature(store, info) {
    return __awaiter(this, void 0, void 0, function* () {
        const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info;
        if (target.termType === 'Variable' || target.termType === "Literal") {
            throw new Error('Signature targets must be either blank node or named nodes.');
        }
        if (target.termType === 'BlankNode') {
            // Blank node targets means that our signature target graph or dataset is fully contained in the local scope.
            let quads = [];
            const containmentType = (0, util_1.checkContainmentType)(store, target);
            if (containmentType === util_1.ContainmentType.Dataset) {
                quads = (0, util_1.getDatasetGraphQuads)(store, target);
            }
            else if (containmentType === util_1.ContainmentType.Graph) {
                quads = store.getQuads(null, null, null, target);
            }
            else {
                throw new Error('Signature target must be either a graph or dataset when signature target is a blank node.');
            }
            return yield verifyRDFContentSignature(quads, info);
        }
        else {
            // Named node targets means that our signature target graph or dataset are scoped to the remote scope defined by the URI domain.
            let isRDF = true;
            let resourceStore;
            try {
                resourceStore = yield (0, rdf_retrieval_1.getResourceAsStore)(target.value);
            }
            catch (eVerifyBufferContentSignature) {
                isRDF = false;
            }
            if (isRDF && resourceStore) {
                // Blank node targets means that our signature target graph or dataset is fully contained in the local scope.
                let quads = [];
                const containmentType = (0, util_1.checkContainmentType)(resourceStore, target);
                if (containmentType === util_1.ContainmentType.Dataset) {
                    quads = (0, util_1.getDatasetGraphQuads)(store, target);
                }
                else if (containmentType === util_1.ContainmentType.Graph) {
                    quads = store.getQuads(null, null, null, target);
                }
                else {
                    throw new Error('Signature target must be either a graph or dataset when signature target is a blank node.');
                }
                return yield verifyRDFContentSignature(quads, info);
            }
            else {
                const resource = yield fetch(target.value);
                const buffer = Buffer.from(yield resource.arrayBuffer());
                return yield verifyBufferContentSignature(buffer, info);
            }
        }
    });
}
exports.verifySignature = verifySignature;
/**
 * Verifies signature to hash of all quads passed in the quads parameter.
 * @param quads
 * @param info
 * @returns
 */
function verifyRDFContentSignature(quads, info) {
    return __awaiter(this, void 0, void 0, function* () {
        const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info;
        if (canonicalizationMethod !== "c14n") {
            throw new Error('Currently this package only supports canonicalization of RDF with the c14n algorithm.');
        }
        try {
            const publicKey = yield getPublicKeyFromVerificationMethod(verificationMethod);
            const result = yield (0, rdfjs_sign_1.verifyQuads)(quads, proofValue, publicKey);
            return ({
                result,
                target: info.target,
                verifiedContents: quads
            });
        }
        catch (e) {
            return {
                result: false,
                target: info.target,
                errorMessage: e.message
            };
        }
    });
}
function verifyBufferContentSignature(buffer, info) {
    return __awaiter(this, void 0, void 0, function* () {
        const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info;
        try {
            const hash = yield crypto_1.webcrypto.subtle.digest(hashMethod, buffer);
            const publicKey = yield getPublicKeyFromVerificationMethod(verificationMethod);
            const result = yield crypto_1.webcrypto.subtle.verify(rdfjs_sign_1.signParams, publicKey, Buffer.from(proofValue, 'base64'), hash);
            return ({
                result,
                target: info.target,
                verifiedContents: target
            });
        }
        catch (e) {
            return {
                result: false,
                target: info.target,
                errorMessage: e.message
            };
        }
    });
}
function getPublicKeyFromVerificationMethod(verificationMethod) {
    return __awaiter(this, void 0, void 0, function* () {
        const publicKeyString = yield (yield fetch(verificationMethod)).text();
        return yield (0, rdfjs_sign_1.importKey)(publicKeyString);
    });
}

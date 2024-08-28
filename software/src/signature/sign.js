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
exports.createRemoteResourceSignature = exports.createRemoteRDFDatasetSignature = exports.createRemoteRDFSignature = exports.createRDFDatasetSignature = exports.createRDFGraphSignature = exports.createSignatureTriples = exports.addSignatureGraphToStore = void 0;
const dist_1 = require("@jeswr/rdfjs-sign/dist");
const util_1 = require("../util/util");
const n3_1 = require("n3");
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const crypto_1 = require("crypto");
const rdf_retrieval_1 = require("@dexagod/rdf-retrieval");
const { namedNode, blankNode, literal, quad, defaultGraph, triple } = n3_1.DataFactory;
function addSignatureGraphToStore(store, signature, graph) {
    // Create graph to store signature information
    graph = graph || blankNode();
    store.addQuads(signature.map(t => quad(t.subject, t.predicate, t.object, graph)));
    return { store, graph };
}
exports.addSignatureGraphToStore = addSignatureGraphToStore;
function createSignatureTriples(signature) {
    const { issuer, verificationMethod, cryptoSuite, proofValue, target, hashMethod, canonicalizationMethod } = signature;
    ``;
    const signatureSubject = blankNode();
    const contentManipulationSubject = blankNode();
    const signatureTriples = [
        quad(signatureSubject, namedNode(vocab_common_rdf_1.RDF.type), namedNode(util_1.SignOntology.DataIntegrityProof)),
        quad(signatureSubject, namedNode(util_1.SignOntology.created), literal(new Date().toISOString(), vocab_common_rdf_1.XSD.dateTime)),
        quad(signatureSubject, namedNode(util_1.SignOntology.issuer), namedNode(issuer)),
        quad(signatureSubject, namedNode(util_1.SignOntology.cryptosuite), literal(cryptoSuite)),
        quad(signatureSubject, namedNode(util_1.SignOntology.verificationMethod), namedNode(verificationMethod)),
        quad(signatureSubject, namedNode(util_1.SignOntology.proofPurpose), literal("assertionMethod")),
        quad(signatureSubject, namedNode(util_1.SignOntology.proofValue), literal(proofValue)),
        quad(signatureSubject, namedNode(util_1.SignOntology.target), target),
        // Content manipulation
        quad(signatureSubject, namedNode(util_1.SignOntology.contentManipulation), contentManipulationSubject),
        quad(contentManipulationSubject, namedNode(util_1.SignOntology.hashMethod), literal(hashMethod)),
    ];
    if (canonicalizationMethod)
        signatureTriples.push(quad(contentManipulationSubject, namedNode(util_1.SignOntology.canonicalizationMethod), literal(canonicalizationMethod)));
    return { subject: signatureSubject, triples: signatureTriples };
}
exports.createSignatureTriples = createSignatureTriples;
/**
 * Note that signing the default graph is not possible.
 * Fist create a new graph with the same contents to sign.
 *
 * @param store
 * @param target
 * @param signatureOptions
 * @returns
 */
function createRDFGraphSignature(store, target, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        // Throw error on signing the default graph
        if (target.equals(defaultGraph()))
            throw new Error('Invalid signature target: cannot sign the default graph.');
        // Extract graph quads
        const graphQuads = store.getQuads(null, null, null, target);
        // Create signature graph
        const signatureInfo = yield createSignatureForQuadArray(graphQuads, target, signatureOptions);
        return signatureInfo;
    });
}
exports.createRDFGraphSignature = createRDFGraphSignature;
function createRDFDatasetSignature(store, target, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        // Extract contained graphs in dataset
        const containedGraphraphsInDataset = store.getQuads(target, util_1.PackOntology.contains, null, null).map(q => q.object);
        // Extract graph quads
        let combinedQuads = [];
        for (let graphTerm of containedGraphraphsInDataset) {
            combinedQuads = combinedQuads.concat(store.getQuads(null, null, null, graphTerm));
        }
        const signatureInfo = yield createSignatureForQuadArray(combinedQuads, target, signatureOptions);
        return signatureInfo;
    });
}
exports.createRDFDatasetSignature = createRDFDatasetSignature;
function createRemoteRDFSignature(url, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const resourceQuads = yield (0, rdf_retrieval_1.getResourceAsQuadArray)(url);
        return createSignatureForQuadArray(resourceQuads, namedNode(url), signatureOptions);
    });
}
exports.createRemoteRDFSignature = createRemoteRDFSignature;
function createRemoteRDFDatasetSignature(url, target, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const resourceStore = yield (0, rdf_retrieval_1.getResourceAsStore)(url);
        return createRDFDatasetSignature(resourceStore, target, signatureOptions);
    });
}
exports.createRemoteRDFDatasetSignature = createRemoteRDFDatasetSignature;
function createSignatureForQuadArray(quads, target, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { privateKey, issuer, verificationMethod } = signatureOptions;
        // Sign over graph quads
        const signature = yield (0, dist_1.signQuads)(quads, privateKey);
        return {
            issuer,
            proofValue: signature,
            verificationMethod: verificationMethod,
            cryptoSuite: dist_1.keyParams.name,
            target,
            hashMethod: "SHA-512",
            canonicalizationMethod: "c14n",
        };
    });
}
function createRemoteResourceSignature(url, signatureOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { privateKey, issuer, verificationMethod } = signatureOptions;
        // create buffer from resource contents
        let content = yield fetch(url);
        let contentBuffer = Buffer.from(yield content.arrayBuffer());
        // hash content buffer using SHA-512
        const hash = yield crypto_1.webcrypto.subtle.digest(dist_1.signParams.hash, contentBuffer);
        const signature = (yield crypto_1.webcrypto.subtle.sign(dist_1.signParams, privateKey, hash));
        const signatureString = Buffer.from(signature).toString('base64');
        return {
            issuer,
            proofValue: signatureString,
            verificationMethod: verificationMethod,
            cryptoSuite: dist_1.keyParams.name,
            target: namedNode(url),
            hashMethod: dist_1.signParams.hash,
        };
    });
}
exports.createRemoteResourceSignature = createRemoteResourceSignature;

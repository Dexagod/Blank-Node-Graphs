"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRDFList = exports.getDatasetGraphQuads = exports.generateUrnUuid = exports.checkContainmentType = exports.ContainmentType = exports.PackOntology = exports.SignOntology = void 0;
const vocab_common_rdf_1 = require("@inrupt/vocab-common-rdf");
const n3_1 = require("n3");
const uuid_1 = require("uuid");
const { namedNode, blankNode, literal, quad, defaultGraph, triple } = n3_1.DataFactory;
const SIGNATUREONTOLOGYNAMESPACE = 'https://example.org/ns/sign/';
const PACKAGEONTOLOGYNAMESPACE = 'https://example.org/ns/pack/';
exports.SignOntology = {
    NAMESPACE: SIGNATUREONTOLOGYNAMESPACE,
    DataIntegrityProof: SIGNATUREONTOLOGYNAMESPACE + "DataIntegrityProof",
    created: SIGNATUREONTOLOGYNAMESPACE + "created",
    issuer: SIGNATUREONTOLOGYNAMESPACE + "issuer",
    cryptosuite: SIGNATUREONTOLOGYNAMESPACE + "cryptosuite",
    verificationMethod: SIGNATUREONTOLOGYNAMESPACE + "verificationMethod",
    proofPurpose: SIGNATUREONTOLOGYNAMESPACE + "proofPurpose",
    proofValue: SIGNATUREONTOLOGYNAMESPACE + "proofValue",
    contentManipulation: SIGNATUREONTOLOGYNAMESPACE + "contentManipulation",
    target: SIGNATUREONTOLOGYNAMESPACE + "target",
    hashMethod: SIGNATUREONTOLOGYNAMESPACE + "hashMethod",
    canonicalizationMethod: SIGNATUREONTOLOGYNAMESPACE + "canonicalizationMethod",
};
exports.PackOntology = {
    NAMESPACE: PACKAGEONTOLOGYNAMESPACE,
    timestamp: PACKAGEONTOLOGYNAMESPACE + "timestamp",
    origin: PACKAGEONTOLOGYNAMESPACE + "origin",
    issuer: PACKAGEONTOLOGYNAMESPACE + "issuer",
    Dataset: PACKAGEONTOLOGYNAMESPACE + "Dataset",
    contains: PACKAGEONTOLOGYNAMESPACE + "contains",
};
var ContainmentType;
(function (ContainmentType) {
    ContainmentType[ContainmentType["Dataset"] = 0] = "Dataset";
    ContainmentType[ContainmentType["Graph"] = 1] = "Graph";
    ContainmentType[ContainmentType["Other"] = 2] = "Other";
})(ContainmentType || (exports.ContainmentType = ContainmentType = {}));
function checkContainmentType(store, term) {
    if (store.getQuads(null, null, null, term).length !== 0) {
        return ContainmentType.Graph;
    }
    else if (store.getQuads(null, vocab_common_rdf_1.RDF.type, exports.PackOntology.Dataset, null)) {
        return ContainmentType.Dataset;
    }
    return ContainmentType.Other;
}
exports.checkContainmentType = checkContainmentType;
function generateUrnUuid() {
    return n3_1.DataFactory.namedNode(`urn:policy:${(0, uuid_1.v4)()}`);
}
exports.generateUrnUuid = generateUrnUuid;
function getDatasetGraphQuads(store, dataset) {
    if (!store.getQuads(dataset, vocab_common_rdf_1.RDF.type, exports.PackOntology.Dataset, null).length) {
        throw new Error('Incorrect dataset reference passed for given store.');
    }
    const graphIds = store.getQuads(dataset, exports.PackOntology.contains, null, null).map(quad => quad.object);
    let quads = [];
    for (let graphId of graphIds) {
        quads = quads.concat(store.getQuads(null, null, null, graphId));
    }
    return quads;
}
exports.getDatasetGraphQuads = getDatasetGraphQuads;
function createRDFList(terms) {
    const quads = [];
    let list;
    let first;
    let rest = namedNode(vocab_common_rdf_1.RDF.nil);
    for (let i = terms.length - 1; i >= 0; i--) {
        list = blankNode();
        first = terms[i];
        // push rest
        quads.push(quad(list, namedNode(vocab_common_rdf_1.RDF.rest), rest));
        // push first
        quads.push(quad(list, namedNode(vocab_common_rdf_1.RDF.first), first));
        rest = list;
    }
    return { subject: list, quads: quads, };
}
exports.createRDFList = createRDFList;

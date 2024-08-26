import { RDF } from "@inrupt/vocab-common-rdf";
import { DataFactory, Quad, Quad_Graph, Store, Term, Triple } from "n3";
import { v4 as uuidv4 } from 'uuid';
import { renameGraph } from "../package/package";

const { namedNode, blankNode, literal, quad, defaultGraph, triple } = DataFactory;

export const RDFDatasetURI = RDF.NAMESPACE+"Dataset"
export const RDFContainsURI = RDF.NAMESPACE+"contains"
const SIGNATUREONTOLOGYNAMESPACE = 'https://example.org/ns/sign/'
const PACKAGEONTOLOGYNAMESPACE= 'https://example.org/ns/pack/'

export const SignOntology = {
    NAMESPACE: SIGNATUREONTOLOGYNAMESPACE,
    DataIntegrityProof: SIGNATUREONTOLOGYNAMESPACE+"DataIntegrityProof",
    created:  SIGNATUREONTOLOGYNAMESPACE+"created",
    issuer:  SIGNATUREONTOLOGYNAMESPACE+"issuer",
    cryptosuite:  SIGNATUREONTOLOGYNAMESPACE+"cryptosuite",
    verificationMethod:  SIGNATUREONTOLOGYNAMESPACE+"verificationMethod",
    proofPurpose:  SIGNATUREONTOLOGYNAMESPACE+"proofPurpose",
    proofValue:  SIGNATUREONTOLOGYNAMESPACE+"proofValue",
    contentManipulation:  SIGNATUREONTOLOGYNAMESPACE+"contentManipulation",
    target:  SIGNATUREONTOLOGYNAMESPACE+"target",
    hashMethod:  SIGNATUREONTOLOGYNAMESPACE+"hashMethod",
    canonicalizationMethod: SIGNATUREONTOLOGYNAMESPACE+"canonicalizationMethod",
}

export const PackOntology = {
    NAMESPACE: PACKAGEONTOLOGYNAMESPACE,
    timestamp: PACKAGEONTOLOGYNAMESPACE+"timestamp",
    origin: PACKAGEONTOLOGYNAMESPACE+"origin",
    issuer: PACKAGEONTOLOGYNAMESPACE+"issuer",
}

export enum ContainmentType {
    Dataset,
    Graph,
    Other
}

export function checkContainmentType(store: Store, term: Term): ContainmentType {
    if (store.getQuads(null, null, null, term).length !== 0) {
        return ContainmentType.Graph
    } else if (store.getQuads(null, RDF.type, RDFDatasetURI, null)) {
        return ContainmentType.Dataset
    }
    return ContainmentType.Other
}

export function generateUrnUuid() {
    return DataFactory.namedNode(`urn:policy:${uuidv4()}`)
}
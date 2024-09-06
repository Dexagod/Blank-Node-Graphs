import { getResourceAsQuadArray, getResourceAsStore } from "@dexagod/rdf-retrieval";
import { importKey, signParams, verifyQuads } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto";
import { SignatureInfo } from "./sign";
import { Quad, Store, NamedNode, Quad_Object, Term } from "n3";
import { checkContainmentType, ContainmentType, getDatasetGraphQuads, SignOntology, VerificationOntology } from "../util/util";
import { RDF, XSD } from "@inrupt/vocab-common-rdf";

import { DataFactory } from "n3"

let bnverifyCounter = 0

const blankNode = () => DataFactory.blankNode(`n3-v-${bnverifyCounter+=1}}`);

const { namedNode, quad, triple, literal } = DataFactory

export type VerificationResult = {
    result: boolean,
    target: Quad_Object,
    issuer: Quad_Object,
    errorMessage?: string,
    verifiedContents?: NamedNode | Quad[]
}

export async function verifyAllSignatures(store: Store): Promise<VerificationResult[]> {

    const signatureSubjects = store.getQuads(null, namedNode(RDF.type), SignOntology.DataIntegrityProof, null).map(q => q.subject)
    const signatureInfoList: SignatureInfo[] = []
    for (let subject of signatureSubjects) {
        const contentManipulationSubject = store.getQuads(subject, namedNode(SignOntology.contentManipulation), null, null)[0].object
        signatureInfoList.push({
            issuer: store.getQuads(subject, namedNode(SignOntology.issuer), null, null)[0].object,
            proofValue: store.getQuads(subject, namedNode(SignOntology.proofValue), null, null)[0].object.value,
            verificationMethod: store.getQuads(subject, namedNode(SignOntology.verificationMethod), null, null)[0].object.value,
            cryptoSuite: store.getQuads(subject, namedNode(SignOntology.cryptosuite), null, null)[0].object.value,
            target: store.getQuads(subject, namedNode(SignOntology.target), null, null)[0].object,
            hashMethod: store.getQuads(contentManipulationSubject, namedNode(SignOntology.hashMethod), null, null)[0].object.value,
            canonicalizationMethod: store.getQuads(contentManipulationSubject, namedNode(SignOntology.canonicalizationMethod), null, null)[0]?.object.value,
        })
    }

    let verificationResults: Promise<VerificationResult>[] = []

    for (let signatureInfo of signatureInfoList) {
        verificationResults.push(verifySignature(store, signatureInfo))
    }    

    let awaitedResults = Promise.all(verificationResults)
    return awaitedResults
}

export async function verifySignature(store: Store, info: SignatureInfo): Promise<VerificationResult> {
    const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info
    
    if (target.termType === 'Variable' || target.termType === "Literal") {
        throw new Error('Signature targets must be either blank node or named nodes.')
    }

    if (target.termType === 'BlankNode') {
        // Blank node targets means that our signature target graph or dataset is fully contained in the local scope.
        let quads = []
        const containmentType = checkContainmentType(store, target);
        if (containmentType === ContainmentType.Dataset) {
            quads = getDatasetGraphQuads(store, target)
        } else if(containmentType === ContainmentType.Graph){
            quads = store.getQuads(null, null, null, target)
        } else {
            throw new Error('Signature target must be either a graph or dataset when signature target is a blank node.')
        }
        return await verifyRDFContentSignature(quads, info);
    } else {
        // Named node targets means that our signature target graph or dataset are scoped to the remote scope defined by the URI domain.
        let isRDF = true
        let resourceStore: Store | undefined;
        try {
            resourceStore = await getResourceAsStore(target.value);
        } catch (eVerifyBufferContentSignature) {
            isRDF = false
        }
        
        if (isRDF && resourceStore) {
            // Blank node targets means that our signature target graph or dataset is fully contained in the local scope.
            let quads = []
            const containmentType = checkContainmentType(resourceStore, target);
            if (containmentType === ContainmentType.Dataset) {
                quads = getDatasetGraphQuads(store, target)
            } else if(containmentType === ContainmentType.Graph){
                quads = store.getQuads(null, null, null, target)
            } else {
                throw new Error('Signature target must be either a graph or dataset when signature target is a blank node.')
            }
            return await verifyRDFContentSignature(quads, info);
        } else {
            const resource = await fetch(target.value);
            const buffer = Buffer.from(await resource.arrayBuffer())
            return await verifyBufferContentSignature(buffer, info)
        }
    }
}

/**
 * Verifies signature to hash of all quads passed in the quads parameter.
 * @param quads 
 * @param info 
 * @returns 
 */
async function verifyRDFContentSignature(quads: Quad[], info: SignatureInfo): Promise<VerificationResult> {
    const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info
    if (canonicalizationMethod !== "c14n") {
        throw new Error('Currently this package only supports canonicalization of RDF with the c14n algorithm.')
    }
    
    try {
        const publicKey = await getPublicKeyFromVerificationMethod(verificationMethod)
        const result = await verifyQuads(quads, proofValue, publicKey)
        console.log()
        console.log('results', result, info, "publickey", publicKey)
        return ({
            result,
            target: info.target,
            issuer: info.issuer,
            verifiedContents: quads
        })
    } catch (e: unknown) {
        return {
            result: false,
            target: info.target,
            issuer: info.issuer,
            errorMessage: (e as Error).message
        }
    }
}

async function verifyBufferContentSignature(buffer: Buffer, info: SignatureInfo): Promise<VerificationResult> {
    const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info
    try {
        const hash = await webcrypto.subtle.digest(hashMethod, buffer);
        const publicKey = await getPublicKeyFromVerificationMethod(verificationMethod)
        const result = await webcrypto.subtle.verify(
            signParams,
            publicKey,    
            Buffer.from(proofValue, 'base64'),
            hash,
        );
        return ({
            result,
            target,
            issuer,
            verifiedContents: target as NamedNode
        })
    } catch (e: unknown) {
        return {
            result: false,
            target,
            issuer,
            errorMessage: (e as Error).message
        }
    }
}

async function getPublicKeyFromVerificationMethod(verificationMethod: string) {
    const publicKeyString = await( await fetch(verificationMethod)).text()
    return await importKey(publicKeyString)
}

export async function generateVerificationTriplesFromVerificationResult(result: VerificationResult, trustedToken?: string) {    
    const subj = blankNode()
    const triples = [
        triple(subj, namedNode(RDF.type), namedNode(VerificationOntology.VerificationStatus)),
        triple(subj, namedNode(VerificationOntology.status), literal(result.result.toString(), namedNode(XSD.boolean))),
        triple(subj, namedNode(VerificationOntology.verifies), result.target),
        triple(subj, namedNode(VerificationOntology.issuer), result.issuer),
    ]
    if(trustedToken) triples.push(triple(subj, namedNode(VerificationOntology.trustedToken), literal(trustedToken)))
}
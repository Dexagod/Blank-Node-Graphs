import { getResourceAsQuadArray, getResourceAsStore } from "@dexagod/rdf-retrieval";
import { importKey, signParams, verifyQuads } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto";
import { SignatureInfo } from "./sign";
import { Quad, Store } from "n3";
import { checkContainmentType, ContainmentType, getDatasetGraphQuads } from "../util/util";

export async function verifySignature(store: Store, info: SignatureInfo) {
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
        let isRDF = true
        let resourceStore: Store | undefined;
        try {
            resourceStore = await getResourceAsStore(target.value);
        } catch (e) {
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

        // Named node targets means that our signature target graph or dataset are scoped to the remote scope defined by the URI domain.
    }

}

/**
 * Verifies signature to hash of all quads passed in the quads parameter.
 * @param quads 
 * @param info 
 * @returns 
 */
async function verifyRDFContentSignature(quads: Quad[], info: SignatureInfo) {
    const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info
    if (canonicalizationMethod !== "c14n") {
        throw new Error('Currently this package only supports canonicalization of RDF with the c14n algorithm.')
    }
    const publicKey = await getPublicKeyFromVerificationMethod(verificationMethod)
    return await verifyQuads(quads, proofValue, publicKey)
}

async function verifyBufferContentSignature(buffer: Buffer, info: SignatureInfo) {
    const { issuer, proofValue, verificationMethod, cryptoSuite, target, hashMethod, canonicalizationMethod } = info
    const hash = await webcrypto.subtle.digest(hashMethod, buffer);
    const publicKey = await getPublicKeyFromVerificationMethod(verificationMethod)
    const verification = await webcrypto.subtle.verify(
        signParams,
        publicKey,    
        buffer,
        hash,
    );
}

async function getPublicKeyFromVerificationMethod(verificationMethod: string) {
    const publicKeyString = await( await fetch(verificationMethod)).text()
    return await importKey(publicKeyString)
}
import { generateKeyPair, exportPrivateKey, importPrivateKey, exportKey, importKey } from "@jeswr/rdfjs-sign/dist";
import { sign, webcrypto } from "crypto";
import moment, { Moment } from "moment"
import { addSignatureGraphToStore, createRemoteResourceSignature, createSignatureTriples } from "./signature/sign";
import { Store } from "n3";
import { verifyAllSignatures, verifySignature } from "./signature/verify";
import { createRDFList } from "./util/util";
import { serializeTrigFromStore } from "./util/trigUtils";
import { createSimplePolicy } from "./example/policy";

import { DataFactory } from "./";



async function signImage(imageURL: string) {
    // const s = "teststring"
    // webcrypto.subtle.digest("SHA-512", s)
    // webcrypto.subtle.generateK.createHash('sha512').update('my string for hashing').digest('hex');

    let img = await fetch(imageURL)
    let imgBuffer = Buffer.from(await img.arrayBuffer())
    
    const hash = await webcrypto.subtle.digest("SHA-512", imgBuffer)
    console.log(hash)

    const publicKeyResource = "https://pod.rubendedecker.be/keys/test_public"
    const privateKeyResource = "https://pod.rubendedecker.be/keys/test_private"
    // Testing key retrieval for myself
    const publicKeyText = await (await fetch(publicKeyResource)).text()
    const privateKeyJSON = await (await fetch(privateKeyResource)).json()
    
    const publicKey = await importKey((publicKeyText))
    const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)
    
    const keyParams = {
        name: 'ECDSA',
        namedCurve: 'P-384',
    };
  
    const signParams = {
        name: keyParams.name,
        hash: 'SHA-512',
    };

    const signature = (await webcrypto.subtle.sign(signParams, privateKey, hash))
    const signatureString = Buffer.from(signature).toString('base64')

    const verification = await webcrypto.subtle.verify(
        signParams,
        await publicKey,
        Buffer.from(signatureString, 'base64'),
        hash,
    );

    let store = new Store();
    const rubenImageSignatureInfo = await createRemoteResourceSignature("https://pod.rubendedecker.be/profile/image.png", { privateKey, issuer: DataFactory.namedNode("https://pod.rubendedecker.be/profile/card"), verificationMethod: publicKeyResource})
    const rubenImageSignatureTriples = createSignatureTriples(rubenImageSignatureInfo).triples
    const rubenImageSignatureGraph = addSignatureGraphToStore(store, rubenImageSignatureTriples).graph

    // create buffer from resource contents
    let content = await fetch("https://pod.rubendedecker.be/profile/image.png")
    let contentBuffer = Buffer.from(await content.arrayBuffer())
    // hash content buffer using SHA-512
    const hash2 = await webcrypto.subtle.digest(signParams.hash, contentBuffer)    
    const signature2 = (await webcrypto.subtle.sign(signParams, privateKey, hash2))
    const signatureString2 = Buffer.from(signature2).toString('base64')
    
    const results = await verifyAllSignatures(store)
    console.log(results)
      

}


async function test () {


    const p = await createSimplePolicy({ target: DataFactory.namedNode('http://example.org'), duration: "P1M", purpose: ['testA', 'testB', 'testC'] } )
    const s2 = new Store()
    s2.addQuads(p.triples)
    console.log()
    console.log(await serializeTrigFromStore(s2))

}

test()

// signImage("https://pod.rubendedecker.be/profile/image.png")


import { importKey, importPrivateKey } from "@jeswr/rdfjs-sign/dist";
import { serializeTrigFromStore, SignatureOptions } from "../../software/src";
import { Builder, PublicSignatureOptions } from "./builder/Builder";
import { webcrypto } from "crypto"
import { Evaluator } from "./evaluator/Evaluator";
import { DataFactory } from "../../software/src";

const DPV = "https://w3id.org/dpv#";

async function test() {

    const publicKeyResource = "https://pod.rubendedecker.be/keys/test_public"
    const privateKeyResource = "https://pod.rubendedecker.be/keys/test_private"
    const privateKeyJSON = await (await fetch(privateKeyResource)).json()
    const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)
    const issuer = "https://pod.rubendedecker.be/profile/card#me"

    const target = "https://pod.rubendedecker.be/profile/card"

    const signatureOptions: PublicSignatureOptions = {
        privateKey, 
        issuer,
        verificationMethod: publicKeyResource
    }
    const provenanceOptions = { origin: target }
    const policyOptions = { duration: "P1D", purpose: [ DPV+"NonCommercialPurpose", DPV+"ServicePersonalisation", DPV+"ServiceProvision"] }

    const store = await new Builder(signatureOptions)
        // start new session
        .startSession()
        // load RDF resource
        .loadRDF(target)
        // sign predicates in latest loaded RDF resource
        .signPredicates(['http://xmlns.com/foaf/0.1/img'])
        // sign external resource
        .signExternal('https://www.rubendedecker.be')
        // // wrap all generated graphs in a dataset
        .dataset()
        // // add provenance to dataset
        .provenance(provenanceOptions)
        // // add policy info to dataset
        .policy(policyOptions)
        // // add siganture to dataset
        .sign()
        // // wrap metadata in dataset
        .dataset()
        // // sign metadata dataset
        .sign()
        // run all operations, and commit result to store
        .commit();

    const result = await serializeTrigFromStore(store)
    
    console.log()
    console.log('OUTPUT')
    console.log()
    
    console.log(result)

    console.log(
`

#######################################
#############Evaluation################
#######################################

`   )


    const evaluator = new Evaluator("EVALUATOR_TRUST_TOKEN")
    const evaluatorStore = await evaluator.startSession()
        .loadRDF(store.getQuads(null, null, null, null))
        .evaluateSignatures({trustedIssuers: ['https://pod.rubendedecker.be/profile/card#me']})
        .evaluateProvenance({ requireTrusted: true, retrievedBy: ['https://pod.rubendedecker.be/profile/card#me']})
        .commit()

    const result2 = await serializeTrigFromStore(evaluatorStore)

    console.log()
    console.log('OUTPUT')
    console.log()

    console.log(result2)
}

test()
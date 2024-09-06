import { importKey, importPrivateKey } from "@jeswr/rdfjs-sign/dist";
import { serializeTrigFromStore, SignatureOptions } from "../../software/src";
import { Builder, PublicSignatureOptions } from "./builder/Builder";
import { webcrypto } from "crypto"
import { Evaluator } from "./evaluator/Evaluator";
import { DataFactory } from "../../software/src";
import { LDESBuilder } from "./builder/LDESBuilder";
import { FOAF, RDF } from "@inrupt/vocab-common-rdf";


const DPV = "https://w3id.org/dpv#";

const { namedNode, blankNode, literal, quad, triple } = DataFactory

async function test() {


    const ldesProfile = "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/profile.ttl"
    const ldesPublic = "https://pod.rubendedecker.be/keys/test_ldes_public"
    const ldesPrivate = "https://pod.rubendedecker.be/keys/test_ldes_private"
    const ldesPrivateJSON = await (await fetch(ldesPrivate)).json()
    const ldesPrivateKey = await importPrivateKey(ldesPrivateJSON as webcrypto.JsonWebKey)

    const ldesSignOptions: PublicSignatureOptions = {
        privateKey: ldesPrivateKey, 
        issuer: ldesProfile,
        verificationMethod: ldesPublic
    }
    
    const rubenProfile = "https://pod.rubendedecker.be/profile/card#me"
    const rubenPublic = "https://pod.rubendedecker.be/keys/test_public"
    const rubenPrivate = "https://pod.rubendedecker.be/keys/test_private"
    const rubenPrivateJSON = await (await fetch(rubenPrivate)).json()
    const rubenPrivateKey = await importPrivateKey(rubenPrivateJSON as webcrypto.JsonWebKey)
    
    const rubenSignOptions: PublicSignatureOptions = {
        privateKey: rubenPrivateKey, 
        issuer: rubenProfile,
        verificationMethod: rubenPublic
    }

    const josProfile = "https://josd.github.io/card.ttl#me"
    const josPublic = "https://pod.rubendedecker.be/keys/test_jos_public"
    const josPrivate = "https://pod.rubendedecker.be/keys/test_jos_private"
    const josPrivateJSON = await (await fetch(josPrivate)).json()
    const josPrivateKey = await importPrivateKey(josPrivateJSON as webcrypto.JsonWebKey)

    const josSignOptions: PublicSignatureOptions = {
        privateKey: josPrivateKey, 
        issuer: josProfile,
        verificationMethod: josPublic
    }


    const builder = await new LDESBuilder('https://pod.rubendedecker.be/scholar/ldes/', 'page', ldesSignOptions)


        // build a member Ruben
        builder.buildMember()
            .setMemberContents([ 
                quad(namedNode('https://pod.rubendedecker.be/profile/card#me'), namedNode(FOAF.name), literal('Ruben'), blankNode('RubenProfileGraph')),
                quad(namedNode('https://pod.rubendedecker.be/profile/card#me'), namedNode(FOAF.name), literal('Dexa'), blankNode('RubenSecondaryProfile')) 
            ])
            .setMemberProvenance({origin: "https://pod.rubendedecker.be/profile/card"})
            .setMemberPolicy({duration: "P1D", purpose: [DPV+"ServiceProvision", DPV+"ServicePersonalisation"]})
            .setMemberSignature(rubenSignOptions)
            .commitMember();


        // build a member Jos
        builder.buildMember()
            .setMemberContents([ 
                quad(namedNode('https://josd.github.io/card.ttl#me'), namedNode(FOAF.name), literal('Jos')),
            ])
            .setMemberProvenance({origin: "https://josd.github.io/card.ttl"})
            .setMemberPolicy({duration: "P1M", purpose: [DPV+"ServiceProvision"]})
            .setMemberSignature(josSignOptions)
            .commitMember();

        const page = await builder.commitPage()


        console.log(``)
        console.log(`Content for ${page.url}`)
        console.log(``)
        console.log(`#####################`)
        console.log(``)
        console.log(``)
        console.log(page.trig)

    process.exit() 
    // Idk but it hangs a second or 2 after evaluating everything instantly. 
    // No clue where I have a leaking promise waiting, or if it's some ts-node shenanigans
}

test()
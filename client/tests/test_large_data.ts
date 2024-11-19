import { importKey, importPrivateKey } from "@jeswr/rdfjs-sign/dist";
import { serializeTrigFromStore, SignatureOptions } from "../../software/src";
import { Builder, PublicSignatureOptions } from "../src/builder/Builder";
import { webcrypto } from "crypto"
import { Evaluator } from "../src/evaluator/Evaluator";
import { DataFactory } from "../../software/src";
import { LDESBuilder } from "../src/builder/LDESBuilder";
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

    const randomEntity = () => `http://example.org/ns/entity/${(Math.random() + 1).toString(36).substring(7)}`
    const randomName = () => `${(Math.random() + 1).toString(36).substring(7)}`
    const randomGraph = () => `${(Math.random() + 1).toString(36).substring(2)}`

    const o1 = "https://pod.rubendedecker.be/"
    const o2 = "https://josd.github.io/"
    const p1 = DPV+"ServiceProvision"
    const p2 = DPV+"ServicePersonalisation"
    const p3 = DPV+"NonCommercialPurpose"

    const randomItem = (items: any[]) => items[Math.floor(Math.random() * items.length)];

    const builder = await new LDESBuilder('https://pod.rubendedecker.be/scholar/ldes2/', 'page', ldesSignOptions)

    for (let i = 0; i < 100; i++) {

        builder.buildMember()
            const memberQuads = []
            for (let i = 0; i < Math.floor(Math.random()*5) + 1; i++) {
                memberQuads.push(
                    quad(namedNode(randomEntity()), namedNode('http://example.org/ns/hasNumber'), literal(randomName()), blankNode(randomGraph()))
                )
            }
            
            const setProv = Math.random() < 0.5
            const setPol = Math.random() < 0.5
            const setSign = Math.random() < 0.5
            const wrapContent = (setProv || setPol || setSign)
            builder.setMemberContents(memberQuads, wrapContent)
            
            if (setProv) {
                builder.setMemberProvenance({origin: randomItem([o1, o2])})
            }
            if (setPol) {
                builder.setMemberPolicy({
                    duration: `P${Math.floor(Math.random()*7) + 1}D`, 
                    purpose: [randomItem([p1, p2, p3])]
                })
            }
            if (setSign) {
                builder.setMemberSignature(randomItem([rubenSignOptions, josSignOptions]))
            }
            
            builder.commitMember();

    }
        
    const page = await builder.commitPage()


    // console.log(``)
    // console.log(`Content for ${page.url}`)
    // console.log(``)
    // console.log(`#####################`)
    // console.log(``)
    // console.log(``)
    console.log(page.trig)

    process.exit() 
    // Idk but it hangs a second or 2 after evaluating everything instantly. 
    // No clue where I have a leaking promise waiting, or if it's some ts-node shenanigans
}

test()
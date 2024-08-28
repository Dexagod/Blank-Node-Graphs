import express from "express"
import http from "http"
import request from "request"
import { addPolicyGraphToStore, addProvenanceGraphToStore, addSignatureGraphToStore, createDatasetFromGraphsInStore, createProvenanceTriples, createRDFDatasetSignature, createRemoteRDFSignature, createRemoteResourceSignature, createSignatureTriples, createSimplePolicy, renameGraph, serializeTrigFromStore } from "../../software/src/"
import { getResourceAsStore } from "@dexagod/rdf-retrieval";
import { DataFactory, Quad_Object, Store } from "n3";
import { importKey, importPrivateKey } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto"

import { program } from "commander"

const DPV = "https://w3id.org/dpv#";

const acceptedRDFContentTypes = [
	"application/trig",
	"application/n-quads",
	"text/turtle",
	"application/n-triples",
	"text/n3",
	"application/ld+json",
	"application/rdf+xml",
]

program
  .name('rdf containment proxy')
  .description('Setup a proxy server that provides RDF metadata on retrieval of RDF resources')
  .version('0.1.0');

program.command('setup')
  .description('Setup the proxy')
  .option('-p, --port <number>', 'port number to host proxy')
  .option('-s, --signature-predicates [predicates...]')
  .action((options) => {
    let {port, signaturePredicates} = options
    
    port = port || 8080
    signaturePredicates = signaturePredicates || []
    startProxy(port, signaturePredicates)
  });


program.parse(process.argv);

async function startProxy(port: number, signaturePredicates: string[]) {

    const app = express();

    /* your app config here */
    app.get('/', async function(req,res) {
        //modify the url in any way you want
        try {
            var requestUrl = req.query.url as string | undefined;
            console.log("retrieving", requestUrl)
            if(!requestUrl) return;
            
            if (await isRDFResource(requestUrl)){
                const updatedContent = await processRDFResource(requestUrl, signaturePredicates)
                res.setHeader('Content-Type', 'application/trig')
                res.send(updatedContent)
            } else {
                request(requestUrl).pipe(res);
            }  
        } catch (e) {
            console.error(e)
            res.status(500)
            res.send(`something went wrong: \n${(e as Error).message}`)
        }
    });

    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}

async function generateDefaultPolicy(target: Quad_Object) {
	return createSimplePolicy({
        target, 
        duration: "P7D", 
        purpose: [
            DPV+"NonCommercialPurpose", 
            DPV+"ServicePersonalisation", 
            DPV+"ServiceProvision"
        ]
    })
}

async function processRDFResource(url: string, singPredicates: string[]) {


    // Fix key stuff here because of async requirement
    const publicKeyResource = "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/test_public"
    const privateKeyResource = "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/test_public"

    // Testing key retrieval for myself
    // const publicKeyText = await (await fetch(publicKeyResource)).text()
    const privateKeyJSON = await (await fetch(privateKeyResource)).json()

    const issuer = "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/profile#me"

    // const publicKey = await importKey(publicKeyText)
    const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)

    const signatureOptions = {
        issuer,
        privateKey, 
        verificationMethod: publicKeyResource
    }


    // function
    const resourceUrl = getTargetResourceURI(url)
    console.log("processing", resourceUrl)

	const store = await getResourceAsStore(resourceUrl) as Store;
	renameGraph(store, DataFactory.defaultGraph())
	
    const signatureWaitList: Promise<void>[] = []
    console.log(singPredicates)
	for (let quad of store.getQuads(null, null, null, null)) {
		if (singPredicates.includes(quad.predicate.value)) {
            const targetResource = getTargetResourceURI(quad.object.value)
            if (await isRDFResource(targetResource)) {
                const p = new Promise<void>(async (resolve, reject) => {
                    const signatureInfo = await createRemoteRDFSignature(targetResource, signatureOptions)
                    const signatureTriples = createSignatureTriples(signatureInfo)
                    await addSignatureGraphToStore(store, signatureTriples.triples)
                    console.log('created RDF signature for', targetResource)
                    resolve()
                })
                signatureWaitList.push(p)
                
                
            } else {
                const p = new Promise<void>(async (resolve, reject) => {
                    const signatureInfo = await createRemoteResourceSignature(targetResource, signatureOptions)
                    const signatureTriples = createSignatureTriples(signatureInfo)
                    await addSignatureGraphToStore(store, signatureTriples.triples)
                    console.log('created resource signature for', targetResource)
                })
                signatureWaitList.push(p)
            }
		}
	}
    Promise.all(signatureWaitList)
	
    // Create dataset from all contents and signatures about content references
	let contentGraphs = store.getGraphs(null, null, null)
	let datasetId = createDatasetFromGraphsInStore(store, contentGraphs).id

    // Create a default policy over this content dataset
	const policy = await generateDefaultPolicy(datasetId)
	const policyGraph = addPolicyGraphToStore(store, policy.triples).graph
    // Create provenance over this content dataset 
	const provenance = await createProvenanceTriples({
        origin: resourceUrl, 
        issuer: issuer,
        target: datasetId
    })
    const provenanceGraph = addProvenanceGraphToStore(store, provenance.triples).graph
    // Create a signature over this content dataset
    const signatureInfo = await createRDFDatasetSignature(store, datasetId, signatureOptions)
    const signatureTriples = createSignatureTriples(signatureInfo)
    const signatureGraph = await addSignatureGraphToStore(store, signatureTriples.triples).graph

    // Wrap in metadata dataset
    const metadataDatasetId = createDatasetFromGraphsInStore(store, [policyGraph, provenanceGraph, signatureGraph]).id

    // Sign metadata dataset
    const metadataSignatureInfo = await createRDFDatasetSignature(store, metadataDatasetId, signatureOptions)
    const metadataSignatureTriples = createSignatureTriples(metadataSignatureInfo)
    const metadataSignatureGraph = await addSignatureGraphToStore(store, metadataSignatureTriples.triples).graph
	
	// Content manipuation is complete
    const output = await serializeTrigFromStore(store)

    return output
}



// * standardized resource format:
// * 
// * _:orig_content_dataset a pack:Dataset;
// *      pack:contains _:g1, _:g2.
// * 
// * _:orig_g1 { contentGrapg1 }
// * _:orig_g2 { contentGrapg2 }
// * 
// * _:orig_s1 { 
// *      _:s a sign:IntegrityProof ;
// *          sign:target _:orig_content_dataset.
// * }


async function isRDFResource(url: string) {
	const head = await fetch(url, {method: "HEAD"})
    const contentTypeHeader = head.headers.get('Content-Type') || "text/turtle"
    const breakpoint = /;\s*charset=/
    const contentType = contentTypeHeader?.split(breakpoint)[0]
    const charset = contentTypeHeader?.split(breakpoint)[1]
	return !!contentType && acceptedRDFContentTypes.includes(contentType)
}

function getTargetResourceURI(target: string) {
    return target.split('#')[0].split('?')[0]
}
import express from "express"
import http from "http"
import request from "request"
import { addPolicyGraphToStore, addProvenanceGraphToStore, addSignatureGraphToStore, createDatasetFromGraphsInStore, createProvenanceTriples, createRDFDatasetSignature, createRemoteRDFSignature, createRemoteResourceSignature, createSignatureTriples, createSimplePolicy, renameGraph, serializeTrigFromStore, SignatureInfo, SignatureOptions } from "../../software/src/"
import { getResourceAsStore } from "@dexagod/rdf-retrieval";
import { Quad_Object, Store, BlankNode, NamedNode, Quad_Graph } from "n3";
import { importKey, importPrivateKey } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto"

import { program } from "commander"
import { createLogger, LogEntry } from "winston";
import { Console } from "winston/lib/winston/transports"

import { DataFactory } from "../../software/src";
const { namedNode, blankNode, literal, quad, triple, defaultGraph } = DataFactory

const logLevel = process.env.LOG_LEVEL
const logger = createLogger({ level: logLevel || 'info', transports: [ new (Console)() ]})

export function log(entry: LogEntry) { logger.log(entry) }

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
  .option('-c, --canonicalize-remote-resources', 'canonicalize remote RDF resources before signing (can be extremely slow!)', false)
  .option('-s, --signature-predicates [predicates...]')
  .option('--public-key <url>, "Public key to add as signature verification method (note that we only allow keys generated usign @jeswr/rdf-sign)')
  .option('--private-key <url>, "Private key to create signatures (note that we only allow keys generated usign @jeswr/rdf-sign)')
  .option('--issuer <url>, "Issuer for signatures, policies and metadata')
  .action(async (options) => {
    let {port, canonicalizeRemoteResources, signaturePredicates} = options
    
    port = port || 8080
    signaturePredicates = signaturePredicates || []

    // Fix key stuff here because of async requirement
    const publicKeyResource = options.publicKey || "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/test_public"
    const privateKeyResource = options.privateKey || "https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/test_private"

    // Testing key retrieval for myself
    // const publicKeyText = await (await fetch(publicKeyResource)).text()
    const privateKeyJSON = await (await fetch(privateKeyResource)).json()

    const issuer = options.issuer 
        ? namedNode(options.issuer)
        : namedNode("https://raw.githubusercontent.com/Dexagod/RDF-containment/main/keys/profile.ttl#me")

    // const publicKey = await importKey(publicKeyText)
    const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)

    const signatureOptions: SignatureOptions = {
        issuer,
        privateKey, 
        verificationMethod: publicKeyResource
    }


    startProxy(port, signaturePredicates, canonicalizeRemoteResources, signatureOptions)
  });


program.parse(process.argv);

async function startProxy(port: number, signaturePredicates: string[], canonicalizeRemoteResources: boolean, signatureOptions: SignatureOptions) {

    const app = express();

    /* your app config here */
    app.get('/', async function(req,res) {
        //modify the url in any way you want
        try {
            var requestUrl = req.query.url as string | undefined;
            log({level: "verbose", message: `Retrieving URL ${requestUrl}`})
            if(!requestUrl) return;
            
            if (await isRDFResource(requestUrl)){
                const updatedContent = await processRDFResource(requestUrl, signaturePredicates, canonicalizeRemoteResources, signatureOptions)
                res.setHeader('Content-Type', 'application/trig')
                res.send(updatedContent)
            } else {
                request(requestUrl).pipe(res);
            }  
        } catch (e) {
            log({level: "error", message: (e as Error).message })
            res.status(500)
            res.send(`something went wrong: \n${(e as Error).message}`)
        }
    });

    app.listen(port, () => {
        log({level: "info", message: `[server]: Server is running at http://localhost:${port}`})
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

async function processRDFResource(url: string, singPredicates: string[], canonicalizeRemoteResources: boolean, signatureOptions: SignatureOptions) {


    // function
    const resourceUrl = getTargetResourceURI(url)

	const store = await getResourceAsStore(resourceUrl) as Store;
	renameGraph(store, defaultGraph())
	
    const signatureWaitList: Promise<any>[] = []
	for (let quad of store.getQuads(null, null, null, null)) {
		if (singPredicates.includes(quad.predicate.value)) {
            const targetResource = getTargetResourceURI(quad.object.value)
            if (canonicalizeRemoteResources && await isRDFResource(targetResource)) {
                const signatureGraph = tryCreateRemoteRDFResourceSignature(store, targetResource, signatureOptions)
                signatureWaitList.push(signatureGraph)
                // await signatureGraph
            } else {
                const signatureGraph = tryCreateRemoteResourceSignature(store, targetResource, signatureOptions)
                signatureWaitList.push(signatureGraph)
                // await signatureGraph
            }   
        }
    }
    await Promise.all(signatureWaitList)
	
    // Create dataset from all contents and signatures about content references
	let contentGraphs = store.getGraphs(null, null, null)
	let datasetId = createDatasetFromGraphsInStore(store, contentGraphs).id

    // Create a default policy over this content dataset
	const policy = await generateDefaultPolicy(datasetId)
	const policyGraph = addPolicyGraphToStore(store, policy.triples).graph
    // Create provenance over this content dataset 
	const provenance = await createProvenanceTriples({
        origin: namedNode(resourceUrl),
        issuer: issuer,
        target: datasetId
    })
    const provenanceGraph = addProvenanceGraphToStore(store, provenance.triples).graph

    // Create a signature over this content dataset
    const signatureGraph = await tryCreateDatasetSignature(store, datasetId, signatureOptions)
    
    // Wrap in metadata dataset
    let metadataDatasetId: BlankNode;
    if (signatureGraph) metadataDatasetId = createDatasetFromGraphsInStore(store, [policyGraph, provenanceGraph, signatureGraph]).id
    else metadataDatasetId = createDatasetFromGraphsInStore(store, [policyGraph, provenanceGraph]).id

    // Sign metadata dataset
    const metadataSignatureGraph = await tryCreateDatasetSignature(store, metadataDatasetId, signatureOptions)
	
	// Content manipuation is complete
    const output = await serializeTrigFromStore(store)

    return output
}


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

function promiseWithTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutError = new Error('Promise timed out')
  ): Promise<T> {
    // create a promise that rejects in milliseconds
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError);
      }, ms);
    });
  
    // returns a race between timeout and the passed promise
    return Promise.race<T>([promise, timeout]);
}

async function tryCreateSignature(store: Store, promise: Promise<SignatureInfo>, errorMessage: string, target?: string): Promise<Quad_Graph | undefined> {
    return new Promise<Quad_Graph | undefined>(async (resolve, reject) => {
        try {
            const signatureInfo = await promiseWithTimeout(promise, 5000, new Error(errorMessage))
            const signatureTriples = createSignatureTriples(signatureInfo)
            const signatureGraph = addSignatureGraphToStore(store, signatureTriples.triples).graph 
            log({level: "verbose", message: `Generated signature for ${target}`})
            resolve(signatureGraph)
        } catch (e) {
            log({level: "error", message: (e as Error).message })
            resolve(undefined)
        }
    })
}


async function tryCreateDatasetSignature(store: Store, datasetId: Quad_Object, signatureOptions: SignatureOptions): Promise<Quad_Graph | undefined> {
    log({level: "verbose", message: `Generating signature for local dataset ${datasetId.value}`})
    return await tryCreateSignature(
        store, 
        createRDFDatasetSignature(store, datasetId, signatureOptions),
        `Signature generation for dataset ${datasetId} timed out.`,
        datasetId.value
    )
}


async function tryCreateRemoteRDFResourceSignature(store: Store, uri: string, signatureOptions: SignatureOptions): Promise<Quad_Graph | undefined> {
    log({level: "verbose", message: `Generating signature for remote RDF resource ${uri}`})
    return tryCreateSignature(
        store, 
        createRemoteRDFSignature(uri, signatureOptions),
        `Signature generation for ${uri} timed out.`,
        uri
    )
}



async function tryCreateRemoteResourceSignature(store: Store, targetResource: string, signatureOptions: SignatureOptions): Promise<Quad_Graph | undefined> {
    try {
        log({level: "verbose", message: `Generating signature for remote resource ${targetResource}`})
        return tryCreateSignature(
            store, 
            createRemoteResourceSignature(targetResource, signatureOptions),
            `Signature generation for ${targetResource} timed out.`,
            targetResource
        )
    } catch (e) {
        log({level: "error", message: (e as Error).message })
        return undefined
    }
}

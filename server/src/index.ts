import express from "express"
import request from "request"
import { createSimplePolicy, serializeTrigFromStore, SignatureOptions } from "../../software/src/"
import { Quad_Object} from "n3";
import { importPrivateKey } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto"

import { Builder } from "../../client/src/"

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
  .version('0.1.0')
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

    app.post('/', async function(req,res) { req.pipe(res); });
    app.put('/', async function(req,res) { req.pipe(res); });
    app.delete('/', async function(req,res) { req.pipe(res); });
    app.patch('/', async function(req,res) { req.pipe(res); });
    app.options('/', async function(req,res) { req.pipe(res); });
    app.head('/', async function(req,res) { req.pipe(res); });

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

    const publicSignatureOptions = { 
        privateKey: signatureOptions.privateKey,
        issuer: signatureOptions.issuer.value, 
        verificationMethod: signatureOptions.verificationMethod,
    }
    const builder = new Builder(publicSignatureOptions);

    const responseStore = await builder
        .startSession()
        .loadRDF(url, true)
        .signPredicates(singPredicates, canonicalizeRemoteResources)
        .dataset()
        .sign()
        .provenance({origin: url})
        .policy({duration: "P7D", purpose: [DPV+"NonCommercialPurpose", DPV+"ServicePersonalisation", DPV+"ServiceProvision"]})
        .dataset()
        .sign()
        .commit()

    const resultString = serializeTrigFromStore(responseStore, true)
    return resultString
}


async function isRDFResource(url: string) {
	const head = await fetch(url, {method: "HEAD"})
    const contentTypeHeader = head.headers.get('Content-Type') || "text/turtle"
    const breakpoint = /;\s*charset=/
    const contentType = contentTypeHeader?.split(breakpoint)[0]
    const charset = contentTypeHeader?.split(breakpoint)[1]
	return !!contentType && acceptedRDFContentTypes.includes(contentType)
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

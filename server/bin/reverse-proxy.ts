import express from "express"
import request from "request"
import { SignatureOptions } from "../../software/src/"
import { importPrivateKey } from "@jeswr/rdfjs-sign";
import { webcrypto } from "crypto"

import { program } from "commander"

import { DataFactory } from "../../software/src";
import { isRDFResource, log, processRDFResource } from "../src";
const { namedNode, blankNode, literal, quad, triple, defaultGraph } = DataFactory

program
    .name('blank node graph reverse proxy')
    .description('Setup a proxy server that provides RDF metadata on retrieval of RDF resources using blank node graphs')
    .version('0.1.0')
    .argument('<url>', 'local service to be proxied')
    .option('-p, --port <number>', 'port number to host proxy')
    .option('-c, --canonicalize-remote-resources', 'canonicalize remote RDF resources before signing (can be extremely slow!)', false)
    .option('-s, --signature-predicates [predicates...]')
    .option('--public-key <url>, "Public key to add as signature verification method (note that we only allow keys generated usign @jeswr/rdf-sign)')
    .option('--private-key <url>, "Private key to create signatures (note that we only allow keys generated usign @jeswr/rdf-sign)')
    .option('--issuer <url>, "Issuer for signatures, policies and metadata')
    .action(async (url, options) => {
        console.log('params', url, options)
        let {port, canonicalizeRemoteResources, signaturePredicates} = options
        
        port = port || 8081
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


        startProxy(url, port, signaturePredicates, canonicalizeRemoteResources, signatureOptions)
    });


program.parse(process.argv);

async function startProxy(hostname: string, port: number, signaturePredicates: string[], canonicalizeRemoteResources: boolean, signatureOptions: SignatureOptions) {

    const app = express();

    /* your app config here */
    app.get('*', async function(req,res) {

        const target = hostname + req.url
        try {
            log({level: "verbose", message: `Retrieving URL ${target}`})
            if (await isRDFResource(target)){
                const updatedContent = await processRDFResource(target, signaturePredicates, canonicalizeRemoteResources, signatureOptions)
                res.setHeader('Content-Type', 'application/trig')
                res.send(updatedContent)
            } else {    
                const forward = new Request(target)
                for (let header of Object.keys(req.headers)) {
                    if (req.headers[header] && !req.headers[header].length) forward.headers.set(header, req.headers[header] as string) 
                }
                request(forward).pipe(res);
            }  
        } catch (e) {
            log({level: "error", message: (e as Error).message })
            res.status(500)
            res.send(`something went wrong: \n${(e as Error).message}`)
        }
    });

    app.post('*', async function(req,res) { req.pipe(res); });
    app.put('*', async function(req,res) { req.pipe(res); });
    app.delete('*', async function(req,res) { req.pipe(res); });
    app.patch('*', async function(req,res) { req.pipe(res); });
    app.options('*', async function(req,res) { req.pipe(res); });
    app.head('*', async function(req,res) { req.pipe(res); });

    app.listen(port, () => {
        log({level: "info", message: `[server]: Server is running at http://localhost:${port}`})
    });
}
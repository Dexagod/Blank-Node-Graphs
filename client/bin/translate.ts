import { program } from "commander"
import { Evaluator } from "../src/evaluator/Evaluator";
import { getResourceAsQuadArray } from "@dexagod/rdf-retrieval"
import { BlankNode, DefaultGraph, NamedNode, Quad, Quad_Graph, Store } from "n3"
import { Builder, PublicSignatureOptions } from "../src";
import { DataFactory, PackOntology, serializeTrigFromStore, SignatureOptions } from "../../software/src"
import { importPrivateKey } from "@jeswr/rdfjs-sign/dist";
import { webcrypto } from "crypto"

const { namedNode, blankNode, literal, quad, triple, defaultGraph } = DataFactory

const namePredicateDefault = 'https://example.org/ns/what_does_my_graph_name_mean'

program
	.name('Page Translator');

program
    .command('convert')
	.description('Convert RDF content to only contain blank node graphs')
	.version('0.1.0')
	.argument('<url>', 'URL of the packaged RDF resource to convert')
	.option('--name-predicate <predicate>', 'Add graph name as predicate to newly created graph')
	.option('--sign', 'Sign content and metadata (requires issuer, public-key and private-key options to be set)')
	.option('--purpose <purpose...>', 'Add purpose usage control requirement')
	.option('--duration <duration>', 'Add duration usage control requirement')
	.option('--provenance', 'Add provenance metadata')
    .option('--public-key <url>, "Public key to add as signature verification method (note that we only allow keys generated usign @jeswr/rdf-sign)')
    .option('--private-key <url>, "Private key to create signatures (note that we only allow keys generated usign @jeswr/rdf-sign)')
    .option('--issuer <url>, "Issuer for signatures, policies and metadata')
	.action(async (url, options) => {
		
		let builder: Builder;
		let signatureOptions: PublicSignatureOptions | undefined;
		if (options.sign) {
			signatureOptions = await createSignatureOptions(options)
			builder = new Builder(signatureOptions).startSession()
		} else {
			builder = new Builder().startSession()
		}

		builder = builder.loadRDF(url, { retainOriginal: false, namePredicate: options.namePredicate })

		if (!options.sign && !options.purpose && !options.duration && !options.provenance) {
			const store = await builder.commit()
			const text = await serializeTrigFromStore(store, true)
			
			// Write output
			console.log(text)
			return 
		}

		// combine contents to define metadata on collection
		if (options.purpose || options.duration || options.provenance) { builder = builder.dataset() }
		
		if(options.purpose || options.duration) {
			builder = builder.policy({duration: options.duration, purpose: options.purpose, assigner: signatureOptions?.issuer})
		}

		if(options.provenance) { builder = builder.provenance({origin: url}) }

		let store;
		if (options.sign) { 
			store = await builder.signAllAndCommit()
		} else {
			store = await builder.commit()
		}

		const text = await serializeTrigFromStore(store, true)
		
		// Write output
		console.log(text)
		return 
	});


program
	.command('extract')
	.description('Convert RDF content to only contain blank node graphs')
	.version('0.1.0')
	.argument('<url>', 'URL of the resource to revert')
	.argument('<origin>', 'URL of the origin we are trying to rebuild') 
	.option('--name-predicate <predicate>', 'Used predicate to convert graph name to metadata value')
	.option('--verify-signatures <issuer...>', 'Only revert to origin if the signatures verify for one of the given issuers')
	.action(async (url, origin, options) => {
		
		let store: Store;
		const responseStore = new Store() 

		if (options.verifySignatures) {
			store = await new Evaluator()
				.startSession()
				.fetchRDF(url)
				.evaluateSignatures({trustedIssuers: options.verifySignatures})
				.commit()

		} else {
			store = await new Evaluator()
				.startSession()
				.fetchRDF(url)
				.commit()
		}

		const originGraphs = store.getSubjects(namedNode(PackOntology.origin), namedNode(origin), null)
		for (let graph of originGraphs) {
			if (store.getQuads(graph, namedNode(PackOntology.assertedAt), namedNode(origin), null).length) {
				responseStore.addQuads(store.getQuads(null, null, null, graph) .map(q => quad(q.subject, q.predicate, q.object, defaultGraph())))
			} else if ( options.namePredicate && store.getQuads(graph, namedNode(options.namePredicate), null, null).length ) {
				const name = store.getObjects(graph, namedNode(options.namePredicate), null)[0]
				if (name) {
					responseStore.addQuads(store.getQuads(null, null, null, graph) .map(q => quad(q.subject, q.predicate, q.object, name as Quad_Graph)))
				} else {
					console.error('could not find name for given name predicate ')
					const bn = blankNode()
					responseStore.addQuads(store.getQuads(null, null, null, graph) .map(q => quad(q.subject, q.predicate, q.object, bn)))
				}
			} else {
				const bn = blankNode()
				responseStore.addQuads(store.getQuads(null, null, null, graph) .map(q => quad(q.subject, q.predicate, q.object, bn)))
			}
		}

		console.log(await serializeTrigFromStore(responseStore, true))
	});

program.parse(process.argv);




async function createSignatureOptions(options: any) {
	if(!options.privateKey) throw new Error('Missing private key option for generation or evaluation of signature.')
	if(!options.publicKey) throw new Error('Missing public key option for generation or evaluation of signature.')
	if(!options.issuer) throw new Error('Missing issuer option for generation or evaluation of signature.')
	try {// Fix key stuff here because of async requirement
        const publicKeyResource = options.publicKey
        const privateKeyResource = options.privateKey
        const privateKeyJSON = await (await fetch(privateKeyResource)).json()
        const issuer = options.issuer

        const privateKey = await importPrivateKey(privateKeyJSON as webcrypto.JsonWebKey)

        const signatureOptions: PublicSignatureOptions = {
            issuer,
            privateKey, 
            verificationMethod: publicKeyResource
        }

		return signatureOptions
	} catch (e) {
		throw new Error(`Could not generate or evaluate signature: ${(e as Error).message}`)
	}
}
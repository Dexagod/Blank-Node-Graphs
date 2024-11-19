import { program } from "commander"
import { Evaluator } from "../src/evaluator/Evaluator";
import { getResourceAsQuadArray } from "@dexagod/rdf-retrieval"
import { BlankNode, NamedNode, Quad } from "n3"
import { parseTrigToStore, serializeTrigFromStore } from "../../software/src";

const DPV = "https://w3id.org/dpv#";

program
	.name('rdf containment proxy')
	.description('Setup a proxy server that provides RDF metadata on retrieval of RDF resources')
	.version('0.1.0');

program
	.description('Process a packaged RDF body')
	.argument('<url>', 'URL of the packaged RDF resource to retrieve')
	.option('-t, --trusted-verification', 'verify only metadata in signed trusted graphs (except signatures!)')
	.option('-s, --validate-signatures <issuer...>', 'Validate signatures and match with list of trusted issuers')
	.option('-p, --validate-policies <purpose>', 'Validate signatures and check if usable for provided purpose')
	.option('-f, --retrieved-from <origin...>', 'Validate provenance and check if usable for provided purpose')
	.option('-b, --retrieved-by <issuer...>', 'Validate provenance and check if usable for provided purpose')
	.option('-a, --retrieved-after <date>', 'Validate provenance and check if usable for provided purpose')
	.option('--flatten ', 'Flatten trig output by removing graphs where not referenced')

	.action(async (url, options) => {
		if (await isRDFResource(url)) {
			processRDFResource(url, options)
		} else {
			processNonRDFResource(url, options)
		}
	});

	async function processRDFResource (url: string, options: any) {
		let res: Quad[];
		
		try {
			res = await getResourceAsQuadArray(url) as Quad[]
		} catch (e) {
			console.error(`Error retrieving RDF resource located at ${url}: ${(e as Error).message}` )
			return;
		}
        options.retrievedAfter = options.retrievedAfter && new Date(options.retrievedAfter)

		const evaluator = new Evaluator()
		let session = evaluator.startSession().loadRDF(res)
		if(options.validateSignatures) {
            session = session.evaluateSignatures({trustedIssuers: options.validateSignatures})
        }
        if(options.validatePolicies) {
            session = session.evaluatePolicies({ 
                requireTrusted: options.trustedVerification, 
                purpose: options.validatePolicies
            })
        } 
        if(options.retrievedFrom || options.retrievedBy || options.retrievedAfter) {
            session = session.evaluateProvenance({
                requireTrusted: options.trustedVerification,
                retrievedFrom: options.retrievedFrom,
                retrievedBy: options.retrievedBy,
                retrievedAfter: options.retrievedAfter
            })
        }
		const trigString = await session.commitToString(options.Flatten)				
		console.log(trigString)

	}

	async function processNonRDFResource (url: string, options: any) {
		let res: Response;

		try {
			res = await fetch(url)
		} catch (e) {
			console.error(`Error retrieving RDF resource located at ${url}: ${(e as Error).message}` )
			return;
		}
		
		// Temporary fix for local proxy testing
		url = url.replace('http://localhost:8080?url=', '')

		const context = res.headers.get('Meta') as string
		const content = await res.text()

		const store = await parseTrigToStore(context)
		store.addQuad(new Quad(new NamedNode('url'), new NamedNode('is'), new NamedNode('validated'), new NamedNode(url)))

		const contextQuads = (store).getQuads(null, null, null, null);
		
		// tag quad to use same stack to check if context was fulfilled

        options.retrievedAfter = options.retrievedAfter && new Date(options.retrievedAfter)

		const evaluator = new Evaluator()
		let session = evaluator.startSession().loadRDF(contextQuads)
		if(options.validateSignatures) {
            session = session.evaluateSignatures({trustedIssuers: options.validateSignatures})
        }
        if(options.validatePolicies) {
            session = session.evaluatePolicies({ 
                requireTrusted: options.trustedVerification, 
                purpose: options.validatePolicies
            })
        } 
        if(options.retrievedFrom || options.retrievedBy || options.retrievedAfter) {
            session = session.evaluateProvenance({
                requireTrusted: options.trustedVerification,
                retrievedFrom: options.retrievedFrom,
                retrievedBy: options.retrievedBy,
                retrievedAfter: options.retrievedAfter
            })
        }
		const trigString = await session.commitToString(options.Flatten)		
		console.log(trigString)		

		const result = parseTrigToStore(trigString);
		if (result.getQuads(null, null, null, url).length > 0) {
			console.log(trigString)

			console.log(`

______________ Content ______________

`)

			console.log(content)
		}
	}

program.parse(process.argv);




const acceptedRDFContentTypes = [
	"application/trig",
	"application/n-quads",
	"text/turtle",
	"application/n-triples",
	"text/n3",
	"application/ld+json",
	"application/rdf+xml",
]


export async function isRDFResource(url: string) {
	const head = await fetch(url, {method: "HEAD"})
    const contentTypeHeader = head.headers.get('Content-Type') || "text/turtle"
    const breakpoint = /;\s*charset=/
    const contentType = contentTypeHeader?.split(breakpoint)[0]
    const charset = contentTypeHeader?.split(breakpoint)[1]
	return !!contentType && acceptedRDFContentTypes.includes(contentType)
}

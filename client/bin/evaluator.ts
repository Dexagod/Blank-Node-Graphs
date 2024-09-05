import { program } from "commander"
import { Evaluator } from "../src/evaluator/Evaluator";
import { getResourceAsQuadArray } from "@dexagod/rdf-retrieval"
import { Quad } from "n3"

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
		let res: Quad[];
		try {
			res = await getResourceAsQuadArray(url) as Quad[]
			console
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

	});


program.parse(process.argv);

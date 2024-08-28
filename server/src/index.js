"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const request_1 = __importDefault(require("request"));
const src_1 = require("../../software/src/");
const rdf_retrieval_1 = require("@dexagod/rdf-retrieval");
const n3_1 = require("n3");
const rdfjs_sign_1 = require("@jeswr/rdfjs-sign");
const commander_1 = require("commander");
const DPV = "https://w3id.org/dpv#";
const acceptedRDFContentTypes = [
    "application/trig",
    "application/n-quads",
    "text/turtle",
    "application/n-triples",
    "text/n3",
    "application/ld+json",
    "application/rdf+xml",
];
commander_1.program
    .name('rdf containment proxy')
    .description('Setup a proxy server that provides RDF metadata on retrieval of RDF resources')
    .version('0.1.0');
commander_1.program.command('setup')
    .description('Setup the proxy')
    .option('-p, --port <number>', 'port number to host proxy')
    .option('-s, --signature-predicates [predicates...]', 'separator character', ',')
    .action((options) => {
    let { port, signaturePredicates } = options;
    port = port || 8080;
    signaturePredicates = signaturePredicates || [];
    startProxy(port, signaturePredicates);
});
commander_1.program.parse(process.argv);
function startProxy(port, signaturePredicates) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        /* your app config here */
        app.get('/', function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                //modify the url in any way you want
                try {
                    var requestUrl = req.query.url;
                    console.log("retrieving", requestUrl);
                    if (!requestUrl)
                        return;
                    if (yield isRDFResource(requestUrl)) {
                        const updatedContent = yield processRDFResource(requestUrl, signaturePredicates);
                        res.setHeader('Content-Type', 'application/trig');
                        res.send(updatedContent);
                    }
                    else {
                        (0, request_1.default)(requestUrl).pipe(res);
                    }
                }
                catch (e) {
                    console.error(e);
                    res.status(500);
                    res.send(`something went wrong: \n${e.message}`);
                }
            });
        });
        app.listen(port, () => {
            console.log(`[server]: Server is running at http://localhost:${port}`);
        });
    });
}
function generateDefaultPolicy(target) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, src_1.createSimplePolicy)({
            target,
            duration: "P7D",
            purpose: [
                DPV + "NonCommercialPurpose",
                DPV + "ServicePersonalisation",
                DPV + "ServiceProvision"
            ]
        });
    });
}
function processRDFResource(url, singPredicates) {
    return __awaiter(this, void 0, void 0, function* () {
        // Fix key stuff here because of async requirement
        const publicKeyResource = "https://pod.rubendedecker.be/keys/test_public";
        const privateKeyResource = "https://pod.rubendedecker.be/keys/test_private";
        // Testing key retrieval for myself
        const publicKeyText = yield (yield fetch(publicKeyResource)).text();
        const privateKeyJSON = yield (yield fetch(privateKeyResource)).json();
        const issuer = "https://pod.rubendedecker.be/profile/card#me";
        const publicKey = yield (0, rdfjs_sign_1.importKey)((publicKeyText));
        const privateKey = yield (0, rdfjs_sign_1.importPrivateKey)(privateKeyJSON);
        const signatureOptions = {
            issuer,
            privateKey,
            verificationMethod: publicKeyResource
        };
        // function
        const resourceUrl = getTargetResourceURI(url);
        console.log("processing", resourceUrl);
        const store = yield (0, rdf_retrieval_1.getResourceAsStore)(resourceUrl);
        (0, src_1.renameGraph)(store, n3_1.DataFactory.defaultGraph());
        const signatureWaitList = [];
        for (let quad of store.getQuads(null, null, null, null)) {
            if (singPredicates.includes(quad.predicate.value)) {
                const targetResource = getTargetResourceURI(quad.object.value);
                if (yield isRDFResource(targetResource)) {
                    const p = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        const signatureInfo = yield (0, src_1.createRemoteRDFSignature)(targetResource, signatureOptions);
                        const signatureTriples = (0, src_1.createSignatureTriples)(signatureInfo);
                        yield (0, src_1.addSignatureGraphToStore)(store, signatureTriples.triples);
                        console.log('created RDF signature for', targetResource);
                        resolve();
                    }));
                    signatureWaitList.push(p);
                }
                else {
                    const p = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        const signatureInfo = yield (0, src_1.createRemoteResourceSignature)(targetResource, signatureOptions);
                        const signatureTriples = (0, src_1.createSignatureTriples)(signatureInfo);
                        yield (0, src_1.addSignatureGraphToStore)(store, signatureTriples.triples);
                        console.log('created resource signature for', targetResource);
                    }));
                    signatureWaitList.push(p);
                }
            }
        }
        Promise.all(signatureWaitList);
        // Create dataset from all contents and signatures about content references
        let contentGraphs = store.getGraphs(null, null, null);
        let datasetId = (0, src_1.createDatasetFromGraphsInStore)(store, contentGraphs).id;
        // Create a default policy over this content dataset
        const policy = yield generateDefaultPolicy(datasetId);
        const policyGraph = (0, src_1.addPolicyGraphToStore)(store, policy.triples).graph;
        // Create provenance over this content dataset 
        const provenance = yield (0, src_1.createProvenanceTriples)({
            origin: resourceUrl,
            issuer: issuer,
            target: datasetId
        });
        const provenanceGraph = (0, src_1.addProvenanceGraphToStore)(store, provenance.triples).graph;
        // Create a signature over this content dataset
        const signatureInfo = yield (0, src_1.createRDFDatasetSignature)(store, datasetId, signatureOptions);
        const signatureTriples = (0, src_1.createSignatureTriples)(signatureInfo);
        const signatureGraph = yield (0, src_1.addSignatureGraphToStore)(store, signatureTriples.triples).graph;
        // Wrap in metadata dataset
        const metadataDatasetId = (0, src_1.createDatasetFromGraphsInStore)(store, [policyGraph, provenanceGraph, signatureGraph]).id;
        // Sign metadata dataset
        const metadataSignatureInfo = yield (0, src_1.createRDFDatasetSignature)(store, metadataDatasetId, signatureOptions);
        const metadataSignatureTriples = (0, src_1.createSignatureTriples)(metadataSignatureInfo);
        const metadataSignatureGraph = yield (0, src_1.addSignatureGraphToStore)(store, metadataSignatureTriples.triples).graph;
        // Content manipuation is complete
        const output = yield (0, src_1.serializeTrigFromStore)(store);
        return output;
    });
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
function isRDFResource(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const head = yield fetch(url, { method: "HEAD" });
        const contentType = head.headers.get('Content-Type');
        return !!contentType && acceptedRDFContentTypes.includes(contentType);
    });
}
function getTargetResourceURI(target) {
    return target.split('#')[0].split('?')[0];
}

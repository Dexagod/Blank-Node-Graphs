

## Running the containment software 

```bash
git clone git@github.com:Dexagod/RDF-containment.git

cd RDF-containment/
cd software/
npm install; 
npm test;
```

This will run the available tests, and output a console log of a flow located at `/software/test/flow.test.ts`
This executes the following flow:

1. retrieving `https://pod.rubendedecker.be/profile/card`
   * content graph (`_:n3-0`)
   * provenance graph (`_:n3-2`)
   * policy graph (`_:n3-8`)
2. retrieving `https://josd.github.io/card.ttl`
   * content graph (`_:n3-1`)
   * provenance graph (`_:n3-3`)
   * policy graph (`_:n3-13`)
3. creating an RDF:Dataset (`_:n3-14`) that contains these 6 graphs (`_:n3-0`, `_:n3-2`, `_:n3-8`, `_:n3-1`, `_:n3-3`, `_:n3-13`)
4. creating a signature graph of this RDF:Dataset instance (`_:n3-17`)
   * This creates a signature of the hash of the canonicalized quads of all graphs that are contained in the dataset object WIHTOUT including the dataset and its contains triples!



## Running the containment software
I included a proxy server that when used to retrieve an RDF resource, will add provenance, policy and signature information to the retrieved RDF data. (currently using a set of test private keys hosted by me).

Make sure to clone the repository and run `npm install` in the software folder first!
```bash
cd server/
npm install; 
bash runProxy.sh
```

An example retrieval can be done as follows from the locally hosted proxy server
```bash
curl http://localhost:7846?url=https://pod.rubendedecker.be/profile/card
```

### live proxy server
A live proxy will soon be available on [proxy.rubendedecker.be/](proxy.rubendedecker.be/)

An example retrieval can be done as follows (if the service is running!)
```bash
curl http://proxy.rubendedecker.be?url=https://pod.rubendedecker.be/profile/card
```

## Running the Builder and Evaluator tool

An example of a custom client to build and evaluate packages can be run with the following: (we assume you have already done an npm install in the software directory!)
```bash
cd client;
npm install;
ts-node src/testfile.ts
```
I will add more documentation on this later

## Running the Evaluator CLI tool

Requirements:

Clone the repo if you have not already
```bash
git clone git@github.com:Dexagod/RDF-containment.git
cd RDF-containment
```
run npm install in the software folder
```bash
cd software/
npm install;
cd .. 
```
install the client
```bash
cd client/
npm install;
```

Now you can run the evaluator CLI interface!

### Loading a packaged resource 
First we take a look at a packaged resource:

```bash
npx ts-node bin/evaluator.ts \
   http://proxy.rubendedecker.be?url=https://pod.rubendedecker.be/profile/card 
```
This resource contains my profile and a signature of my profile image.
This information is then packaged in a dataset, over which signature, policy and provenance information is added.
This metadata is then added in another *metadata* dataset, which is then in turn again signed.

### Signatures and policies
Say we only trust information that is explicitly signed by the WebID in question, 
we require the evaluator to only include content signed by that WebID.
Additionally, we want to evaluate any policies set over the data, as our purpose for the use of the data is to provide a service!
We want this policy information to be trusted (this requires us to validate signatures, after which the policy will only succeed if the graph in which the policy is situated was verified as trusted in this signature verification process!)
```bash
npx ts-node bin/evaluator.ts \
   http://proxy.rubendedecker.be?url=https://pod.rubendedecker.be/profile/card \
   --trusted-verification \
   --validate-signatures https://pod.rubendedecker.be/profile/card#me \
   --validate-policies https://w3id.org/dpv#ServiceProvision 
```
We see here that the only remaining data is our profile and the signature.
All data over which no policy was set was discarded, as we explicitly want to process data for the purpose of service provision,
and this was the only data for which this was explicitly allowed!

### Provenance
Say you don't do signatures, but you want to place trust in provenance!
We will validate signatures again, as we only trust data **and metadata!** that was explicitly signed by the WebID.
Then we enforce that any data provided must be tagged as coming from the profile card, as packaged by the WebID, 
and this packaging has to have happened after 2024, as we do not want stale data!

```bash
npx ts-node bin/evaluator.ts \
   http://proxy.rubendedecker.be?url=https://pod.rubendedecker.be/profile/card \
   --trusted-verification \
   --validate-signatures https://pod.rubendedecker.be/profile/card#me \
   --retrieved-from https://pod.rubendedecker.be/profile/card \
   --retrieved-by https://pod.rubendedecker.be/profile/card#me \
   --retrieved-after 2024-01-01T00:00:00.000Z \
   --flatten
```

### All together
We can mix this all together, and use the *--flatten* option to flatten any graphs in the output that are not explicitly referenced, as by now you can trust your data enough to assert it! If the graph containing a triple is referenced, the triple is output both in that graph and in the default graph to not break any assumptions!

```bash

npx ts-node bin/evaluator.ts \
   http://proxy.rubendedecker.be?url=https://pod.rubendedecker.be/profile/card \
   --trusted-verification \
   --validate-signatures https://pod.rubendedecker.be/profile/card#me \
   --validate-policies https://w3id.org/dpv#ServiceProvision \
   --retrieved-from https://pod.rubendedecker.be/profile/card \
   --retrieved-by https://pod.rubendedecker.be/profile/card#me \
   --retrieved-after 2024-01-01T00:00:00.000Z \
   --flatten
   ```
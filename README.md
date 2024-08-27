

## Executing 

```
git clone git@github.com:Dexagod/RDF-containment.git

cd RDF-containment/software
npm install; 
npm test;
```

This will run the available tests, and output a console log of a flow located at `/software/test/flow.test.ts`
This executes the following flow:

1. retrieving `https://pod.rubendedecker.be/profile/card`
   * content graph (_:n3-0)
   * provenance graph (_:n3-2)
   * policy graph (_:n3-8)
2. retrieving `https://josd.github.io/card.ttl`
   * content graph (_:n3-1)
   * provenance graph (_:n3-3)
   * policy graph (_:n3-13)
3. creating an RDF:Dataset (\_:n3-14) that contains these 6 graphs (_:n3-0, _:n3-2, _:n3-8, _:n3-1, _:n3-3, _:n3-13)
4. creating a signature graph of this RDF:Dataset instance (_:n3-17)
   * This creates a signature of the hash of the canonicalized quads of all graphs that are contained in the dataset object WIHTOUT including the dataset and its contains triples!
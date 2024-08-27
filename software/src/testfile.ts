import { generateKeyPair } from "@jeswr/rdfjs-sign/dist";
import { sign, webcrypto } from "crypto";
import moment, { Moment } from "moment"



async function signImage(imageURL: string) {
    // const s = "teststring"
    // webcrypto.subtle.digest("SHA-512", s)
    // webcrypto.subtle.generateK.createHash('sha512').update('my string for hashing').digest('hex');

    let img = await fetch(imageURL)
    let imgBuffer = Buffer.from(await img.arrayBuffer())
    
    const hash = await webcrypto.subtle.digest("SHA-512", imgBuffer)
    console.log(hash)

    const keyPair = await generateKeyPair()


    const keyParams = {
        name: 'ECDSA',
        namedCurve: 'P-384',
    };
  
    const signParams = {
        name: keyParams.name,
        hash: 'SHA-512',
    };

    const signature = (await webcrypto.subtle.sign(signParams, keyPair.privateKey, hash))
    const signatureString = Buffer.from(signature).toString('base64')
    
    console.log()
    console.log(signature)
    console.log()
    console.log(signatureString)
    
    const verification = await webcrypto.subtle.verify(
        signParams,
        keyPair.publicKey,    
        Buffer.from(signatureString, 'base64'),
        hash,
    );
      
    console.log()
    console.log(verification)
      
      

}

signImage("https://pod.rubendedecker.be/profile/image.png")
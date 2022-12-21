import tydids  from "tydids";
import axios from "axios";

export default async function(options) {
    const isObject = function(payload) { if(Object.prototype.toString.call(payload).indexOf('Object') !== -1) return true; else return false; }
    
    let app_wallet = {};
    if((typeof options !== 'undefined') && (options !== null)) {
        if(!isObject(options)) {
            options = {
                privateKey:options
            }
        }
    }

    if((typeof options == 'undefined')||(typeof options.ethereum == 'undefined')||(options == null)) {
        if((typeof options == 'undefined') || (options == null)) { options = {}};
        app_wallet = tydids(options.privateKey);
        app_wallet.app = {};
        app_wallet.app.provider = app_wallet.provider;
        app_wallet.app.signer = app_wallet.provider.getSigner();
        app_wallet.app.account = app_wallet.account;
        options.privateKey = app_wallet.privateKey;
    } else {
        const provider = new ethers.providers.Web3Provider(options.ethereum);
        const signer = provider.getSigner();
        app_wallet = wallet(signer);
        app_wallet.app = {};
        app_wallet.app.provider = provider;
        app_wallet.app.signer = signer;
        app_wallet.app.account = await app_wallet.app.provider.send("eth_requestAccounts", []);
        app_wallet.app.account = app_wallet.app.account[0];
    }
    if((typeof options == 'undefined') || (options == null) || (typeof options.api == 'undefined')) {
        options.api = 'https://api.corrently.io';
    } 
    
    // Initialize Storage Backend
    let challenge = null; 
    let challenge_signature = null;
    let rateTkn = null;
    let apiReqConfig = {}
    try {
        const response = await axios.post(options.api+ "/v2.0/tydids/bucket/challenge",{account:app_wallet.address});
        rateTkn = response.headers["x-corrently-token"];
        //console.log('Corrently Token',rateTkn);
        challenge = await response.data;
        challenge_signature = await app_wallet.signMessage(challenge);
        apiReqConfig.headers= {'x-api-token': 'tkn_'+challenge};
    } catch(e) {
        throw "Challenge Request Error (Rate Limit?)";
    } 

    app_wallet.app.challenge = challenge;

    app_wallet.app.requestIntermediate = async function(zip,wh,context,reading) {
        let signature = null;
        if((typeof reading !== 'undefined') && (reading !== null) && (!isNaN(reading))) {
            signature = await app_wallet.signMessage(reading) 
        }
        const intermediateRequest = {
            zip:zip,
            wh:wh,
            context:context,
            reading:reading,
            signature:signature,
            owner:app_wallet.address
        }
        const response = await axios.post(options.api+ "/v2.0/tydids/bucket/gsi",intermediateRequest,apiReqConfig);
        return response.data;
    }

    app_wallet.app.requestCertification = async function(intermediate) {
        const hash = app_wallet.tydids.hashMessage(intermediate.payload);
        
        const certRequest = {
          signature:await app_wallet.signMessage(hash),
          owner:app_wallet.address,
          hash:hash
        }

        const response = await axios.post(options.api+"/v2.0/tydids/sign", certRequest,apiReqConfig);
        return response.data;
    }

    app_wallet.app.validateCertificateSignatures = async function(certificate) {
        let res = null;
        const signee = certificate.owner.payload.issuer.toLowerCase();

        const check = async function(path) {
            return (await app_wallet.tydids.verifyMessage(path["payload"],path["signature"])).toLowerCase();
        }

        if(await check(certificate.hash) !== signee) { res = "invalid certificate.hash.signature"; }
        if(await check(certificate.owner) !== signee) { res = "invalid certificate.owner.signature"; }
        if(await check(certificate.presentations.type) !== signee) { res = "invalid certificate.presentations.type.signature"; }
        if(await check(certificate.presentations.context) !== signee) { res = "invalid certificate.presentations.context.signature"; }
        if(await check(certificate.presentations.location) !== signee) { res = "invalid certificate.presentations.location.signature"; }
        if(await check(certificate.presentations.consumption) !== signee) { res = "invalid certificate.presentations.consumption.signature"; }
        if(await check(certificate.presentations.ghg) !== signee) { res = "invalid certificate.presentations.ghg.signature"; }
        if(await check(certificate.presentations.did) !== signee) { res = "invalid certificate.presentations.did.signature"; }

        return res;
    }
    app_wallet.app.toString = function() {
        return JSON.stringify(options);
    }
    return app_wallet;
}
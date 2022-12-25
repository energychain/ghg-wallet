import tydids  from "tydids";
import axios from "axios";
import { ethers } from "ethers";

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
        app_wallet = signer;
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
    let storage = {};

    if((typeof options.storage !== 'undefined') && (options.storage !== null)) {
        storage = options.storage;
        delete options.storage;
    }
    storage.setItem = function(key,value,child) {
            if((typeof child !== 'undefined') && (child !== null)) {
                if(typeof storage[key] == 'undefined') storage[key]={};
                storage[key][child]=value;
            } else {
                storage[key]=value;
            }
            if(typeof options.onPersist !== 'undefined') {
                options.onPersist(storage);
            }
            if(typeof options.onUpdate !== 'undefined') {
                options.onUpdate(key,value,child);
            }
    };

    if((typeof options !== 'undefined') && (options !== null) && (typeof options.apitoken !== 'undefined')) {
        apiReqConfig.mode = 'no-cors';
        apiReqConfig.headers= {
            'x-account': options.apitoken,
            'Content-Type': 'application/json'
        };
        options.api = 'https://api.corrently.io';
    } 

    try {
        const response = await axios.post(options.api+ "/v2.0/tydids/bucket/challenge",{account:app_wallet.address},apiReqConfig);
        rateTkn = response.headers["x-account"];
        challenge = await response.data;
        challenge_signature = await app_wallet.signMessage(challenge);
        apiReqConfig.headers= {
            'x-account': challenge,
            'Content-Type': 'application/json'
        };
        options.apitoken =  'tkn_'+challenge;
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
        storage.setItem("certificate_"+response.data.did.payload.uid,response.data);
        return response.data;
    }

    app_wallet.app.getCertificateConsensus = async function(certificate) {
            let consensus = [];
            let owner = await app_wallet.tydids.contracts.GHGCERTIFICATES.ownerOf(certificate.did.payload.nft.payload.tokenId);
            consensus.push({
                type:'NFT-ownership',
                certificate:certificate.owner.payload.owner,
                consensus:owner
            });
            let savings = await app_wallet.tydids.contracts.GHGSAVINGS.balanceOf(certificate.did.payload.uid);
            consensus.push({
                type:'ERC20-ghgsavings',
                certificate:certificate.presentations.ghg.payload.saving.grid,
                consensus:savings.toNumber()
            });
            let emissions = await app_wallet.tydids.contracts.GHGEMISSIONS.balanceOf(certificate.did.payload.uid);
            consensus.push({
                type:'ERC20-ghgemissions',
                certificate:certificate.presentations.ghg.payload.actual.grid,
                consensus:emissions.toNumber()
            });
            return consensus;
    }

    app_wallet.app.getPresentation = async function(certificate,type,recipient) {
        let presentation = {
            payload:certificate.presentations[type],
            issuer:certificate.owner.payload.issuer,
            owner:certificate.owner.payload.owner,
            iss:certificate.did.payload.schema +":"+certificate.did.payload.method+":"+app_wallet.address,
            iat:new Date().getTime()
        }
        if((typeof recipient !== 'undefined') && (recipient !== null)) {
            presentation.recipient = recipient;
        } else {
            recipient = "public";
        }
        presentation.signature = await app_wallet.tydids.signMessage(presentation);
        
        storage.setItem("presentation_"+certificate.did.payload.uid+"_"+type+"_"+recipient,presentation);
        return presentation;
    };

    app_wallet.app.validateCertificateSignatures = async function(certificate) {
        let res = [];
        let rat = [];

        const signee = certificate.owner.payload.issuer.toLowerCase();

        const check = async function(path) {
            return (await app_wallet.tydids.verifyMessage(path["payload"],path["signature"])).toLowerCase();
        }

        if(await check(certificate.hash) !== signee) { res.push("invalid certificate.hash.signature"); } else {rat.push("validated certificate.hash");}
        if(await check(certificate.owner) !== signee) { res.push("invalid certificate.owner.signature"); }  else {rat.push("validated certificate.owner.signature");}
        if(await check(certificate.presentations.type) !== signee) { res.push("invalid certificate.presentations.type.signature"); }  else {rat.push("validated certificate.presentations.type.signature");}
        if(await check(certificate.presentations.context) !== signee) {res.push("invalid certificate.presentations.context.signature"); }  else {rat.push("validated certificate.presentations.context.signature");}
        if(await check(certificate.presentations.location) !== signee) { res.push("invalid certificate.presentations.location.signature"); }  else {rat.push("validated certificate.presentations.location.signature");}
        if(await check(certificate.presentations.consumption) !== signee) { res.push("invalid certificate.presentations.consumption.signature"); }  else {rat.push("validated certificate.presentations.consumption.signature");}
        if(await check(certificate.presentations.ghg) !== signee) { res.push( "invalid certificate.presentations.ghg.signature"); }  else {rat.push("validated certificate.presentations.ghg.signature");}
        if(await check(certificate.presentations.did) !== signee) { res.push("invalid certificate.presentations.did.signature"); } else {rat.push("validated certificate.presentations.did.signature");}
        
        if(res.length == 0) {
            storage.setItem("certificate_"+certificate.did.payload.uid,certificate);
        }
        return {
            invalid:res,
            valid:rat
        };
    }

    app_wallet.app.verifiedPresentation = async function(presentation) {
        let signature = presentation.signature;
        delete presentation.signature;
        let vp = {};
        vp["$schema"] = presentation.payload["$schema"];  
        vp.signer = await app_wallet.tydids.verifyMessage(presentation,signature);
        vp.issuer = presentation.issuer;
        vp.owner = presentation.owner;
        vp.recipient = presentation.recipient;
        vp.payload = presentation.payload.payload;
        if(vp.issuer !== await app_wallet.tydids.verifyMessage(presentation.payload.payload,presentation.payload.signature)) {
            delete vp.payload;
        }
        presentation.signature = signature; // we recreate signatuer to keep object consitent.
        storage.setItem("vp_"+vp.payload.hash,vp,vp["$schema"]);
        return vp;
    };

    app_wallet.app.toString = function() {
        return JSON.stringify({options:options,storage:storage});
    }

    return app_wallet;
}
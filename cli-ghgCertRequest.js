#!/usr/bin/env node

const lib = require("./lib");
const fs = require("fs");

const optionDefinitions = [
    { 
        'name': 'privateKey', 
        'alias': 'k', 
        'type': String 
    },
    { 
        'name': 'wh', 
        'alias': 'w', 
        'type': Number 
    },
    { 
        'name': 'zipcode', 
        'alias': 'l', 
        'type': String,
        'defaultOption': '69256' 
    },
    { 
        'name': 'intermediate', 
        'alias': 'i', 
        'type': String
    },
    { 
        'name': 'certificate', 
        'alias': 'c', 
        'type': String
    }
];

const commandLineArgs = require('command-line-args');
const options = commandLineArgs(optionDefinitions)


const app = async function() {
    const app_wallet = await lib.ghgwallet(options.privateKey);
    console.log("Identity",app_wallet.address);

    if(typeof options.wh !== 'undefined') {
       if(typeof options.zipcode == 'undefined') options.zipcode = "69256";
       options.wh = Math.round(options.wh);
       console.log("Consumption",options.wh);
       console.log("Location (Postal Code)",options.zipcode);
       console.log("- Requesting Intermediate");
       const intermediate = await app_wallet.app.requestIntermediate(options.zipcode,options.wh,{'usage':"Straßenverkehr"});
       if(typeof options.intermediate !== 'undefined') {
        fs.writeFileSync(options.intermediate,JSON.stringify(intermediate));
       }
       console.log("- Validating Hash",intermediate.hash);
       const hash = await app_wallet.tydids.hashMessage(intermediate.payload);
       if(hash !== intermediate.hash) {
        throw "Invalid Intermediate Hash";
       }
       console.log("- Requesting Certification");
       const certificate = await app_wallet.app.requestCertification(intermediate);
       
       if(typeof options.certificate !== 'undefined') {
        fs.writeFileSync(options.certificate,JSON.stringify(certificate));
       } else {
        console.log(certificate);
       }

    } else {
       console.warn('No consumption given use -w argument.'); 
    }
}

app();
#!/usr/bin/env node

const lib = require("./lib");
const fs = require("fs");

const optionDefinitions = [
    { 
        'name': 'certificate', 
        'alias': 'c', 
        'type': String
    }
];

const commandLineArgs = require('command-line-args');
const options = commandLineArgs(optionDefinitions)

const app = async function() {
    try {
        const app_wallet = await lib.ghgwallet();
        const certificate = JSON.parse(fs.readFileSync(options.certificate));
        let validation = await app_wallet.app.validateCertificateSignatures(certificate);
        if(validation !== null) {
            console.error(validation);
            process.exit(1);
        }
        process.exit(0)
    } catch(e) {
        console.error(e);
    }
}

app();
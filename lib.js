exports.ghgwallet = async function(options) {
    const tydids = require("tydids");
    const axios = require("axios");

    const API_BASE = "https://api.corrently.io";

    let app_wallet = {};

    if((typeof options == 'undefined')||(typeof options.ethereum == 'undefined')||(options == null)) {
        app_wallet = tydids.wallet(options);
        app_wallet.app = {};
        app_wallet.app.provider = app_wallet.provider;
        app_wallet.app.signer = app_wallet.provider.getSigner();
        app_wallet.app.account = app_wallet.account;
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

    // Initialize Storage Backend
    let challenge = null; 
    let challenge_signature = null;
    try {
        const response = await axios.post(API_BASE+ "/v2.0/tydids/bucket/challenge",{account:app_wallet.address});

        challenge = await response.data;
        challenge_signature = await app_wallet.signMessage(challenge);
    } catch(e) {
        throw "Challenge Request Error (Rate Limit?)";
    } 

    app_wallet.app.challenge = challenge;

    app_wallet.app.requestIntermediate = async function(zip,wh,context) {
        const intermediateRequest = {
            zip:zip,
            wh:wh,
            context:context
        }
        const response = await axios.post(API_BASE+ "/v2.0/tydids/bucket/gsi",intermediateRequest);
        return response.data;
    }

    app_wallet.app.requestCertification = async function(intermediate) {
        const hash = app_wallet.tydids.hashMessage(intermediate.payload);
        
        const certRequest = {
          signature:await app_wallet.signMessage(hash),
          owner:app_wallet.address,
          hash:hash
        }

        const response = await axios.post(API_BASE+"/v2.0/tydids/sign", certRequest);
        return response.data;
    }

    return app_wallet;
}
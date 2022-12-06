const assert = require("assert");
const lib = require("../lib.js");

/**
 * In this context a Wallet is a one to one assignment to an Identity.
 */

describe('Certificate for electricity consumption transaction', function () {
    let test_intermediate = null;
    let test_wallet = null;
    let test_certificate = null;

    /**
     * Create an intermediate as given from a charging session including 
     * location and energy consumption. 
     * Do sending a "intermediate" request to the Energy Service Provider.
     * Validate response with given data of intermediate request and calculate a hash
     */
    it('Request Intermediate', async function () {
        this.timeout(35000);
        const app_wallet = await lib.ghgwallet();
        test_wallet = app_wallet;

        const zip = '69256';
        const wh = Math.round(Math.random() * 5000 +100);
        const context = {usage:'Straßenverkehr'};

        const intermediate = await app_wallet.app.requestIntermediate(zip,wh,context);

        // Factual testing
        assert.equal(intermediate.payload.location.zip, zip);
        assert.equal(intermediate.payload.context.usage, context.usage);
        assert.equal(intermediate.payload.consumption.actual, wh);
        assert.equal(intermediate.payload.consumption.time > new Date().getTime() - 3600000,true);
        assert.equal(intermediate.payload._iat > new Date().getTime() - 3600000,true);
        assert.equal(intermediate.payload._exp > new Date().getTime() - 3600000,true);
        assert.equal(intermediate.payload._exp > intermediate.payload._iat,true);

        // Cryoptographic testing
        const hash = await app_wallet.tydids.hashMessage(intermediate.payload);
        assert.equal(intermediate.hash,hash);
        test_intermediate = intermediate;
        return;
    });
    /**
     * Use Intermediate decorated by Energy Service Provider to get actual certificate
     * and let ESP establish consensus (mint NFT, ERC20,...)
     * Remember certificate for validations in next tests
     */
    it('Request Certificate', async function () {
        this.timeout(35000);
        const certificate = await test_wallet.app.requestCertification(test_intermediate);
        test_certificate = certificate;
        return;
    });

    /**
     * Validate internal consensus of certificate
     * - does it reflect the calculated hash and hash from intermediate in all values
     * - is owner myself and issuer the issuer of the intermediate
     */
    it('Certificate Consensus', async function () {
        this.timeout(35000);
        assert.equal(test_intermediate.hash,test_certificate.did.payload.hash);
        assert.equal(test_intermediate.hash,test_certificate.context.payload.hash);
        assert.equal(test_intermediate.hash,test_certificate.owner.payload.hash);
        assert.equal(test_intermediate.hash,test_certificate.hash.payload);
        assert.equal(test_certificate.owner.payload.owner.toLowerCase(),test_wallet.address.toLowerCase());
        assert.equal(test_certificate.owner.payload.issuer.toLowerCase(),test_intermediate.payload._iss.toLowerCase());
        return;
    });

    /**
     * Validate Certificate offline and offchain. Check signatures of issuer with payload fields.
     */
    it('Signature Validation (Offline Check)', async function () {
        this.timeout(35000);
        const signee = test_certificate.owner.payload.issuer.toLowerCase();
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.hash.payload,test_certificate.hash.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.owner.payload,test_certificate.owner.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.type.payload,test_certificate.presentations.type.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.context.payload,test_certificate.presentations.context.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.location.payload,test_certificate.presentations.location.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.consumption.payload,test_certificate.presentations.consumption.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.ghg.payload,test_certificate.presentations.ghg.signature).toLowerCase(),signee);
        assert.equal(await test_wallet.tydids.verifyMessage(test_certificate.presentations.did.payload,test_certificate.presentations.did.signature).toLowerCase(),signee);
        return
    });

    /**
     * Validate that Energy Service Provider minted an NFT token.
     * - token is owned by me
     * - token reflects DID of certificate
     */
    it('OnChain Consensus NFT Token (GHG Certificate)', async function () {
        this.timeout(35000);
        assert.equal(test_certificate.did.payload.url,await test_wallet.tydids.contracts.GHGCERTIFICATES.tokenURI(test_certificate.did.payload.nft.payload.tokenId));
        assert.equal(test_wallet.address.toLowerCase(),(await test_wallet.tydids.contracts.GHGCERTIFICATES.ownerOf(test_certificate.did.payload.nft.payload.tokenId)).toLowerCase());
        return;
    });

    /** Validate ERC20 tokens minted by Energy Service Provider
     * - savings token is owned by certificate (SSI) and balance is equal to value in intermediate
     * - same for emissions token
     */
    it('OnChain Consensus ERC20 Token (GHG Savings/Emissions)', async function () {
        this.timeout(35000);
        let b = await test_wallet.tydids.contracts.GHGSAVINGS.balanceOf(test_certificate.did.payload.uid);
        assert.equal(b,test_intermediate.payload.ghg.saving.grid);
        let c = await test_wallet.tydids.contracts.GHGEMISSIONS.balanceOf(test_certificate.did.payload.uid);
        assert.equal(c,test_intermediate.payload.ghg.actual.grid);
        return;
    });
});
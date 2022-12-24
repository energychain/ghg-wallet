import { strict as assert } from 'node:assert';
import ghglib from "../lib.mjs";

/**
 * In this context a Wallet is a one to one assignment to an Identity.
 */

describe('Basic Wallet Handling', function () {

    /**
     * Validate that wallet creation is isolated.
     */
    it('Create Two Random Wallets - Have different ID (address)', async function () {
        this.timeout(25000);
        const randomWallet1 = await ghglib();
        const randomWallet2 = await ghglib();
        assert.equal(randomWallet1.app.challenge !== randomWallet2.app.challenge, true);
        assert.equal(randomWallet1.address !== randomWallet2.address, true);
        return;
    });

    it('Create one wallet twice (has same addess but different challenge)', async function () {
        this.timeout(25000);
        const randomWallet1 = await ghglib();
        const json = JSON.parse(randomWallet1.app.toString());

        const randomWallet2 = await ghglib(json.options);
        assert.equal(randomWallet1.app.challenge !== randomWallet2.app.challenge, true);
        assert.equal(randomWallet1.address == randomWallet2.address, true);
        return;
    });   
    it('Create  wallet add presentation and re-create it with persitent storage', async function () {
        this.timeout(25000);
        const randomWallet1 = await ghglib();
        const presentation = {"payload":{"signature":"0xa36b239c45699c0f7337e0f19cfd67397c6417955e2ef61d05a949725b654af34d38e206b9dc7e1b2318f9ee85f1f02421a538588828bdaa79382a2f4c9e7dcd1c","payload":{"hash":"0xb28bf0488f64a8ab92ad435abbc3c8e481ef9553c96e2de6f284ceb5f5d2d86e"},"$schema":"https://schema.corrently.io/tydids/context"},"issuer":"0xE7Fe0626D7B8e3F2e5ECD146F9b11daac1DBE447","owner":"0x72be03E198E921047349336800eC160d6e50b853","iss":"did:ethr:6226:0x72be03E198E921047349336800eC160d6e50b853","iat":1671842589929,"signature":"0xd56a09d5b210ce3992340be0cbb143916f3f84be5b75760fcc7e3b0863ad2aad14f78e9ea99be9eb24e8b222778e6bc39dd5aeee2e106a8f1ce73ca0d1080a631b"};
        await randomWallet1.app.verifiedPresentation(presentation);
        
        const json = JSON.parse(randomWallet1.app.toString());
        json.options.storage = json.storage;

        const randomWallet2 = await ghglib(json.options);
        assert.equal(randomWallet1.app.challenge !== randomWallet2.app.challenge, true);
        assert.equal(randomWallet1.address == randomWallet2.address, true);
        const json2 = JSON.parse(randomWallet2.app.toString());
        assert.equal(json2.storage.vp_0xb28bf0488f64a8ab92ad435abbc3c8e481ef9553c96e2de6f284ceb5f5d2d86e['https://schema.corrently.io/tydids/context'].owner,'0x72be03E198E921047349336800eC160d6e50b853');
        return;
    }); 
    /**
     * Validate wallet creation is reproducable (using private key)
     */
    it('Create Wallet with known PK - Has well known ID (address)', async function () {
        this.timeout(25000);
        const randomWallet1 = await ghglib("0x1f0e77a8624babbef31b6e39dd4c70f0ec8093fb5a88e3256d7af3a61c597d99");
        assert.equal(randomWallet1.address == "0xB884439b72C7f04764279F8dDCa0b02C981e2637", true);
        return;
    });
});
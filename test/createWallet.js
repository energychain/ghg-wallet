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

        const randomWallet2 = await ghglib(JSON.parse(randomWallet1.app.toString()));
        assert.equal(randomWallet1.app.challenge !== randomWallet2.app.challenge, true);
        assert.equal(randomWallet1.address == randomWallet2.address, true);
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
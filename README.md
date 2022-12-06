# ghg-wallet
**DID/SSI based handling of greenhouse gas emissions and savings**

![npm](https://img.shields.io/npm/dw/ghg-wallet) [![Build Status](https://travis-ci.com/energychain/ghg-wallet.svg?branch=master)](https://travis-ci.com/energychain/ghg-wallet) [![CO2Offset](https://api.corrently.io/v2.0/ghgmanage/statusimg?host=ghg-wallet&svg=1)](https://co2offset.io/badge.html?host=ghg-wallet)

## Installation

### Use as Library in your Code
```
npm install ghg-wallet
```

### Use as Command Line Tool (eq. ghg-certRequest)
```
npm install -g ghg-wallet
```

### Work with Source Code
```
git clone https://github.com/energychain/ghg-wallet.git
cd ghg-wallet
npm install
npm test
```

Hint: `npm test` requires [Mocha JS](https://mochajs.org/) to be installed.

## Usage
### ghg-certRequest
Command Line (CLI) script to get a certificate of an electricity consumption in Germany. Detail of the process are described [here](https://corrently.io/books/tydids-trust-framework/page/blockchain-basierte-nachweisfuhrung-der-thg-emission-und-minderung).

Sample usage:
```
ghg-certRequest -w 1234 -l 69256
```

same as if GIT repository is used:
```
node ./cli-ghgCertRequest.js -w 1234 -l 69256
```

#### Arguments

- `-w` Consumed energy from local grid in Watt-Hours (Wh)
- `-l` Zipcode in Germany (Postleitzahl)
- `-i` If specified a json file will be written with the intermediate
- `-c` If specified a json file will be written with the certificate
- `--privateKey` Private Key to identify with. If omitted a new identity will be generated




## Maintainer / Imprint
<addr>
<a href="https://stromdao.de/">STROMDAO GmbH</a><br/>
Gerhard Weiser Ring 29  <br/>
69256 Mauer  <br/>
Germany <br/>
  <br/>
+49 6226 968 009 0  <br/>
  <br/>
kontakt@stromdao.com  <br/>
  <br/>
Handelsregister: HRB 728691 (Amtsgericht Mannheim)
</addr>


## LICENSE
[Apache-2.0](./LICENSE)
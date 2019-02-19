# @adobe/jwtauth

Retrieve an Adobe bearer token via the JWT path

## Goals

It is a good idea to provide a mission statement for your project, enshrining
what the project wants to accomplish so that as more people join your project
everyone can work in alignment.

## Non-Goals

It is also a good idea to declare what are _not_ goals of the project to prevent
potential feature creep.

### Installation

Instructions for how to download/install the code onto your machine.

Example:

```
npm install @adobe/jwtauth
```

### Usage

Usage instructions for your code.

Example:

```
const auth = require('@adobe/jwtauth');

const options={
    clientId : _config.credentials.api_key,
    clientSecret : _config.credentials.client_secret,
    technicalAccountId : _config.credentials.technical_account_id,
    orgId : _config.credentials.org_id,
    privateKey : _config.credentials.private_key,
    metaScopes : _config.credentials.metaScopes,
    ims : 'https://ims-na1.adobelogin.com'
};

auth(options).then(token => console.log(token));
```

### Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.

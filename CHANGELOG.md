# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.3](https://github.com/EthanOK/ethan-dapp-server/compare/v0.1.2...v0.1.3) (2026-07-08)


### Features

* **auth:** notify Discord on login and disable /api/webhooks ([75fa78b](https://github.com/EthanOK/ethan-dapp-server/commit/75fa78b2211d28dcf604ca7df7b2246c2b4feffb))
* **dex:** add Bitget aggregator proxy and extensible provider layout ([2bd7f2b](https://github.com/EthanOK/ethan-dapp-server/commit/2bd7f2b0172531c2271f7c08dbca1c1dced0cf74))
* **dex:** add OKX quote/swap aggregator proxy ([1bc67e1](https://github.com/EthanOK/ethan-dapp-server/commit/1bc67e1d684480d8d956842a75d7570a4d36b85e))


### Bug Fixes

* **dex:** strip content-encoding in passthrough ([21066c4](https://github.com/EthanOK/ethan-dapp-server/commit/21066c4353b5282acfc1fe378901a7e21a389dad))

### [0.1.2](https://github.com/EthanOK/ethan-dapp-server/compare/v0.1.1...v0.1.2) (2026-07-07)


### Features

* **api:** add version endpoint and skip local swagger auth webhooks ([c8d74c4](https://github.com/EthanOK/ethan-dapp-server/commit/c8d74c4ee596b810153156001b2acf86f6e67217))

### 0.1.1 (2026-07-07)


### Features

* add /api/health liveness endpoint ([88986ed](https://github.com/EthanOK/ethan-dapp-server/commit/88986ed85f3bbed3de4de57979870076354213e0))
* add /api/webhooks destination-routed relay ([4389e01](https://github.com/EthanOK/ethan-dapp-server/commit/4389e016ebde109c51d839f7618ca1d1815be13a))
* add Swagger UI password gate and serve static docs from src ([3374a74](https://github.com/EthanOK/ethan-dapp-server/commit/3374a7426b8aecca1539604405d45995836954fa))
* **client:** add Web3 Umami analytics to home page ([1169005](https://github.com/EthanOK/ethan-dapp-server/commit/1169005917be4ac9c00bfdaa4f278bfdb09d851b))
* SIWE login OpenAPI, Bun.serve entry, and dev tooling ([62536fa](https://github.com/EthanOK/ethan-dapp-server/commit/62536fa20e91e9e6e31525697f5e5583f5d3df59))
* **swagger:** enrich login notify with geo, IP type, and plain labels ([cc95ba2](https://github.com/EthanOK/ethan-dapp-server/commit/cc95ba20ff3f6896b0bf6ae5f011c27c6956f43c))
* **swagger:** notify webhook on login with IP and country ([35d78d1](https://github.com/EthanOK/ethan-dapp-server/commit/35d78d15c5c4382d26642efbd476335564ba87e8))
* **swagger:** persist dark mode and collapse Schemas by default ([8e442ae](https://github.com/EthanOK/ethan-dapp-server/commit/8e442ae827494ac914202de2897b524d28261203))


### Bug Fixes

* **dev:** serve static files locally while keeping Vercel redirects ([ecf5847](https://github.com/EthanOK/ethan-dapp-server/commit/ecf5847a5ae5e05876b48c7c9bdc14b03f05be41))
* **vercel:** lazy-load login and route all /api/* to single function ([f439d2b](https://github.com/EthanOK/ethan-dapp-server/commit/f439d2b54ae131fb4af25945e1d67641a68c0e9d))

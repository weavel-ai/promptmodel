<div align="center">
    <a href="https://www.promptmodel.run?utm_source=github&utm_medium=Readme&utm_content=logo">
        <img src="https://i.imgur.com/f3MHyH3.png" title="Logo" style="width: 160px; margin-bottom: 16px;" />
    </a>
    <h1>Promptmodel</h1>
    <p>
        <h3>
            Collaborative prompt & model engineering - built for LLM product teams.</h3>
        <p>
            We are currently on <strong>public beta</strong>.
        </p>
    </p>
    <div>
      <img src="https://img.shields.io/badge/License-MIT-red.svg?style=flat-square" alt="MIT License">
        <a href="https://pypi.org/project/promptmodel" target="_blank">
            <img src="https://img.shields.io/pypi/v/promptmodel.svg?style=flat-square" alt="PyPI Version">
        </a>
        <a href="https://discord.gg/2Y36M36tZf" target="_blank">
            <img src="https://dcbadge.vercel.app/api/server/2Y36M36tZf?theme=default-inverted&style=flat-square&" alt="Discord Invite">
        </a>
    </div>
</div>

## What is Promptmodel?

**Promptmodel** is a collaborative prompt & model engineering framework that offers the following:

- [x] Streamlined prompt engineering **collaboration** for developers and non-developers.
- [x] **Web editor** designed for prompt engineering with difference visualization & built-in version tracking.
- [x] **SDK** (Python) to integrate the prompts with your existing codebase.
- [x] **Dashboard** for product-level evaluation & prompt management (A/B tests coming soon).

### Interactive Demo

[![Interactive demo](https://i.imgur.com/eAcIv7C.png)](https://app.guideflow.com/player/0p0229tyrl)

Click on the image above to start the interactive demo.  
You can explore more demos [here](https://promptmodel.run/docs/demo).

## Get started

### Step 1: Run Server

#### Promptmodel Cloud

Managed deployment by the Promptmodel team, generous free-tier (hobby plan) available, no credit card required.

[Create account](https://app.promptmodel.run)

#### Localhost

Requirements: docker, docker compose (e.g. using Docker Desktop)

```bash
# Clone repository
git clone https://github.com/promptmodel/promptmodel.git
cd promptmodel

# Run server and database
docker compose up -d
```

#### Self-host (Docker)

[→ Instructions](https://promptmodel.run/docs/deployment/self-host)

<!-- [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/) -->

### Step 2: Setup

#### Dashboard for managing prompts and models

#### SDKs to control prompts and models

Fully async, typed SDKs to instrument any LLM application. Currently available for Python.

| Package                                                                                                                                             | Description | Links                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| [![PyPI Version](https://img.shields.io/pypi/v/promptmodel.svg?style=flat-square&label=pypi+promptmodel)](https://pypi.python.org/pypi/promptmodel) | Python      | [docs](https://www.promptmodel.run/docs/integrations/python-sdk), [repo](https://github.com/weavel-ai/promptmodel-python) |

## Questions / Feedback

The maintainers are very active in the Promptmodel [Discord](https://discord.gg/2Y36M36tZf) and are happy to answer questions or discuss feedback/ideas regarding the future of the project.

## Contributing to Promptmodel

Join the community [on Discord](https://discord.gg/2Y36M36tZf).

To contribute, send us a PR, raise a GitHub issue, or email at contributing@promptmodel.run

### Development setup

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to setup a development environment.

## License

Promptmodel is MIT licensed. Enterprise-edition features will be released with a separate license in the future. See [LICENSE](LICENSE) and for more details.

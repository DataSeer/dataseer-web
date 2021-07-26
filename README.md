# datasser-web

## Purposes

This repository corresponds to the DataSeer web application, which aims at driving the authors of scientific article/manuscripts to the best research data sharing practices, i.e. to ensure that the datasets coming with an article are associated with data availability statement, permanent identifiers and in general requirements regarding Open Science and reproducibility. 

Machine learning techniques are used to extract and structure the information of the scientific article, to identify contexts introducting datasets and finally to classify these context into predicted data types and subtypes. These ML predictions are used by the web application to help the authors to described in an efficient and assisted manner the datasets used in the article and how these data are shared with the scientific community. 

See the [dataseer-ml](https://github.com/dataseer/dataseer-ml) repository for the machine learning services used by DataSeer web.

Supported article formats are PDF, docx, TEI, JATS/NLM, ScholarOne, and a large variety of additional publisher native XML formats: BMJ, Elsevier staging format, OUP, PNAS, RSC, Sage, Wiley, etc (see [Pub2TEI](https://github.com/kermitt2/Pub2TEI) for the list of native publisher XML format covered).

## Contacts and licences

Main authors and contact: [Nicolas Kieffer](https://github.com/NicolasKieffer), Patrice Lopez (<patrice.lopez@science-miner.com>).

The development of dataseer-ml is supported by a [Sloan Foundation](https://sloan.org/) grant, see [here](https://coko.foundation/coko-receives-sloan-foundation-grant-to-build-dataseer-a-missing-piece-in-the-data-sharing-puzzle/).

dataseer-Web is distributed under [Apache2 license](https://www.apache.org/licenses/LICENSE-2.0).

## Description

This appliaction is composed of :
 - a REST API to interact with your data stored in MongoDB (localhost:3000/api)
 - a default Front-End app requesting the REST API

Documents, Organizations and Accounts data are stored in MongoDB. Files (PDF, XML and TEI) uploaded on tdm-plateform are stored in the server FileSystem

## Documentations

- [Install](#install)
- [Run](#run)
- [Dependencies](#dependencies)
- [Configurations](#configurations)
    - [Web Application configuration](#web-application-configuration)
    - [JWT Configuration](#jwt-configuration)
    - [Mails](#mails)
- [Models documentations](doc/MODELS.md#models-documentation)
  - [Accounts](doc/MODELS.md#accounts)
  - [Organizations](doc/MODELS.md#organizations)
  - [Roles](doc/MODELS.md#roles)
  - [Documents](doc/MODELS.md#documents)
      - [Documents Files](doc/MODELS.md#documents-files)
      - [Documents Uploads](doc/MODELS.md#documents-uploads)
      - [Documents Logs](doc/MODELS.md#documents-logs)
      - [Documents Files Uploads](doc/MODELS.md#documents-files-uploads)
- [API Documentation](doc/API.md)
  - [Responses Status Codes](doc/API.md#response-status-codes)
  - [Credentials](doc/API.md#credentials)
  - [Results](doc/API.md#results)
  - [Available Routes](doc/API.md#available-routes)

## Install

*[Table of contents](#documentations)*

```js
npm i
// NodeJS V16.0
```

## Run
*[Table of contents](#documentations)*

```js
npm run // Display list of available options
npm start // Start headless process with forever (production)
npm start-dev // Start process (development)
npm stop // Stop headless process
```

## Dependencies

*[Table of contents](#documentations)*

Application requires:
- an instance of mongoDB (by default: running on port <code>27017</code> with an <code>app</code> database)

## Configurations

### Web Application Configuration

*[Table of contents](#documentations)*

You must create some configurations files (based on `*.default` files) and fill them with your data :

- <code>conf/conf.json</code> : global app configuration
- <code>conf/crisp.json</code> : crisp configuration
- <code>conf/recaptcha.json</code> : recaptcha configuration
- <code>conf/smtp.json</code> : smtp configuration
- <code>conf/userflow.json</code> : userflow configuration
- <code>conf/services/dataseer-ml.json</code> : dataseer-ml configuration
- <code>conf/services/dataseer-wiki.json</code> : dataseer-wiki configuration
- <code>conf/services/repoRecommender.json</code> : repoRecommender configuration

### JWT Configuration

*[Table of contents](#documentations)*

This application require a private key to create JSON Web Token
You must create file conf/private.key and fill it with a random string (a long random string is strongly recommended)

### Mails

*[Table of contents](#documentations)*

All the files concerning the mails are in the `conf/mails` directory.




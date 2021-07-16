

# TDM-Plateform

## Purposes
This repository corresponds ...
## Contacts and licences
Main authors and contact: 
## Description
This appliaction is composed of :
 - a GUI to manage your account & documents (localhost:3000/)
 - a REST API to interact with your data stored in MongoDB (localhost:3000/api)

Documents, Organizations and Accounts data are stored in MongoDB. Files (PDF, XML and TEI) uploaded on tdm-plateform are stored in the server FileSystem

## Documentations
- [Install](#install)
- [Run](#run)
- [Dependencies](#dependencies)
- [Configurations](#configurations)
    - [Web Application configuration](#web-application-configuration)
    - [JWT Configuration](#jwt-configuration)
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


## Run
*[Table of contents](#documentations)*

## Dependencies
*[Table of contents](#documentations)*

Application requires:
- an instance of mongoDB (by default: running on port <code>27017</code> with an <code>app</code> database)

## Configurations
### Web Application Configuration
*[Table of contents](#documentations)*

You must create file <code>conf/conf.json</code> and fill it with your data :
````json
{
  "services": {},
  "mongodb": {
    "url": "mongodb://localhost:27017/tdm-plateform",
    "default": {
      "roles": {
        "id": "6034497eaae2c62a0769d446"
      },
      "organizations": {
        "id": "60344b69aae2c62a0769d449"
      },
      "accounts": {
        "id": "60993ddb0d520b7b28d6a362"
      }
    }
  },
  "fs": {
    "root": "./data"
  },
  "root": "http://localhost:3000/",
  "_reCAPTCHA_site_key_": {
    "public": "publicKey",
    "private": "privateKey"
  },
  "_reCAPTCHA_score_": {
    "limit": 0.75,
    "error": "Authentication failed (captcha score too low)"
  },
  "tokens": {
    "api": {
      "expiresIn": 2592000
    },
    "documents": {
      "expiresIn": 2592000
    },
    "resetPassword": {
      "expiresIn": 3600
    },
    "automaticAccountCreation": {
      "expiresIn": 604800
    }
  }
}
````
### JWT Configuration
*[Table of contents](#documentations)*

This application require a private key to create JSON Web Token
You must create file conf/private.key and fill it with a random string (a long random string is strongly recommended)



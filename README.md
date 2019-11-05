# DataSeer-Web

![Logo DataSeer](/public/img/DataSeer-logo-75.png "Logo")

## Purposes

This repository corresponds to the Dataseer web application, which aims at driving the authors of scientific article/manuscripts to the best research data sharing practices, i.e. to ensure that the datasets coming with an article are associated with data availability statement, permanent identifiers and in general requirements regarding Open Science and reproducibility. 

Machine learning techniques are used to extract and structure the information of the scientific article, to identify contexts introducting datasets and finally to classify these context into predicted data types and subtypes. These ML predictions are used by the web application to help the authors to described in an efficient and assisted manner the datasets used in the article and how these data are shared with the scientific community. 

See the [dataseer-ml](https://github.com/kermitt2/dataseer-ml) repository for the machine learning services used by DataSeer web.

Supported article formats are PDF, docx, TEI, JATS/NLM, ScholarOne, and a large variety of additional publisher native XML formats: BMJ, Elsevier staging format, OUP, PNAS, RSC, Sage, Wiley, etc (see [Pub2TEI](https://github.com/kermitt2/Pub2TEI) for the list of native publisher XML format covered).

## Install

``npm i``

## Run

``npm start``

To enable "demonstration mode" run:

On Linux/MacOS:

``DEMO=true npm start``

On Windows:

``set DEMO=true & npm start``

## Dependencies

Application need an instance of mongoDB running on port `27017`, with an `app` database containing a collection `documents` (`conf/conf.json` to set complete URL).

A set of documents is available at: `resources/importMongoDB.json`

## Description

The project provides: 

  - a web application to process documents stored in MongoDB database (`localhost:3000/documents/:id`)
  - a back office for uploading manually documents to be processed
  - a REST api to load and modify documents data (CRUD) (`localhost:3000/api/documents/:id`)
  
### Web Application

#### Index

![index of web app](/doc/index.png "Index of web app")

#### List of Documents

![list of documents](/doc/documents_list.jpg "List of documents")

#### Metadata

![metadata of a given document](/doc/metadata.jpg "metadata of a given document")

#### Datasets

##### List of Datasets with the form to update a Dataset

![datasets list of a given document](/doc/dataset_list.png "datasets list of a given document")

#### Finish

##### Case document is "not DataSeer"

![finished result of a given document (non dataseer)](/doc/finish.jpg "finished result of a given document (non dataseer)")

##### Case document is "DataSeer"

![finished result of a given document (dataseer)](/doc/finish_dataseer.jpg "finished result of a given document (dataseer)")

### BackOffice

![backOffice of web app](/doc/backoffice.png "BackOffice of web app")

### API

![api result of a given document](/doc/api.jpg "api result of a given document")

## Implementation

MongoDB stores every documents.

Express is used as web framework. 

GUI is built with `Vue.js`.

## Contact and License

Main authors and contact: Nicolas Kieffer, Patrice Lopez (<patrice.lopez@science-miner.com>)

The development of dataseer-ml is supported by a [Sloan Foundation](https://sloan.org/) grant, see [here](https://coko.foundation/coko-receives-sloan-foundation-grant-to-build-dataseer-a-missing-piece-in-the-data-sharing-puzzle/)

DataSeer-Web is distributed under [MIT license](https://opensource.org/licenses/MIT), copyright Aspiration. 

# DataSeer-Web

## Installation

``npm i``

## Run

``npm start``

To enable "demonstration mode" run :

On Linux/MacOS :

``DEMO=true npm start``

On Windows :

``set DEMO=true & npm start``

## Dependancies

Application need an instance of mongoDB running on port 27017, with an "app" database, filled with "documents" collection. (conf/conf.json to set complete URL)

A set of documents is available at : resources/importMongoDB.json

## How it works

MongoDB will store every documents.

Express will provide : 

  - a REST api to modify documents data (CRUD) (localhost:3000/api/documents/:id)
  - a web application to process documents stored in MongoDB database (localhost:3000/documents/:id)

### API

![api result of a given document](/doc/api.jpg "api result of a given document")


### Web Application

#### Index

![index of web app](/doc/index.jpg "Index of web app")

#### BackOffice

![backOffice of web app](/doc/backoffice.jpg "BackOffice of web app")

#### List of Documents

![list of documents](/doc/documents_list.jpg "List of documents")

#### Metadata

![metadata of a given document](/doc/metadata.jpg "metadata of a given document")

#### Datasets

##### List of Datasets

![datasets list of a given document](/doc/dataset_list.jpg "datasets list of a given document")

##### Form to update a Dataset

![dataset form of a given document](/doc/dataset_form.jpg "dataset form of a given document")

#### Finish

##### Case document is "not DataSeer"

![finished result of a given document (non dataseer)](/doc/finish.jpg "finished result of a given document (non dataseer)")

##### Case document is "DataSeer"

![finished result of a given document (dataseer)](/doc/finish_dataseer.jpg "finished result of a given document (dataseer)")


## Contact and License

Main author and contact: Nicolas Kieffer, Patrice Lopez (<patrice.lopez@science-miner.com>)

The development of dataseer-ml is supported by a [Sloan Foundation](https://sloan.org/) grant, see [here](https://coko.foundation/coko-receives-sloan-foundation-grant-to-build-dataseer-a-missing-piece-in-the-data-sharing-puzzle/)

DataSeer-Web is distributed under [MIT license](https://opensource.org/licenses/MIT), copyright Aspiration. 

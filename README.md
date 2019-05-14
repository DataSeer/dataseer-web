# DataSeer

## Installation

``npm i``

## Run

``npm start``

## Dependancies

Application need an instance of mongoDB running on port 27017, with an "app" database, filled with "documents" collection. (conf/conf.json to set complete URL)

An object of "documents" collection looks like file : resources/documentSample.json

## How it works

MongoDB will store every documents.

Express will provide : 

  - a REST api to modify documents data (CRUD) (localhost:3000/api/documents/:id)
  - a web application to process documents stored in MongoDB database (localhost:3000/documents/:id)

### API

  ![api result of a given document](/doc/api.jpg "api result of a given document")


### Web view

  ![metadata of a given document](/doc/metadata.jpg "metadata of a given document")
  ![datasets list of a given document](/doc/api.jpg "datasets list of a given document")
  ![dataset form of a given document](/doc/api.jpg "dataset form of a given document")
  ![finished result of a given document (non dataseer)](/doc/api.jpg "finished result of a given document (non dataseer)")
  ![finished result of a given document (dataseer)](/doc/api.jpg "finished result of a given document (dataseer)")
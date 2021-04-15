# Models documentation

*[Main Documentation](../README.md#documentations)*

  - [Accounts](#accounts)
  - [Organisations](#organisations)
  - [Roles](#roles)
  - [Documents](#documents)
    - [Documents Metadata](#documents-metadata)
    - [Documents Datasets](#documents-datasets)
    - [Documents Files](#documents-files)
    - [Documents Logs](#documents-logs)

Data in this app are structured like below:

Note: all models have additionnal parmaters: `_id` and `__v`.

## Accounts

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "username": { "type": String, "default": "" },
  "hash": { "type": String, "default": "" }, // hidden property, you cannot get it with API
  "salt": { "type": String, "default": "" }, // hidden property, you cannot get it with API
  "fullname": { "type": String, "default": "" },
  "role": { "type": mongoose.Schema.Types.ObjectId, "ref": "Roles", "required": true }, // refers to roles collection item
  "organisation": { "type": mongoose.Schema.Types.ObjectId, "ref": "Organisations", "required": true }, // refers to organisations collection item
  "tokens": { "api": { "type": String, "default": "" }, "resetPassword": { "type": String, "default": "" } } // tokens of user
}
```

## Organisations

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "name": { "type": String, "default": "None", "index": true } // name of organisation
}
```

## Roles

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "label": { "type": String, "default": "", "index": true }, // label of role
  "weight": { "type": Number, "default": 0 } // weight of role
}
```

## Documents

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "logs": [{ "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsLogs", "select": false }], // refers to documents.logs collection items
  "pdf": { "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsFiles" }, // refers to documents.files collection item (pdf)
  "tei": { "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsFiles" }, // refers to documents.files collection item (tei)
  "files": [{ "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsFiles" }], // refers to documents.files collection items (all kind of files)
  "metadata": { "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsMetadata" }, // refers to documents.metadata collection item
  "organisation": { "type": mongoose.Schema.Types.ObjectId, "ref": "Organisations" }, // refers to organisations collection item
  "datasets": { "type": mongoose.Schema.Types.ObjectId, "ref": "DocumentsDatasets" }, // refers to documents.datasets collection item
  "status": { "type": String, "default": "" }, // status of given document
  "isDataSeer": { "type": Boolean, "default": false }, // specify if it"s a dataseer document
  "updated_at": { "type": Date, "default": Date.now }, // date of last update
  "uploaded_at": { "type": Date, "default": Date.now }, // date of upload
  "uploaded_by": { "type": mongoose.Schema.Types.ObjectId, "ref": "Accounts" }, // refers to documents.datasets collection item
  "upload_journal": { "type": mongoose.Schema.Types.ObjectId, "ref": "Organisations" }, // Which journal will be sent to
  "already_assessed": { "type": Boolean, "default": false }, // This is a new version of an article DataSeer has already assessed
  "owner": { "type": mongoose.Schema.Types.ObjectId, "ref": "Accounts" }, // refers to documents.datasets collection item
  "watchers": [{ "type": mongoose.Schema.Types.ObjectId, "ref": "Accounts" }], // refers to documents.accounts collection item
  "token": { "type": String, "default": "" } // refers to documents.datasets collection item
}
```

### Documents Metadata

*[Table of contents](#models-documentation)*

Structure of data:

```js
// Authors
{ name: String, email: String, affiliations: [String] }, { _id: false }

// Metadata
{
  "document": { "type": mongoose.Schema.Types.ObjectId, ref: "Documents" }, // refers to documents collection (id of a given document)
  "article_title": { "type": String, "default": "" }, // articleTitle
  "journal": { "type": String, "default": "" }, // journal
  "publisher": { "type": String, "default": "" }, // publisher
  "date_published": { "type": String, "default": "" }, // date_published
  "manuscript_id": { "type": String, "default": "" }, // manuscriptId
  "submitting_author": { "type": String, "default": "" }, // submittingAuthor
  "submitting_author_email": { "type": String, "default": "" }, // submittingAuthorEmail
  "authors": [Author], // authors. Array(Object) => {"name": String, "affiliations": Array(String) }
  "doi": { "type": String, "default": "" }, // doi
  "pmid": { "type": String, "default": "" } // pmid
}
```

### Documents Datasets

*[Table of contents](#models-documentation)*

Structure of data:

```js
// Dataset
{
  "id": { "type": String, "default": "" }, // id
  "sentenceId": { "type": String, "default": "" }, // sentence id
  "cert": { "type": String, "default": "" }, // cert value (between 0 and 1)
  "dataType": { "type": String, "default": "" }, // dataType
  "subType": { "type": String, "default": "" }, //  subType
  "description": { "type": String, "default": "" }, // description
  "bestDataFormatForSharing": { "type": String, "default": "" }, // best data format for sharing
  "mostSuitableRepositories": { "type": String, "default": "" }, // most suitable repositories
  "DOI": { "type": String, "default": "" }, // DOI
  "name": { "type": String, "default": "" }, // name
  "comments": { "type": String, "default": "" }, // comments
  "text": { "type": String, "default": "" }, // text of sentence
  "status": { "type": String, "default": "saved" } // text of sentence
}

// Datasets
{
  "document": { "type": mongoose.Schema.Types.ObjectId, "ref": "Documents" }, // refers to documents collection (id of a given document)
  "deleted": [Dataset], // deleted datasets (Array of datasets)
  "extracted": [Dataset], // extracted datasets (Array of datasets)
  "current": [Dataset] // current datasets (Array of datasets)
}
```

### Documents Files

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "document": { "type": mongoose.Schema.Types.ObjectId, "ref": "Documents" }, // refers to documents collection (id of a given document)
  "updated_at": { "type": Date, "default": Date.now }, // date of last update
  "uploaded_at": { "type": Date, "default": Date.now }, // date of upload
  "uploaded_by": { "type": mongoose.Schema.Types.ObjectId, "ref": "Accounts" }, // refers to documents.datasets collection item
  "metadata": { "type": Object, "default": {} }, // metadata of file (could be whatever you want, you have to handle it by yourself). Usefull for PDF processed by dataseer-ml
  "filename": { "type": String, "default": "" }, // filename of file
  "path": { "type": String, "default": "", select: false }, // path of file
  "encoding": { "type": String, "default": "" }, // encoding of file
  "md5": { "type": String, "default": "" }, // md5 of file
  "mimetype": { "type": String, "default": "" }, // mimetype of file
  "size": { "type": Number, "default": 0 } // size of file
}
```

### Documents Logs

*[Table of contents](#models-documentation)*

Structure of data:

```js
{
  "document": { "type": mongoose.Schema.Types.ObjectId, "ref": "Documents", "required": true }, // refers to documents collection (id of a given document)
  "user": { "type": mongoose.Schema.Types.ObjectId, "ref": "Accounts", "required": true }, // refers to accounts collection
  "action": { "type": String, "required": true }, // description of modification that has been made to the document
  "date": { "type": Date, "default": Date.now } // date of creation
}
```

# API documentation

*[Main Documentation](../README.md#documentations)*

  - [Responses Status Codes](#response-status-codes)
  - [Credentials](#credentials)
  - [Results](#results)
  - [Available Routes](#available-routes)
    - [Accounts](#accounts)
    - [Roles](#roles)
    - [Organisations](#organisations)
    - [Documents](#documents)
    - [Documents Files](#documents-files)
    - [Documents Datasets](#documents-datasets)
    - [DataSeerML Service](#dataseerml-service)

## Response status codes:

*[Table of contents](#api-documentation)*

<table>
  <thead>
    <tr>
      <th>HTTP Status code</th>
      <th>Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>200</td>
      <td>Successful operation</td>
    </tr>
    <tr>
      <td>401</td>
      <td>Access not granted</td>
    </tr>
    <tr>
      <td>404</td>
      <td>URL no found (route does not exist)</td>
    </tr>
    <tr>
      <td>500</td>
      <td>Internal service error</td>
    </tr>
  </tbody>
</table>

## Credentials

*[Table of contents](#api-documentation)*

You must use your API token to access all of the following routes.

Set your token into HTTP headers (Authorization: Bearer my).

```bash
# Replace MY_TOKEN by your dataseer-web API token
#  use -H "Authorization: Bearer MY_TOKEN" to set headers with curl
$ curl "http://localhost:3000/api/documents/5ffa06e61c157616a5c6bae7" -H "Authorization: Bearer MY_TOKEN"
# Or use token parameter
$ curl "http://localhost:3000/api/documents/5ffa06e61c157616a5c6bae7?token=MY_TOKEN"
```

__If you try to access an unauthorized route, the app will return an HTTP 401 error__

```bash
# HTTP 401 will be returned
$ curl "http://localhost:3000/documents/5ffa06e61c157616a5c6bae7" -H "Authorization: Bearer WRONG_TOKEN"
# > Your current role does not grant you access to this part of the website
#  This error is caused by: a wrong token, an expired token, a blacklisted token 
```

## Results

*[Table of contents](#api-documentation)*

API will return JSON object response with HTTP 200.

### Success

*[Table of contents](#api-documentation)*

In case of success, API will return this kind of object:

```js
{
  "err": false,
  "res": {...}
}
// OR
{
  "err": false,
  "res": [{...}]
}
```

### Error

```js
{
  "err": true,
  "res": null, // or false or undefined
  "msg": "A human-readable message describing the error that occurred"
}
```
 
## Available Routes

*[Table of contents](#api-documentation)*

All these routes return a JSON object:

### Accounts

  - [(GET) /api/accounts](#get-apiaccounts)
  - [(GET) /api/accounts/:id](#get-apiaccountsid)

### Roles

  - [(GET) /api/roles](#get-apiroles)
  - [(GET) /api/roles/:id](#get-apirolesid)

### Oganisations

  - [(GET) /api/organisations](#get-apiorganisations)
  - [(GET) /api/organisations/:id](#get-apiorganisationsid)

### Documents

  - [(GET) /api/documents](#get-apidocuments)
  - [(POST) /api/documents](#post-apidocuments)
  - [(GET) /api/documents/:id](#get-apidocumentsid)
  - [(GET) /api/documents/:id/pdf](#get-apidocumentsidpdf)
  - [(GET) /api/documents/:id/pdf/content](#get-apidocumentsidpdfcontent)
  - [(GET) /api/documents/:id/tei/](#get-apidocumentsidtei)
  - [(GET) /api/documents/:id/tei/content](#get-apidocumentsidteicontent)
  - [(GET) /api/documents/:id/metadata](#get-apidocumentsidmetadata)
  - [(POST) /api/documents/:id/metadata/validate](#post-apidocumentsidmetadatavalidate)
  - [(GET) /api/documents/:id/datasets](#get-apidocumentsiddatasets)
  - [(POST) /api/documents/:id/datasets/validate](#post-apidocumentsiddatasetsvalidate)
  - [(POST) /api/documents/:id/datasets/backToMetadata](#post-apidocumentsiddatasetsbacktometadata)
  - [(POST) /api/documents/:id/finish/reopen](#post-apidocumentsidfinishreopen)
  - [(GET) /api/documents/:id/files](#get-apidocumentsidfiles)

### Documents Files

  - [(GET) /api/files/:id](#get-apifilesid)
  - [(GET) /api/files/:id/buffer](#get-apifilesidbuffer)
  - [(GET) /api/files/:id/string](#get-apifilesidstring)

### Documents Datasets

  - [(PUT) /api/datasets/:id](#put-apidatasetsid)
  - [(POST) /api/datasets/:id/checkValidation](#post-apidatasetsidcheckvalidation)
  - [(POST) /api/datasets/:id/dataset](#post-apidatasetsiddataset)
  - [(PUT) /api/datasets/:id/dataset](#put-apidatasetsiddataset)
  - [(DELETE) /api/datasets/:id/dataset](#delete-apidatasetsiddataset)
  - [(POST) /api/datasets/:id/link](#post-apidatasetsidlink)
  - [(DELETE) /api/datasets/:id/link](#delete-apidatasetsidlink)

### DataSeerML Service

  - [(POST) /api/dataseer-ml/processDataseerSentence](#post-apidataseer-mlprocessdataseersentence)
  - [(GET) /api/dataseer-ml/jsonDataTypes](#get-apidataseer-mljsondatatypes)
  - [(GET) /api/dataseer-ml/resyncJsonDataTypes](#get-apidataseer-mlresyncjsondatatypes)

---

### (GET) /api/accounts/


*[Available Routes](#available-routes)*

#### Description

This route return all accounts (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters


<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>organisation</td>
      <td>optional</td>
      <td>Use this parameter (set it with an organisation id) to filter results by organisation</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>role</td>
      <td>optional</td>
      <td>Use this parameter (set it with a role id) to filter results by role</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/accounts?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": [{...}] // Array of accounts JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/accounts/:id


*[Available Routes](#available-routes)*

#### Description

This route return an account (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the account (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // An account JSON representation (see models section to get more infos)
}
```

---


### (GET) /api/roles/


*[Available Routes](#available-routes)*

#### Description

This route return all roles (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters


<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all roles (JSON formated)
curl "http://localhost:3000/api/roles" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/roles?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": [{...}] // Array of roles JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/roles/:id


*[Available Routes](#available-routes)*

#### Description

This route return a role (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return role (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // A role JSON representation (see models section to get more infos)
}
```

---


### (GET) /api/organisations/


*[Available Routes](#available-routes)*

#### Description

This route return all organisations (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters


<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all organisations (JSON formated)
curl "http://localhost:3000/api/organisations" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/organisations?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": [{...}] // Array of organisations JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/organisations/:id


*[Available Routes](#available-routes)*

#### Description

This route return an organisation (JSON formated).

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the organisation (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/organisations/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/organisations/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // An organisation JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/documents


*[Available Routes](#available-routes)*

#### Description

This route return all documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>pdf</td>
      <td>optional</td>
      <td>If this parameter is set document.pdf will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>tei</td>
      <td>optional</td>
      <td>If this parameter is set document.tei will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>files</td>
      <td>optional</td>
      <td>If this parameter is set document.files will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>metadata</td>
      <td>optional</td>
      <td>If this parameter is set document.metadata will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>datasets</td>
      <td>optional</td>
      <td>If this parameter is set document.datasets will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>logs</td>
      <td>optional</td>
      <td><strong>Only available for curators:</strong><br/>If this parameter is set document.logs will be filled with data.<br/>Else this property will only contain a list of ids.</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the 30 first documents
curl "http://localhost:3000/api/documents?limit=30" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents?limit=30&token=MY_TOKEN"
# Will return from the 10th to the 40th first documents
curl "http://localhost:3000/api/documents?limit=30&skip=10" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents?limit=30&skip=10&token=MY_TOKEN"
# Will return the 20 first documents with data filled for properties: pdf, tei, files, metadata, datasets
curl "http://localhost:3000/api/documents/?pdf=true&tei=true&files=true&metadata=true&datasets=true" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/?pdf=true&tei=true&files=true&metadata=true&datasets=true&token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": [{...}, {...}] // Array of documents
}
```

---

### (POST) /api/documents


*[Available Routes](#available-routes)*

#### Description

This route add new a document (should be used to upload document).

#### Role required

Public access

__Note: If your are not authenticated as curator, you cannot set "mute" or "dataseerML" parameters value.__

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>file</td>
      <td>required</td>
      <td>File of document<br/><i>Supported formats are PDF, JATS/NLM, TEI XML, publisher XML formats for ScholarOne, BMJ, Elsevier (staging format), NPG (Nature), OUP, PNAS, RSC, Sage, Springer and Wiley</i></td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>attachedFiles</td>
      <td>optional</td>
      <td>Files attached to document<br/><i>All formats are supported</i></td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>journal</td>
      <td>required</td>
      <td>Which journal this document will be sent to</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>email</td>
      <td>required</td>
      <td>Email of document owner</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>fullname</td>
      <td>required</td>
      <td>Fullname of document owner</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>dataseerML</td>
      <td>optional</td>
      <td>Specify if dataseer-ml will process this document (default: false, but should be set to true)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>already_assessed</td>
      <td>optional</td>
      <td>Specify if this document has been already assessed (default: false)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>isDataseer</td>
      <td>optional</td>
      <td>Specify if this document is from DataSeer.<br/>Only available if you are authenticated as curator (otherwise the value will be forced to true)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>mute</td>
      <td>optional</td>
      <td>Specify if notifications will be muted.<br/>Only available if you are authenticated as curator (otherwise the value will be forced to false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Upload a document with attached files
curl -X "POST" -F "file=@/path/to/file.pdf" -F "attached_files[]=@/path/to/file.xml" -F "attached_files[]=@/path/to/file.png" -F "journal=journal" -F "email=email@email.com" -F "fullname=Full Name" -F "dataseerML=true" "http://localhost:3000/api/documents"

# Upload a document without attached files
curl -X "POST" -F "file=@/path/to/file.pdf" -F "journal=journal" -F "email=email@email.com" -F "fullname=Full Name" -F "dataseerML=true" "http://localhost:3000/api/documents"

# Upload a document with attached files but do not send email notification

curl -X "POST" -F "file=@/path/to/file.pdf" -F "attached_files[]=@/path/to/file.xml" -F "attached_files[]=@/path/to/file.png" -F "journal=journal" -F "email=email@email.com" -F "fullname=Full Name" -F "dataseerML=true" -F "mute=true" "http://localhost:3000/api/documents"
```

#### Result

```js
{
  "err": false,
  "res": {...} // uploaded document
}
```

---

### (GET) /api/documents/:id


*[Available Routes](#available-routes)*

#### Description

This route return the document with the given id.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>pdf</td>
      <td>optional</td>
      <td>If this parameter is set document.pdf will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>tei</td>
      <td>optional</td>
      <td>If this parameter is set document.tei will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>files</td>
      <td>optional</td>
      <td>If this parameter is set document.files will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>metadata</td>
      <td>optional</td>
      <td>If this parameter is set document.metadata will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>datasets</td>
      <td>optional</td>
      <td>If this parameter is set document.datasets will be filled with data.<br/>Else this property will only contain an id.</td>
    </tr>
  </tbody>
</table>

#### How to request

##### Get "light version" of a given document

```bash
# Will return document (with id 60479f995e905b3e479e02e1) without data for: pdf, tei, files, metadata, datasets
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1?token=MY_TOKEN"
```

```js
{
  "err": false,
  "res": {
    "logs": [
      "60479fa55e905b3e479e02e6",
      "60479fe25e905b3e479e02e7",
      "6047a07c5e905b3e479e02e8",
      "6047a1cd5e905b3e479e02e9",
      "6047a1d25e905b3e479e02ea",
      "6047bb7a5e905b3e479e02eb"
    ],
    "files": [
      "60479f995e905b3e479e02e2",
      "60479fa55e905b3e479e02e3"
    ],
    "status": "metadata",
    "isDataSeer": false,
    "already_assessed": false,
    "watchers": [
      "5e2f6afe0bb7cd4cdfba9f03",
      "5e2f6b4c0bb7cd4cdfba9f05",
      "603fd834d56f3907b75dcbe0"
    ],
    "token": "eyJhbGciOi...VtcnaB4eTQ",
    "_id": "60479f995e905b3e479e02e1",
    "uploaded_by": "5e2f6afe0bb7cd4cdfba9f03",
    "updated_at": "2021-03-09T16:17:29.556Z",
    "uploaded_at": "2021-03-09T16:17:29.556Z",
    "__v": 9,
    "metadata": "60479fa55e905b3e479e02e4",
    "organisation": "60344b86aae2c62a0769d44a",
    "owner": "5e2f6afe0bb7cd4cdfba9f03",
    "pdf": "60479f995e905b3e479e02e2",
    "tei": "60479fa55e905b3e479e02e3",
    "upload_journal": "60344b86aae2c62a0769d44a",
    "datasets": "60479fa55e905b3e479e02e5"
  }
}
```


##### Get "full version" of a given document

```bash
# Will return document (with id 60479f995e905b3e479e02e1) with data filled for properties: pdf, tei, files, metadata, datasets
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1?pdf=true&tei=true&files=true&metadata=true&datasets=true" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1?pdf=true&tei=true&files=true&metadata=true&datasets=true&token=MY_TOKEN"
```

```js
{
  "err": false,
  "res": {
    "logs": [
      "60479fa55e905b3e479e02e6",
      "60479fe25e905b3e479e02e7",
      "6047a07c5e905b3e479e02e8",
      "6047a1cd5e905b3e479e02e9",
      "6047a1d25e905b3e479e02ea",
      "6047bb7a5e905b3e479e02eb"
    ],
    "files": [{...},{...}],
    "status": "metadata",
    "isDataSeer": false,
    "already_assessed": false,
    "watchers": [
      "5e2f6afe0bb7cd4cdfba9f03",
      "5e2f6b4c0bb7cd4cdfba9f05",
      "603fd834d56f3907b75dcbe0"
    ],
    "token": "eyJhbGciOi...VtcnaB4eTQ",
    "_id": "60479f995e905b3e479e02e1",
    "uploaded_by": "5e2f6afe0bb7cd4cdfba9f03",
    "updated_at": "2021-03-09T16:17:29.556Z",
    "uploaded_at": "2021-03-09T16:17:29.556Z",
    "__v": 9,
    "metadata": {...},
    "organisation": "60344b86aae2c62a0769d44a",
    "owner": "5e2f6afe0bb7cd4cdfba9f03",
    "pdf": {...},
    "tei": {...},
    "upload_journal": "60344b86aae2c62a0769d44a",
    "datasets": {
      "_id": "60479fa55e905b3e479e02e5",
      "document": "60479f995e905b3e479e02e1",
      "extracted": [{...}],
      "current": [{...}],
      "deleted":  [{...}],
      "__v": 0
    }
  }
}
```

#### Result

```js
{
  "err": false,
  "res": {...} // given document
}
```

---

### (GET) /api/documents/:id/pdf


*[Available Routes](#available-routes)*

#### Description

This route return the pdf (JSON format) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the pdf (JSON format) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/pdf" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/pdf?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // pdf data of the document (see models section to get more infos)
}
```

---

### (GET) /api/documents/:id/pdf/content


*[Available Routes](#available-routes)*

#### Description

This route return the pdf (binary file) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the pdf (binary file) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/pdf/content" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/pdf/content?token=MY_TOKEN"
```

#### Result

```
Binary file

```

---

### (GET) /api/documents/:id/tei


*[Available Routes](#available-routes)*

#### Description

This route return the tei (JSON format) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the tei (JSON format) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/tei" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/tei?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // tei data of the document (see models section to get more infos)
}
```

---

### (GET) /api/documents/:id/tei/content


*[Available Routes](#available-routes)*

#### Description

This route return the tei (binary file) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the tei (binary file) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/tei/content" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/tei/content?token=MY_TOKEN"
```

#### Result

```
Binary file

```

---

### (GET) /api/documents/:id/metadata


*[Available Routes](#available-routes)*

#### Description

This route return the metadata (JSON formated) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the metadata (JSON formated) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/metadata" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/metadata?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // metadata of the document (see models section to get more infos)
}
```

---

### (POST) /api/documents/:id/metadata/validate


*[Available Routes](#available-routes)*

#### Description

This route validate the "metadata" step of the given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will validate the "metadata" step of the document (with id 60479f995e905b3e479e02e1)
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/metadata/validate" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/metadata/validate?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true
}
```

---

### (GET) /api/documents/:id/datasets


*[Available Routes](#available-routes)*

#### Description

This route return the datasets (JSON formated) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the datasets (JSON formated) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // datasets of the document (see models section to get more infos)
}
```

---

### (POST) /api/documents/:id/datasets/validate


*[Available Routes](#available-routes)*

#### Description

This route validate the "datasets" step of the given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will validate the "datasets" step of the document (with id 60479f995e905b3e479e02e1)
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets/validate" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets/validate?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true
}
```

---

### (POST) /api/documents/:id/datasets/backToMetadata


*[Available Routes](#available-routes)*

#### Description

This route return the given document to the "metadata" step.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the given document (with id 60479f995e905b3e479e02e1) to the "metadata" step
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets/validate" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/datasets/validate?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true
}
```

---

### (POST) /api/documents/:id/finish/reopen


*[Available Routes](#available-routes)*

#### Description

This route return the given document to the "metadata" step.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the given document (with id 60479f995e905b3e479e02e1) to the "metadata" step
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/finish/reopen" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/finish/reopen?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true
}
```

---

### (GET) /api/documents/:id/files


*[Available Routes](#available-routes)*

#### Description

This route return all files (JSON formated) of given documents.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return all files (JSON formated) of the document (with id 60479f995e905b3e479e02e1)
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/files" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/60479f995e905b3e479e02e1/files?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": [{...}] // Array of file JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/files/:id


*[Available Routes](#available-routes)*

#### Description

This route return a given file (JSON formated).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the files (JSON formated) with id 60479f995e905b3e479e02e1
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {...} // file JSON representation (see models section to get more infos)
}
```

---

### (GET) /api/files/:id/buffer


*[Available Routes](#available-routes)*

#### Description

This route return a given file (Buffer formated).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the files (Buffer formated) with id 60479f995e905b3e479e02e1
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files/buffer" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files/buffer?token=MY_TOKEN"
```

#### Result

```
Buffer
```

---

### (GET) /api/files/:id/string


*[Available Routes](#available-routes)*

#### Description

This route return a given file (String formated).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the files (String formated) with id 60479f995e905b3e479e02e1
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files/string" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/files/60479f995e905b3e479e02e1/files/string?token=MY_TOKEN"
```

#### Result

```
UTF-8 String
```

---

### (PUT) /api/datasets/:id


*[Available Routes](#available-routes)*

#### Description

This route update diven datasets.

#### Role required

Accessible to users with the following role : **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>current</td>
      <td>optional</td>
      <td>current datasets infos (see Models to get mores infos)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>deleted</td>
      <td>optional</td>
      <td>deleted datasets infos (see Models to get mores infos)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>extracted</td>
      <td>optional</td>
      <td>extracted datasets infos (see Models to get mores infos)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will update extracted property of datasets with id 60479f995e905b3e479e02e1
curl -X "PUT" -F "extracted=[{...}]" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1" -H "Authorization: Bearer MY_TOKEN"
curl -X "PUT" -F "extracted=[{...}]" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true
}
```

---

### (POST) /api/datasets/:id/checkValidation


*[Available Routes](#available-routes)*

#### Description

Check validation of all current datasets.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will check validation of all current datasets with id 60479f995e905b3e479e02e1
curl -X "POST" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/checkValidation" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/checkValidation?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": true // or false if validation failed
}
```

---

### (POST) /api/datasets/:id/dataset


*[Available Routes](#available-routes)*

#### Description

Add a new dataset and link it to a sentence (You cannot just add a dataset without linking it to a sentence).

Notes: You don't have to call the route [(POST) /api/datasets/:id/link](#post-apidatasetsidlink)).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>dataset</td>
      <td>optional</td>
      <td>the dataset infos</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>sentence</td>
      <td>optional</td>
      <td>the sentence infos</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will add new dataset to datasets with id 60479f995e905b3e479e02e1
curl -X "POST" -F "dataset={...}" -F "sentence={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" -F "dataset={...}" -F "sentence={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset?token=MY_TOKEN"
```

```js
// dataset params structure (sent to the API) (more informations about available properties in the "models" documentation)
// "dataset.id" & "dataset.dataInstanceId" & "dataset.sentences" cannot be updated, so they will be ignored
let dataset = {...};
// sentence params structure is like:
let sentence = {"id":"sentence-1"};
```

#### Result

```js
// the "res" property will contain the complete dataset (more informations about it in the "models" documentation)
{
  "err": false,
  "res": {...}
}
```

---

### (PUT) /api/datasets/:id/dataset


*[Available Routes](#available-routes)*

#### Description

Update given dataset of datasets with given id.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>PUT</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>dataset</td>
      <td>optional</td>
      <td>the dataset infos</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will add update given dataset of datasets with id 60479f995e905b3e479e02e1
curl -X "PUT" -F "dataset={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset" -H "Authorization: Bearer MY_TOKEN"
curl -X "PUT" -F "dataset={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset?token=MY_TOKEN"
```

```js
// dataset params structure (sent to the API) must have all properties set (more informations about available properties in the "models" documentation)
// Note: "dataset.dataInstanceId" & "dataset.sentences" cannot be updated, so they will be ignored.
let dataset = {...}
```

#### Result

```js
// the "res" property will contain the complete dataset (more informations about it in the "models" documentation)
{
  "err": false,
  "res": {...}
}
```

---

### (DELETE) /api/datasets/:id/dataset


*[Available Routes](#available-routes)*

#### Description

Delete the given dataset (of the datasets list) with given id.

Note: It will delete all dataset links (both in TEI & mongoDB).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>DELETE</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>dataset</td>
      <td>optional</td>
      <td>the dataset infos</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will update given dataset of datasets with id 60479f995e905b3e479e02e1
curl -X "DELETE" -F "dataset={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset" -H "Authorization: Bearer MY_TOKEN"
curl -X "DELETE" -F "dataset={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/dataset?token=MY_TOKEN"
```

```js
// dataset params structure (sent to the API)
let dataset = {"id":"dataset-1"}
```

#### Result

```js
// the "res" property will contain the complete dataset (more informations about it in the "models" documentation)
{
  "err": false,
  "res": {...}
}
```

---

### (POST) /api/datasets/:id/link


*[Available Routes](#available-routes)*

#### Description

Add new link to datasets with given id.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>link</td>
      <td>required</td>
      <td>new link</td>
    </tr>
  </tbody>
</table>

#### How to request

opts.dataset.id
opts.sentence.id
opts.sentence.text

```bash
# Will add new link to datasets with id 60479f995e905b3e479e02e1
curl -X "POST" -F "link={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/link" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" -F "link={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/link?token=MY_TOKEN"
```

```js
// Link data structure
let link = {
  "sentence":{"id":"sentence-1"},
  "dataset":{"id":"dataset-1"}
}
```

#### Result

```js
// the "res" property will contain the complete dataset (more informations about it in the "models" documentation)
{
  "err": false,
  "res": {...}
}
```

---

### (DELETE) /api/datasets/:id/link


*[Available Routes](#available-routes)*

#### Description

Delete given link of datasets with given id.

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>DELETE</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>link</td>
      <td>required</td>
      <td>deleted link</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will update given link of datasets with id 60479f995e905b3e479e02e1
curl -X "DELETE" -F "link={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/link" -H "Authorization: Bearer MY_TOKEN"
curl -X "DELETE" -F "link={...}" "http://localhost:3000/api/datasets/60479f995e905b3e479e02e1/link?token=MY_TOKEN"
```

```js
// Link data structure
let link = {
  "sentence":{"id":"sentence-1"},
  "dataset":{ "id":"dataset-1" }
}
```

#### Result

```js
// the "res" property will contain the complete dataset (more informations about it in the "models" documentation)
{
  "err": false,
  "res": {...}
}
```

---

### (POST) /api/dataseer-ml/processDataseerSentence


*[Available Routes](#available-routes)*

#### Description

Process sentence (send data to dataseer-ml service).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Request type</th>
      <th>Response type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>POST</td>
      <td>application/x-www-form-urlencoded</td>
      <td>application/json</td>
      <td>text</td>
      <td>required</td>
      <td>Sentence (String)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will process sentence (send data to dataseer-ml service)
curl -X "POST" -F "text=my sentence" "http://localhost:3000/api/dataseer-ml/processDataseerSentence" -H "Authorization: Bearer MY_TOKEN"
curl -X "POST" -F "text=my sentence" "http://localhost:3000/api/dataseer-ml/processDataseerSentence?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {} // result returned by dataseer-ml service
}
```

---

### (GET) /api/dataseer-ml/jsonDataTypes

*[Available Routes](#available-routes)*

#### Description

This route return dataTypes used by the app (JSON formatted).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return dataTypes used by the app (JSON formatted)
curl "http://localhost:3000/api/dataseer-ml/jsonDataTypes" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/dataseer-ml/jsonDataTypes?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {} // result returned by dataseer-ml service (reformatted for dataseer-web)
}
```

---

### (GET) /api/dataseer-ml/resyncJsonDataTypes


*[Available Routes](#available-routes)*

#### Description

This route resync dataTypes used by the app (JSON formatted).

#### Role required

Accessible to users with the following role : **santard_user**, **annotator**, **curator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will resync dataTypes used by the app (JSON formatted)
curl "http://localhost:3000/api/dataseer-ml/jsonDataTypes" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/dataseer-ml/jsonDataTypes?token=MY_TOKEN"
```

#### Result

```js
{
  "err": false,
  "res": {} // result returned by dataseer-ml service (reformatted for dataseer-web)
}
```

---

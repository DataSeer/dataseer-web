# Documents

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/documents](#get-apidocuments)
  - [(POST) /api/documents](#post-apidocuments)
  - [(PUT) /api/documents](#put-apidocuments)
  - [(DELETE) /api/documents](#delete-apidocuments)
  - [(GET) /api/documents/:id](#get-apidocumentsid)
  - [(PUT) /api/documents/:id](#put-apidocumentsid)
  - [(DELETE) /api/documents/:id](#delete-apidocumentsid)
  - [(POST) /api/documents/:target/importDatasets/:source](#post-apidocumentstargetimportdatasetssource)
  - [(PUT) /api/documents/:id/datasets](#put-apidocumentsiddatasets)
  - [(GET) /api/documents/:id/logs](#get-apidocumentsidlogs)
  - [(GET) /api/documents/:id/files](#get-apidocumentsidfiles)
  - [(GET) /api/documents/:id/softcite](#get-apidocumentsidsoftcite)
  - [(GET) /api/documents/:id/softcite/content](#get-apidocumentsidsoftcitecontent)
  - [(GET) /api/documents/:id/pdf](#get-apidocumentsidpdf)
  - [(GET) /api/documents/:id/pdf/content](#get-apidocumentsidpdfcontent)
  - [(GET) /api/documents/:id/tei](#get-apidocumentsidtei)
  - [(GET) /api/documents/:id/tei/content](#get-apidocumentsidteicontent)
  - [(PUT) /api/documents/:id/tei/content](#put-apidocumentsidteicontent)
  - [(GET) /api/documents/:id/reports/html/bioRxiv](#get-apidocumentsidreportshtmlbiorxiv)
  - [(GET) /api/documents/:id/reports/html/default](#get-apidocumentsidreportshtmldefault)
  - [(GET) /api/documents/:id/reports/docx/default](#get-apidocumentsidreportsdocxdefault)
  - [(GET) /api/documents/:id/reports/gSpreadsheets/:kind](#get-apidocumentsidreportsgspreadsheetskind)
  - [(POST) /api/documents/:id/reports/gSpreadsheets/:kind](#post-apidocumentsidreportsgspreadsheetskind)
  - [(GET) /api/documents/:id/charts/asap](#get-apidocumentsidchartsasap)
  - [(POST) /api/documents/:id/refreshToken](#post-apidocumentsidrefreshtoken)
  - [(POST) /api/documents/:id/metadata/reload](#post-apidocumentsidmetadatareload)
  - [(POST) /api/documents/:id/metadata/validate](#post-apidocumentsidmetadatavalidate)
  - [(POST) /api/documents/:id/datasets/backToMetadata](#post-apidocumentsiddatasetsbacktometadata)
  - [(POST) /api/documents/:id/finish/reopen](#post-apidocumentsidfinishreopen)
  - [(POST) /api/documents/:id/processOCR](#post-apidocumentsidprocessocr)
  - [(POST) /api/documents/:id/detectNewSentences](#post-apidocumentsiddetectnewsentences)

---

# (GET) /api/documents

*[List of Documents routes](#documents)*

## Description

This route return all documents (JSON formated)

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

Note: [more info about data access restrictions here](../README.md#data-access)

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Integer</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>sort</td>
      <td>optional</td>
      <td>Sort (available values: 'asc' or 'desc', default:'desc')</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>optional</td>
      <td>Add filter on documents ids (default: undefined)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optionnal</td>
      <td>Add filter on organizations ids (default: undefined)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>visibleStates</td>
      <td>optionnal</td>
      <td>Add filter on visible values (default: undefined, available: [true, false])</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>lockedStates</td>
      <td>optionnal</td>
      <td>Add filter on locked values (default: undefined, available: [true, false])</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>uploadRange</td>
      <td>optionnal</td>
      <td>A range of day(s).<br/>Example: set it to '30' will filter documents uploaded the lasts 30 days.</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>updateRange</td>
      <td>optionnal</td>
      <td>A range of day(s).<br/>Example: set it to '30' will filter documents updated the lasts 30 days.</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>uploadedBefore</td>
      <td>optionnal</td>
      <td>The date before which the document was uploaded</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>uploadedAfter</td>
      <td>optionnal</td>
      <td>The date after which the document was uploaded</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>updatedBefore</td>
      <td>optionnal</td>
      <td>The date before which the document was updated</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>updatedAfter</td>
      <td>optionnal</td>
      <td>The date after which the document was updated</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>pdf</td>
      <td>optionnal</td>
      <td>Populate property pdf (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>tei</td>
      <td>optionnal</td>
      <td>Populate property tei (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>files</td>
      <td>optionnal</td>
      <td>Populate property files (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>metadata</td>
      <td>optionnal</td>
      <td>Populate property metadata (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>datasets</td>
      <td>optionnal</td>
      <td>Populate property datasets (default: false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & accounts ids before calling this API route
# Each filter add an OR condition (not and AND condition). So if there are 2 filters, it will return all items matching filter1 OR filter2
# Will return all documents (JSON formated)
curl "http://localhost:3000/api/documents"
# Will return documents with ids 000000000000000000000000 & 000000000000000000000001 (JSON formated)
curl "http://localhost:3000/api/documents?ids=000000000000000000000000,000000000000000000000001"
# Will return documents with organizations 000000000000000000000002 & 000000000000000000000003 (JSON formated)
curl "http://localhost:3000/api/documents?organizations=000000000000000000000002,000000000000000000000003"
# Will return documents with owner 000000000000000000000004 & 000000000000000000000005 (JSON formated)
curl "http://localhost:3000/api/documents?owner=000000000000000000000004,000000000000000000000005"
# Will return documents with visibility property set to true (JSON formated)
curl "http://localhost:3000/api/documents?visibleState=true"
# Will return documents uploaded after the 12/12/12 (JSON formated)
curl "http://localhost:3000/api/documents?uploadedAfter=12-12-12"
# Will return documents uploaded the lasts 20 days
curl "http://localhost:3000/api/documents?uploadedRange=20"
# Will return documents with property "tei" populated (with data from document.tei collection in this object)
curl "http://localhost:3000/api/documents?tei=true"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // Array of documents JSON representation
}
```

---

# (POST) /api/documents

*[List of Documents routes](#documents)*

## Description

This route create a new document

## Role required

The is a public URL, but some parameters coulb be restricted (depending on your role).

**unauthenticated**: it will be uploaded with all default values.

**visitor**, **standardUser**, **moderator**, **administrator**: [more info about data access restrictions here](../README.md#data-access)

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>File</td>
      <td>file</td>
      <td>required</td>
      <td>The file you want upload on DataSeer (TEI or PDF)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>attachedFiles</td>
      <td>optional</td>
      <td>List of attached files (default: undefined)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>List of organizations (default: the default organization(s))</td>
    </tr>
    <tr>
      <td>String</td>
      <td>owner</td>
      <td>optional</td>
      <td>Set document owner (default: the default visitor account). A visitor/standardUser will obligatorily be the owner. Only administrators/moderators can use it.</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Set document visibility (default: true). A standardUser cannot see an invisible document.</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>locked</td>
      <td>optional</td>
      <td>Set document lock (default: false). A locked document cannot be modified.</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>mute</td>
      <td>optional</td>
      <td>Mute the email notification (default: false). Only administrators/moderators can use it).</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>dataseerML</td>
      <td>optional</td>
      <td>Process dataseer-ml (default: true). Only administrators/moderators can use it).</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & accounts ids before calling this API route
# Will return the uploaded documents (JSON formated)
curl -X POST -F "file=@/path/to/my/file.pdf" "http://localhost:3000/api/documents" # Will upload the file with your account infos
# Upload a document as a moderator/administrator
curl -X POST -F "file=@/path/to/my/file.pdf" -F "mute=true" -F "dataseerML=false" -F "owner=000000000000000000000001" -F "organizations=000000000000000000000002,000000000000000000000003" "http://localhost:3000/api/documents" # Will upload the selected options
```

## Result

```json
{
  "err": false,
  "res": {...} // A document JSON representation
}
```

---

# (PUT) /api/documents

*[List of Documents routes](#documents)*

## Description

This route updates multiple documents and return all actions results (JSON formatted).

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>required</td>
      <td>Array of documents ids</td>
    </tr>
    <tr>
      <td>String</td>
      <td>owner</td>
      <td>optional</td>
      <td>Owner (account id) of the document</td>
    </tr>
    <tr>
      <td>String</td>
      <td>name</td>
      <td>optional</td>
      <td>Name of the document</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ids of the document</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the document (true or false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>locked</td>
      <td>optional</td>
      <td>Locked state of the document (true or false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & roles ids before calling this API route
# Will return all infos about updates (JSON formated)
curl -X PUT -F "ids=000000000000000000000000,000000000000000000000001" -F "name=my document name" -F "organizations=..." -F "owner=000000000000000000000003" "http://localhost:3000/api/documents"
```

## Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per account)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

# (DELETE) /api/documents

*[List of Documents routes](#documents)*

## Description

This route deletes multiple documents and return all actions results (JSON formatted).

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>required</td>
      <td>Array of documents ids</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return all infos about deletes (JSON formated)
curl -X DELETE -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/documents"
```

## Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per account)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

# (GET) /api/documents/:id

*[List of Documents routes](#documents)*

## Description

This route return the given documents (JSON formated)

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

Note: [more info about data access restrictions here](../README.md#data-access)

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Boolean</td>
      <td>pdf</td>
      <td>optionnal</td>
      <td>Populate property pdf (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>tei</td>
      <td>optionnal</td>
      <td>Populate property tei (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>files</td>
      <td>optionnal</td>
      <td>Populate property files (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>metadata</td>
      <td>optionnal</td>
      <td>Populate property metadata (default: false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>datasets</td>
      <td>optionnal</td>
      <td>Populate property datasets (default: false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001"
# Will return the given document with property "tei" populated (with data from document.tei collection in this object)
curl "http://localhost:3000/api/documents/000000000000000000000001?tei=true"
```

## Result

```json
{
  "err": false,
  "res": {...} // The document 000000000000000000000001 JSON representation
}
```

---

# (PUT) /api/documents/:id

*[List of Documents routes](#documents)*

## Description

This route updates the given document (JSON formatted).

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>String</td>
      <td>owner</td>
      <td>optional</td>
      <td>Owner (account id) of the document</td>
    </tr>
    <tr>
      <td>String</td>
      <td>name</td>
      <td>optional</td>
      <td>Name of the document</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ids of the document</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the document (true or false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>locked</td>
      <td>optional</td>
      <td>Locked state of the document (true or false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & roles ids before calling this API route
# Will return the given updated document (JSON formated)
curl -X PUT -F "name=my document name" -F "organizations=..." -F "owner=000000000000000000000003" "http://localhost:3000/api/documents/000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": {...} // The document 000000000000000000000001 JSON representation
}
```

---

# (DELETE) /api/documents/:id

*[List of Documents routes](#documents)*

## Description

This route deletes the given document (JSON formatted).

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

Note:  **standardUser**, **moderator** do not really delete the document (document will be locked and invisible). Only **administrator** delete all data (FileSystem & mongodb).

## Parameters

No parameter avaialble.

## How to request

```bash
# Will return the given deleted document (JSON formated)
curl -X DELETE "http://localhost:3000/api/documents/000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": {...} // The document 000000000000000000000001 JSON representation
}
```

---

# (POST) /api/documents/:target/importDatasets/:source

*[List of Documents routes](#documents)*

## Description

This route imports dataset from a given document (:source) to another document (:target) and return the result of this process (JSON formatted).

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameter avaialble.

## How to request

```bash
# Will import datasets from document 000000000000000000000002 to document 000000000000000000000001
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/importDatasets/000000000000000000000002"
```

## Result

```json
{
  "err": false,
  "res": {
    "rejected": [], // list of rejected dataset(s) (that not match with sentences of this document)
    "merged": [], // list of merged dataset(s) (automatically merged)
    "mergeable": [] // list of mergeable dataset(s) (that match with some sentences of this document, but with a "insufficient" score. It won't be automatically merged)
  }
}
```

---

# (PUT) /api/documents/:id/datasets

*[List of Documents routes](#documents)*

## Description

This route updates the datasets of the given document (JSON formatted). 

## Role required

Accessible to users with the following role: **administrator**.

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Object</td>
      <td>datasets</td>
      <td>optional</td>
      <td>A datasets JSON representation containing all data (see model for more infos).<br/>Note: it will only update defined keys</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the given updated document (JSON formated)
curl -X PUT -d @/path/to/my/file.json "http://localhost:3000/api/documents/000000000000000000000001/datasets"
curl -X PUT -F "{datasets:{...}}" "http://localhost:3000/api/documents/000000000000000000000001/datasets"
```

## Result

```json
{
  "err": false,
  "res": {...} // The document 000000000000000000000001 JSON representation
}
```

---

# (GET) /api/documents/:id/logs

*[List of Documents routes](#documents)*

## Description

This route get the logs of the given document (JSON formatted).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the logs of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/logs"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // An array of logs (see models documentation)
}
```

---

# (GET) /api/documents/:id/files

*[List of Documents routes](#documents)*

## Description

This route get the files of the given document (JSON formatted).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the files of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/files"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // An array of files (see models documentation)
}
```

---

# (GET) /api/documents/:id/softcite

*[List of Documents routes](#documents)*

## Description

This route get the softcite file of the given document (JSON formatted).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the softcite file of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/softcite"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON file representation of the softcite file (see models documentation)
}
```

---

# (GET) /api/documents/:id/softcite/content

*[List of Documents routes](#documents)*

## Description

This route get the softcite file content of the given document (JSON formatted).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the softcite file content of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/softcite/content"
```

## Result

The JSON file

---

# (GET) /api/documents/:id/pdf

*[List of Documents routes](#documents)*

## Description

This route get the pdf file of the given document (JSON format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the pdf file of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/pdf"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON file representation of the PDF (see models documentation)
}
```

---

# (GET) /api/documents/:id/pdf/content

*[List of Documents routes](#documents)*

## Description

This route get the pdf file content of the given document (PDF format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the pdf file content of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/pdf/content"
```

## Result

The PDF binary

---

# (GET) /api/documents/:id/tei

*[List of Documents routes](#documents)*

## Description

This route get the tei file of the given document (JSON formatted).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the tei file of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/tei"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON file representation of the TEI (see models documentation)
}
```

---

# (GET) /api/documents/:id/tei/content

*[List of Documents routes](#documents)*

## Description

This route get the tei file content of the given document (TEI format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the tei file content of the given document (JSON formated)
curl "http://localhost:3000/api/documents/000000000000000000000001/tei/content"
```

## Result

The TEI binary

---

# (PUT) /api/documents/:id/tei/content

*[List of Documents routes](#documents)*

## Description

This route update the tei file content of the given document (TEI format). It will refresh all attached data (datasets, file metadata, sentences metadata, etc).

## Role required

Accessible to users with the following role: **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the updated tei file of the given document (JSON formated)
curl -X PUT -F "file=@/path/to/my/file.tei" "http://localhost:3000/api/documents/000000000000000000000001/tei/content"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON file representation of the TEI (see models documentation)
}
```

---

# (GET) /api/documents/:id/reports/html/bioRxiv

*[List of Documents routes](#documents)*

## Description

This route get the HTML report generated with the "bioRxiv template" (HTML format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/html/bioRxiv"
```

## Result

The HTML report

---

# (GET) /api/documents/:id/reports/html/default

*[List of Documents routes](#documents)*

## Description

This route get the HTML report generated with the "default template" (HTML format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/html/default"
```

## Result

The HTML report

---

# (GET) /api/documents/:id/reports/docx/default

*[List of Documents routes](#documents)*

## Description

This route get the .docx report generated with the "default template" (.docx format).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/docx/default"
```

## Result

The .docx report

---

# (GET) /api/documents/:id/reports/gSpreadsheets/:kind

*[List of Documents routes](#documents)*

## Description

This route get the google report generated with the given "kind". (available values : AmNat or ASAP)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/gSpreadsheets/AmNat"
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/gSpreadsheets/ASAP"
```

## Result

```json
{
  "err": false,
  "res": "THE GOOGLE DRIVE FILE ID"
}
```

---

# (POST) /api/documents/:id/reports/gSpreadsheets/:kind

*[List of Documents routes](#documents)*

## Description

This route generate the google report with the given "kind". (available values : AmNat or ASAP)

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/gSpreadsheets/AmNat"
curl "http://localhost:3000/api/documents/000000000000000000000001/reports/gSpreadsheets/ASAP"
```

## Result

```json
{
  "err": false,
  "res": "THE GOOGLE DRIVE FILE ID"
}
```

---

# (GET) /api/documents/:id/charts/asap

*[List of Documents routes](#documents)*

## Description

This route get the ASAP Graphics (HTML format or image).

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>String</td>
      <td>render</td>
      <td>optional</td>
      <td>Charts will be server-side rendered (available values: 'html', 'jpeg', 'png', 'webp')</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>width</td>
      <td>optional</td>
      <td>Width of the rendered image (min/max values: [0-1920]; default value: 1600)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>height</td>
      <td>optional</td>
      <td>Height of the rendered content (min/max values: [0-1080]; default value: 900)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>quality</td>
      <td>optional</td>
      <td>Quality of the rendered image (min/max values: [0-100]; default value: 95). The "render" parameter must contain the value "jpeg", "png" or "webp".</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>maxNumberOfSubSlices</td>
      <td>optional</td>
      <td>Maximum number of sub slices (default: 20)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>customData</td>
      <td>optional</td>
      <td>The chart will be built with the provided data only (default value: false)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>
        reUseDatasetsName<br/>
        reUseMaterialsName<br/>
        reUseProtocolsName<br/>
        reUseCodesName<br/>
        newDatasetsName<br/>
        newCodesName<br/>
        newMaterialsName<br/>
        newProtocolsName<br/>
      </td>
      <td>optional</td>
      <td>Define custom text in charts labels</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>
        reUseDatasetsDone<br/>
        reUseCodesDone<br/>
        reUseMaterialsDone<br/>
        reUseProtocolsDone<br/>
        newDatasetsDone<br/>
        newCodesDone<br/>
        newMaterialsDone<br/>
        newProtocolsDone<br/>
      </td>
      <td>optional</td>
      <td>Define custom value for 'done' values in charts labels</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>
        reUseDatasetsTotal<br/>
        reUseCodesTotal<br/>
        reUseMaterialsTotal<br/>
        reUseProtocolsTotal<br/>
        newDatasetsTotal<br/>
        newCodesTotal<br/>
        newMaterialsTotal<br/>
        newProtocolsTotal<br/>
      </td>
      <td>optional</td>
      <td>Define custom value for 'total' values in charts labels</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Using this URL will return the HTML source which must be interpreted by your browser (graphics will not be rendered)
curl "http://localhost:3000/api/documents/000000000000000000000001/charts/asap"
# Using this URL will return the HTML source containing all charts
curl "http://localhost:3000/api/documents/000000000000000000000001/charts/asap?render=html"
# Using this URL will return the image (jpeg format) containing all charts
curl "http://localhost:3000/api/documents/000000000000000000000001/charts/asap?render=jpeg"
# Using this URL will return the image (jpeg format) containing custom values
curl "http://localhost:3000/api/documents/000000000000000000000001/charts/asap?render=jpeg&reUseDatasetsName=reUseDatasetsName&reUseMaterialsName=reUseMaterialsName&reUseProtocolsName=reUseProtocolsName&reUseCodesName=reUseCodesName&newDatasetsName=newDatasetsName&newCodesName=newCodesName&newMaterialsName=newMaterialsName&newProtocolsName=newProtocolsName&reUseDatasetsDone=1&reUseCodesDone=1&reUseMaterialsDone=1&reUseProtocolsDone=1&newDatasetsDone=1&newCodesDone=1&newMaterialsDone=1&newProtocolsDone=1&reUseDatasetsTotal=3&reUseCodesTotal=3&reUseMaterialsTotal=3&reUseProtocolsTotal=3&newDatasetsTotal=3&newCodesTotal=3&newMaterialsTotal=3&newProtocolsTotal=3"
```

## Result

The ASAP Graphics (HTML format or image)

---

# (POST) /api/documents/:id/refreshToken

*[List of Documents routes](#documents)*

## Description

This route refresh the document token.

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/refreshToken"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document (see models documentation)
}
```

---

# (POST) /api/documents/:id/metadata/reload

*[List of Documents routes](#documents)*

## Description

This route reload the document metadata.

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/metadata/reload"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document metadata (see models documentation)
}
```

---

# (POST) /api/documents/:id/metadata/validate

*[List of Documents routes](#documents)*

## Description

This route validate the document metadata (set status "datasets" & log action)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/metadata/validate"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document (see models documentation)
}
```

---

# (POST) /api/documents/:id/datasets/validate

*[List of Documents routes](#documents)*

## Description

This route validate the document datasets (set status "finish" & log action)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/datasets/validate"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document (see models documentation)
}
```

---

# (POST) /api/documents/:id/datasets/backToMetadata

*[List of Documents routes](#documents)*

## Description

This route validate the document datasets (set status "metadata" & log action)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/datasets/backToMetadata"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document (see models documentation)
}
```

---

# (POST) /api/documents/:id/finish/reopen

*[List of Documents routes](#documents)*

## Description

This route reopen the document (set status "metadata" & log action)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/finish/reopen"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the document (see models documentation)
}
```

---

# (POST) /api/documents/:id/processOCR

*[List of Documents routes](#documents)*

## Description

This route process OCR on the given document.

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/processOCR"
```

## Result

```json
{
  "err": false,
  "res": {...} // The JSON representation of the OCR
}
```

---

# (POST) /api/documents/:id/detectNewSentences

*[List of Documents routes](#documents)*

## Description

This route will detect new sentences on the given document.

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
curl -X POST "http://localhost:3000/api/documents/000000000000000000000001/detectNewSentences"
```

## Result

```json
{
  "err": false,
  "res": [...] // The JSON representation of the list of detected new sentences
}
```

---


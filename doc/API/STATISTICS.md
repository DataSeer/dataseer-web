# Statistics

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/statistics/documents](#get-apistatisticsdocuments)
  - [(GET) /api/statistics/documents/:id](#get-apistatisticsdocumentsid)

---

# (GET) /api/statistics/documents

*[List of Documents routes](#statistics)*

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
      <td>Maximum number of returned results (default:0)</td>
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
      <td>Sort (available values: 'ASC' or 'DESC')</td>
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
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & accounts ids before calling this API route
# Each filter add an OR condition (not and AND condition). So if there are 2 filters, it will return all items matching filter1 OR filter2
# Will return all documents (JSON formated)
curl "http://localhost:3000/statistics/documents"
# Will return documents with ids 000000000000000000000000 & 000000000000000000000001 (JSON formated)
curl "http://localhost:3000/statistics/documents?ids=000000000000000000000000,000000000000000000000001"
# Will return documents with organizations 000000000000000000000002 & 000000000000000000000003 (JSON formated)
curl "http://localhost:3000/statistics/documents?organizations=000000000000000000000002,000000000000000000000003"
# Will return documents with owner 000000000000000000000004 & 000000000000000000000005 (JSON formated)
curl "http://localhost:3000/statistics/documents?owner=000000000000000000000004,000000000000000000000005"
# Will return documents with visibility property set to true (JSON formated)
curl "http://localhost:3000/statistics/documents?visibleState=true"
# Will return documents uploaded after the 12/12/12 (JSON formated)
curl "http://localhost:3000/statistics/documents?uploadedAfter=12-12-12"
# Will return documents uploaded the lasts 20 days
curl "http://localhost:3000/statistics/documents?uploadedRange=20"
```

## Result

```json
{
  "err": false,
  "res":[ // Array of documents JSON representation
    {
      "_id": "",
      "doi": "",
      "title": "",
      "uploaded_at": "",
      "updated_at": "",
      "status": "processed" // or "processing"
    },
    ...
  ]
}
```

---

# (GET) /api/statistics/documents

*[List of Documents routes](#statistics)*

## Description

This route return all documents (JSON formated)

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

Note: [more info about data access restrictions here](../README.md#data-access)

## Parameters

No parameter available

## How to request

```bash
# Will return documents with ids 000000000000000000000000 (JSON formated)
curl "http://localhost:3000/statistics/documents/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {
    "_id": "",
    "doi": "",
    "title": "",
    "uploaded_at": "",
    "updated_at": "",
    "status": "processed" // or "processing"
  }
}
```

---
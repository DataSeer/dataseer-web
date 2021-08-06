# Dataseer ML

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/dataseer-ml/processDataseerSentence](#post-apidataseermlprocessdataseersentence)
  - [(GET) /api/dataseer-ml/jsonDataTypes](#get-apidataseermljsonDataTypes)
  - [(POST) /api/dataseer-ml/resyncJsonDataTypes](#post-apidataseermlresyncJsonDataTypes)

---

# (POST) /api/dataseer-ml/processDataseerSentence

*[List of Dataseer ML routes](#dataseer-ml)*

## Description

This route process a DataSeer sentence

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
      <td>text</td>
      <td>required</td>
      <td>Text that will be processed</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the DataSeerML result of processDataseerSentence functionnality (JSON formated)
curl -X POST -F "text=my text that will be processed" "http://localhost:3000/api/dataseer-ml/processDataseerSentence"
```

## Result

```json
{
  "classifications": [], // That will contain result of classifications
  "date": "2021-08-03T19:29:31.566717",
  "model": "dataseer",
  "software": "DeLFT"
}
```

---

# (GET) /api/dataseer-ml/jsonDataTypes

*[List of Dataseer ML routes](#dataseer-ml)*

## Description

This route return dataTypes (JSON formatted)

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the DataSeerML result of jsonDataTypes functionnality (JSON formated)
curl "http://localhost:3000/api/dataseer-ml/jsonDataTypes"
```

## Result

```json
{
  "subTypes": {...}, // each key is a "subType", each value is its "dataType"
  "dataTypes": {...}, // each key is a "dataType", each value is the array of "subTypes"
  "metadata": {...} // each key is a "dataType" (or a "subType"), each value is its metadata
}
```

---

# (POST) /api/dataseer-ml/resyncJsonDataTypes

*[List of Dataseer ML routes](#dataseer-ml)*

## Description

This route resync datatypes (from wiki)

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the new dataTypes
curl -X POST "http://localhost:3000/api/dataseer-ml/resyncJsonDataTypes"
```

## Result

```json
{
  "subTypes": {...}, // each key is a "subType", each value is its "dataType"
  "dataTypes": {...}, // each key is a "dataType", each value is the array of "subTypes"
  "metadata": {...} // each key is a "dataType" (or a "subType"), each value is its metadata
}
```

---

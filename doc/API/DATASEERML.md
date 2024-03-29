# Dataseer ML

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/dataseer-ml/processDataseerSentence](#post-apidataseer-mlprocessdataseersentence)
  - [(POST) /api/dataseer-ml/processDataseerSentences](#post-apidataseer-mlprocessdataseersentences)
  - [(GET) /api/dataseer-ml/jsonDataTypes](#get-apidataseer-mljsonDataTypes)
  - [(POST) /api/dataseer-ml/resyncJsonDataTypes](#post-apidataseer-mlresyncJsonDataTypes)

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

# (POST) /api/dataseer-ml/processDataseerSentences

*[List of Dataseer ML routes](#dataseer-ml)*

## Description

This route process a list of DataSeer sentences

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
      <td>Array</td>
      <td>sentences</td>
      <td>required</td>
      <td>Array of string containing all sentences that will be processed.</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the DataSeerML result of processDataseerSentences functionnality (JSON formated)
curl -X POST -H Content-Type:application/json --data '{"sentences":["my first sentence","my second sentence","my third sentence"]}' "http://localhost:3000/api/dataseer-ml/processDataseerSentences"
```

## Result

```json
[{
  "sentence": "my first sentence",
  "result": {
    "classifications": [], // That will contain result of classifications
    "date": "2021-08-03T19:29:31.566717",
    "model": "dataseer",
    "software": "DeLFT"
  },
  {...},
  ...
}]
```

Notes: it will return an empty array if the `sentences` parameter is not an 'array', and `sentences` (array elements) that are not 'string' will be ignored.

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

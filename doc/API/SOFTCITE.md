# Sofcite

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/softcite/processSoftwareText](#post-apisoftciteprocesssoftwaretext)

---

# (POST) /api/softcite/processSoftwareText

*[List of Dataseer ML routes](#dataseer-ml)*

## Description

This route process a DataSeer sentence (c.f. [this documentation](https://github.com/ourresearch/software-mentions#web-api))

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
    <tr>
      <td>Boolean</td>
      <td>disambiguate</td>
      <td>optionnal</td>
      <td>Disambiguate params</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the DataSeerML result of processDataseerSentence functionnality (JSON formated)
curl -X POST -F "text=my text that will be processed" "http://localhost:3000/api/softcite/processSoftwareText"
```

## Result

```json
{
  "application": "software-mentions",
  "version": "0.7.0-SNAPSHOT",
  "date": "2021-08-06T17:16+0000",
  "mentions": [...],
  "runtime": 3
}
```

---
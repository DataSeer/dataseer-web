# RepoRecommender

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/repoRecommender/findRepo](#post-apireporecommenderfindrepo)

---

# (POST) /api/repoRecommender/findRepo

*[List of Dataseer ML routes](#reporecommender)*

## Description

This route process a DataSeer dataType (or subType) & try to guess bests repositories (using RepoRecommender service)

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
      <td>dataType</td>
      <td>required</td>
      <td>Text that will be processed</td>
    </tr>
    <tr>
      <td>String</td>
      <td>subType</td>
      <td>required</td>
      <td>Text that will be processed</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the list of repositories for the dataType "myDataType" (JSON formated)
curl -X POST -F "dataType=myDataType" "http://localhost:3000/api/repoRecommender/findRepo"
```

## Result

```json
{
  "err":false,
  "msg":"process succeed",
  "res":[
    {"rank":1,"label":"...","url":"...","score":105},
    {"rank":2,"label":"...","url":"...","score":104},
    ...
    ]
  }
```

---
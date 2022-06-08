# Documents datasets

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/datasets/:id/dataset](#post-apidatasetsiddataset)
  - [(PUT) /api/datasets/:id/dataset](#put-apidatasetsiddataset)
  - [(DELETE) /api/datasets/:id/dataset](#delete-apidatasetsiddataset)
  - [(POST) /api/datasets/:id/link](#post-apidatasetsidlink)
  - [(POST) /api/datasets/:id/unlink](#post-apidatasetsidunlink)

---

# (POST) /api/datasets/:id/dataset

*[List of Documents datasets routes](#documents-datasets)*

## Description

This route add a new dataset. You must use the dataset id, not the document id (`document.datasets` or `document.datasets._id` property)

Note : it will link the sentence to this dataset.

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
      <td>Object</td>
      <td>dataset</td>
      <td>required</td>
      <td>Dataset data</td>
    </tr>
    <tr>
      <td>Object</td>
      <td>sentence</td>
      <td>required</td>
      <td>Sentence Data</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will add a dataset
curl -X POST -d '{"sentence":{"id":"sentence-1"},"dataset":{...}}' "http://localhost:3000/api/datasets/000000000000000000000000/dataset"
```

## Result

```json
{
  "err": false,
  "res": {...} // new dataset JSON object (see Models documentation for more infos)
}
```

---

# (PUT) /api/datasets/:id/dataset

*[List of Documents datasets routes](#documents-datasets)*

## Description

This route update a given dataset. You must use the dataset id, not the document id (`document.datasets` or `document.datasets._id` property)

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
      <td>Object</td>
      <td>datasets</td>
      <td>optional</td>
      <td>A dataset JSON representation containing all data (see model for more infos).<br/>Note: it will only update defined keys</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will update the dataset with id "dataset-1" with other available values
curl -X PUT -d '{"dataset":{"id":"dataset-1"},...}}' "http://localhost:3000/api/datasets/000000000000000000000000/dataset"
```

## Result

```json
{
  "err": false,
  "res": {...} // dataset JSON object (see Models documentation for more infos)
}
```

---

# (DELETE) /api/datasets/:id/dataset

*[List of Documents datasets routes](#documents-datasets)*

## Description

This route delete a given dataset. You must use the dataset id, not the document id (`document.datasets` or `document.datasets._id` property)

Note : it will unlink all sentences.

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
      <td>Object</td>
      <td>dataset</td>
      <td>datasets</td>
      <td>A dataset JSON representation containing the dataset id</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will delete the dataset with id "dataset-1"
curl -X DELETE -d '{"dataset":{"id":"dataset-1"}}' "http://localhost:3000/api/datasets/000000000000000000000000/dataset"
```

## Result

```json
{
  "err": false,
  "res": {...} // dataset JSON object (see Models documentation for more infos)
}
```

---

# (POST) /api/datasets/:id/link

*[List of Documents datasets routes](#documents-datasets)*

## Description

This route link a sentence to the given dataset. You must use the dataset id, not the document id (`document.datasets` or `document.datasets._id` property)

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
      <td>Object</td>
      <td>dataset</td>
      <td>required</td>
      <td>Dataset data</td>
    </tr>
    <tr>
      <td>Object</td>
      <td>sentence</td>
      <td>required</td>
      <td>Sentence Data</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will add a dataset
curl -X POST -d '{"sentence":{"id":"sentence-1"},"dataset":{"id":"dataset-1"}}' "http://localhost:3000/api/datasets/000000000000000000000000/link"
```

## Result

```json
{
  "err": false,
  "res": {...} // dataset JSON object (see Models documentation for more infos)
}
```

---

# (POST) /api/datasets/:id/unlink

*[List of Documents datasets routes](#documents-datasets)*

## Description

This route unlink a sentence to the given dataset. You must use the dataset id, not the document id (`document.datasets` or `document.datasets._id` property)

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
      <td>Object</td>
      <td>dataset</td>
      <td>required</td>
      <td>Dataset data</td>
    </tr>
    <tr>
      <td>Object</td>
      <td>sentence</td>
      <td>required</td>
      <td>Sentence Data</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will add a dataset
curl -X POST -d '{"sentence":{"id":"sentence-1"},"dataset":{"id":"dataset-1"}}' "http://localhost:3000/api/datasets/000000000000000000000000/unlink"
```

## Result

```json
{
  "err": false,
  "res": {...} // dataset JSON object (see Models documentation for more infos)
}
```

---
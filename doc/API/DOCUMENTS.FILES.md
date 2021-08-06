# Documents files

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/files/:id](#get-apifilesid)
  - [(PUT) /api/files/:id](#put-apifilesid)
  - [(POST) /api/files](#post-apifiles)

---

# (GET) /api/files/:id

*[List of Documents files routes](#documents-files)*

## Description

This route return the content of the given document file.

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available

## How to request

```bash
# Will get the content of the given file
curl "http://localhost:3000/api/file/000000000000000000000000"
```

## Result

It will return the file content

---

# (PUT) /api/files/:id

*[List of Documents files routes](#documents-files)*

## Description

This route update "metadata" of the document.

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
      <td>name</td>
      <td>optional</td>
      <td>Name of the file</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will change the name of the given file
curl -X PUT -F 'name="my filename"' "http://localhost:3000/api/file/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // File JSON object (see Models documentation for more infos)
}
```

---

# (POST) /api/files

*[List of Documents files routes](#documents-files)*

## Description

This route upload a file (attached to a existing document).

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
      <td>object</td>
      <td>account</td>
      <td>required</td>
      <td>Account id</td>
    </tr>
    <tr>
      <td>object</td>
      <td>organization</td>
      <td>required</td>
      <td>Organization id</td>
    </tr>
    <tr>
      <td>object</td>
      <td>document</td>
      <td>required</td>
      <td>Document id</td>
    </tr>
    <tr>
      <td>file</td>
      <td>file</td>
      <td>required</td>
      <td>File content</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will upload a file
curl -X POST -F "account=000000000000000000000002" -F "organization=000000000000000000000001" -F "document=000000000000000000000000" -F "file=@/path/to/the/file.ext" "http://localhost:3000/api/file"
```

## Result

```json
{
  "err": false,
  "res": {...} // File JSON object (see Models documentation for more infos)
}
```

---
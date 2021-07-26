
### Organizations

  - [(GET) /api/organizations](#get-apiorganizations)
  - [(POST) /api/organizations](#post-apiorganizations)
  - [(PUT) /api/organizations](#put-apiorganizations)
  - [(DELETE) /api/organizations](#delete-apiorganizations)
  - [(GET) /api/organizations/:id](#get-apiorganizationsid)
  - [(PUT) /api/organizations/:id](#put-apiorganizationsid)
  - [(DELETE) /api/organizations/:id](#delete-apiorganizationsid)

---

### (GET) /api/organizations/

*[Available Routes](../API.md#available-routes)*

#### Description

This route return all organizations (JSON formated)

#### Role required

Accessible to users with the following role :  **standardUser**, **moderator**, **administrator**.

#### Parameters

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
      <td>Sort (available values: 'ASC' or 'DESC')</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>optional</td>
      <td>Add filter on organizations ids (default: undefined)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>required</td>
      <td>Add filter on visible values (default: undefined, available: [true, false]).<br/>If not defined, empty list will be returned.</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all organizations (JSON formated)
curl -F "visible=true,false" "http://localhost:3000/api/organizations"
# Will return organizations with ids 000000000000000000000000 & 000000000000000000000001 (JSON formated)
curl -F "visible=true,false" -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/organizations"
```

#### Result

```json
{
  "err": false,
  "res": [{...}] // Array of organization JSON representation
}
```

---

### (POST) /api/organizations/

*[Available Routes](../API.md#available-routes)*

#### Description

This route add a new organization and return this organization (JSON formated).

#### Role required

Accessible to user with the following role: **administrator**

#### Parameters

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
      <td>required</td>
      <td>Name of the organization</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the organization (default: true)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the new organization (JSON formated)
curl -X POST -F "name=NAME" -F "visible=true" "http://localhost:3000/api/organizations"
```

#### Result

```json
{
  "err": false,
  "res": {...} // new organization JSON representation
}
```

---

### (PUT) /api/organizations/

*[Available Routes](../API.md#available-routes)*

#### Description

This route updates multiple organizations and return all actions results (JSON formatted).

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

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
      <td>Array of organizations ids</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the organization (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all infos about updates (JSON formated)
curl -X PUT -F "ids=000000000000000000000000,000000000000000000000001" -F "visible=true" "http://localhost:3000/api/organizations"
```

#### Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per organization)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

### (DELETE) /api/organizations/

*[Available Routes](../API.md#available-routes)*

#### Description

This route deletes multiple organizations and return all actions results (JSON formatted).

#### Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

#### Parameters

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
      <td>Array of organizations ids</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all infos about deletes (JSON formated)
curl -X DELETE -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/organizations"
```

#### Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per organization)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

### (GET) /api/organizations/:id

*[Available Routes](../API.md#available-routes)*

#### Description

This route return an organization (JSON formated).

#### Role required

Accessible to users with the following role:  **standardUser**, **moderator**, **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the organization (JSON formated) with id 000000000000000000000000
curl "http://localhost:3000/api/organizations/000000000000000000000000"
```

#### Result

```json
{
  "err": false,
  "res": {...} // Organization JSON representation (see Organization model to get more infos)
}
```

---

### (PUT) /api/organizations/:id

*[Available Routes](../API.md#available-routes)*

#### Description

This route update an organization and return updated organization (JSON formated).

#### Role required

Accessible to users with the following role: **moderator**, **administrator**.

#### Parameters

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
      <td>Name of the organization</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the organization (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the updated organization (JSON formated)
curl -X PUT -F "name=NAME" "http://localhost:3000/api/organizations/000000000000000000000000"
```

#### Result

```json
{
  "err": false,
  "res": {...} // updated organization JSON representation
}
```

---

### (DELETE) /api/organizations/:id

*[Available Routes](../API.md#available-routes)*

#### Description

This route delete an organization and return deleted organization (JSON formated).
Note: all data related to this organization will be moved "moved" to the default organization.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the deleted organization (JSON formated)
curl -X DELETE "http://localhost:3000/api/organizations/000000000000000000000000"
```

#### Result

```json
{
  "err": false,
  "res": {...} // deleted organization JSON representation
}
```

---

# Roles

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/roles](#get-apiroles)
  - [(POST) /api/roles](#post-apiroles)
  - [(PUT) /api/roles](#put-apiroles)
  - [(DELETE) /api/roles](#delete-apiroles)
  - [(GET) /api/roles/:id](#get-apirolesid)
  - [(PUT) /api/roles/:id](#put-apirolesid)
  - [(DELETE) /api/roles/:id](#delete-apirolesid)

---

# (GET) /api/roles/

*[List of Roles routes](#roles)*

## Description

This route return all roles (JSON formated)

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
      <td>Sort (available values: 'asc' or 'desc')</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>optional</td>
      <td>Add filter on roles ids (default: undefined)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Each filter add an OR condition (not and AND condition). So if there are 2 filters, it will return all items matching filter1 OR filter2
# Will return all roles (JSON formated)
curl "http://localhost:3000/api/roles"
# Will return roles with ids 000000000000000000000000 & 000000000000000000000001 (JSON formated)
curl "http://localhost:3000/api/roles?ids=000000000000000000000000,000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // Array of role JSON representation
}
```

---

# (POST) /api/roles/

*[List of Roles routes](#roles)*

## Description

This route add a new role and return this role (JSON formated).

## Role required

Accessible to user with the following role: **administrator**

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
      <td>label</td>
      <td>required</td>
      <td>Label of the role (displayed in app)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>key</td>
      <td>required</td>
      <td>Key of the role (used in app source code)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>weight</td>
      <td>required</td>
      <td>Weight of the role</td>
    </tr>
    <tr>
      <td>String</td>
      <td>color</td>
      <td>optional</td>
      <td>Color of the role</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the new role (JSON formated)
curl -X POST -F "label=My Custom Role" -F "key=myCustomRole" -F "weight=150" "http://localhost:3000/api/roles"
```

## Result

```json
{
  "err": false,
  "res": {...} // new role JSON representation
}
```

---

# (PUT) /api/roles/

*[List of Roles routes](#roles)*

## Description

This route updates multiple roles and return all actions results (JSON formatted).

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
      <td>ids</td>
      <td>required</td>
      <td>Array of roles ids</td>
    </tr>
    <tr>
      <td>String</td>
      <td>label</td>
      <td>optional</td>
      <td>Label of the roles</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>weight</td>
      <td>optional</td>
      <td>Weight of the role</td>
    </tr>
    <tr>
      <td>String</td>
      <td>color</td>
      <td>optional</td>
      <td>Color of the roles</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return all infos about updates (JSON formated)
curl -X PUT -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/roles"
```

## Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per role)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

# (DELETE) /api/roles/

*[List of Roles routes](#roles)*

## Description

This route deletes multiple roles and return all actions results (JSON formatted).

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
      <td>Array of roles ids</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return all infos about deletes (JSON formated)
curl -X DELETE -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/roles"
```

## Result

```json
{
  "err": false,
  "res": [ // List of all actions (one item per role)
    {"err": false, "res": {...}},
    ...
  ]
}
```

---

# (GET) /api/roles/:id

*[List of Roles routes](#roles)*

## Description

This route return an role (JSON formated).

## Role required

Accessible to users with the following role:  **standardUser**, **moderator**, **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the role (JSON formated) with id 000000000000000000000000
curl "http://localhost:3000/api/roles/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // Role JSON representation (see Role model to get more infos)
}
```

---

# (PUT) /api/roles/:id

*[List of Roles routes](#roles)*

## Description

This route update an role and return updated role (JSON formated).

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
      <td>String</td>
      <td>label</td>
      <td>optional</td>
      <td>Label of the role</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>weight</td>
      <td>optional</td>
      <td>Weight of the role</td>
    </tr>
    <tr>
      <td>String</td>
      <td>color</td>
      <td>optional</td>
      <td>Color of the role</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the updated role (JSON formated)
curl -X PUT -F "name=NAME" "http://localhost:3000/api/roles/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // updated role JSON representation
}
```

---

# (DELETE) /api/roles/:id

*[List of Roles routes](#roles)*

## Description

This route delete an role and return deleted role (JSON formated).

## Role required

Accessible to users with the following role: **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the deleted role (JSON formated)
curl -X DELETE "http://localhost:3000/api/roles/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // deleted role JSON representation
}
```

---

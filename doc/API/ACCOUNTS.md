# Accounts

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/accounts](#get-apiaccounts)
  - [(POST) /api/accounts](#post-apiaccounts)
  - [(PUT) /api/accounts](#put-apiaccounts)
  - [(DELETE) /api/accounts](#delete-apiaccounts)
  - [(GET) /api/accounts/:id](#get-apiaccountsid)
  - [(PUT) /api/accounts/:id](#put-apiaccountsid)
  - [(DELETE) /api/accounts/:id](#delete-apiaccountsid)
  - [(GET) /api/accounts/:id/logs](#get-apiaccountsidlogs)
  - [(GET) /api/accounts/:id/activities](#get-apiaccountsidactivities)

---

# (GET) /api/accounts/

*[List of Accounts routes](#accounts)*

## Description

This route return all accounts (JSON formated)

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

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
      <td>Sort (available values: 'asc' or 'desc')</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>ids</td>
      <td>optional</td>
      <td>Add filter on accounts ids (default: undefined)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>roles</td>
      <td>optionnal</td>
      <td>Add filter on roles ids (default: undefined)</td>
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
      <td>disabledStates</td>
      <td>optionnal</td>
      <td>Add filter on disabled values (default: undefined, available: [true, false])</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Each filter add an OR condition (not and AND condition). So if there are 2 filters, it will return all items matching filter1 OR filter2
# Will return all accounts (JSON formated)
curl "http://localhost:3000/api/accounts"
# Will return accounts with ids 000000000000000000000000 & 000000000000000000000001 (JSON formated)
curl "http://localhost:3000/api/accounts?ids=000000000000000000000000,000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // Array of account JSON representation
}
```

---

# (POST) /api/accounts/

*[List of Accounts routes](#accounts)*

## Description

This route add a new account and return this account (JSON formated).

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
      <td>fullname</td>
      <td>required</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>username</td>
      <td>required</td>
      <td>Email adress of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>password</td>
      <td>required</td>
      <td>Password of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>confirm_password</td>
      <td>required</td>
      <td>Confirmed password of the account</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Organizations ids of the account (default: default organizations ids)</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>role</td>
      <td>optional</td>
      <td>Role of the account</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the account (default: true)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>disabled</td>
      <td>optional</td>
      <td>Disable state of the account (default: false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return the new account (JSON formated)
curl -X POST -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME" -F "password=MY_PASSWORD" -F "confirm_password=MY_PASSWORD" -F "organizations=..." -F "role=..." "http://localhost:3000/api/accounts"
```

## Result

```json
{
  "err": false,
  "res": {...} // new account JSON representation
}
```

---

# (PUT) /api/accounts/

*[List of Accounts routes](#accounts)*

## Description

This route updates multiple accounts and return all actions results (JSON formatted).

## Role required

Accessible to users with the following role: **moderator**, **administrator**.

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
      <td>Array of accounts ids</td>
    </tr>
    <tr>
      <td>String</td>
      <td>fullname</td>
      <td>optional</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>role</td>
      <td>optional</td>
      <td>Role id of the account</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ids of the account</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the account (true or false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>disabled</td>
      <td>optional</td>
      <td>Disable state of the account (true or false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & roles ids before calling this API route
# Will return all infos about updates (JSON formated)
curl -X PUT -F "ids=000000000000000000000000,000000000000000000000001" -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME"-F "organizations=..." -F "role=..." "http://localhost:3000/api/accounts"
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

# (DELETE) /api/accounts/

*[List of Accounts routes](#accounts)*

## Description

This route deletes multiple accounts and return all actions results (JSON formatted).

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
      <td>Array of accounts ids</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return all infos about deletes (JSON formated)
curl -X DELETE -F "ids=000000000000000000000000,000000000000000000000001" "http://localhost:3000/api/accounts"
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

# (GET) /api/accounts/:id

*[List of Accounts routes](#accounts)*

## Description

This route return an account (JSON formated).

## Role required

Accessible to users with the following role:  **standardUser**, **moderator**, **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the account (JSON formated) with id 000000000000000000000000
curl "http://localhost:3000/api/accounts/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // Account JSON representation (see Account model to get more infos)
}
```

---

# (PUT) /api/accounts/:id

*[List of Accounts routes](#accounts)*

## Description

This route update an account and return updated account (JSON formated).

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
      <td>fullname</td>
      <td>optional</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>role</td>
      <td>optional</td>
      <td>Role id of the account</td>
    </tr>
    <tr>
      <td>Array</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ids of the account</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the account (true or false)</td>
    </tr>
    <tr>
      <td>Boolean</td>
      <td>disabled</td>
      <td>optional</td>
      <td>Disable state of the account (true or false)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# You should get list of available organizations & roles ids before calling this API route
# Will return the updated account (JSON formated)
curl -X PUT -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME"-F "organizations=..." -F "role=..." "http://localhost:3000/api/accounts/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // updated account JSON representation
}
```

---

# (DELETE) /api/accounts/:id

*[List of Accounts routes](#accounts)*

## Description

This route delete an account and return deleted account (JSON formated).
Note: data won't be deleted but all private infos will be hashed.

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the deleted account (JSON formated)
curl -X DELETE "http://localhost:3000/api/accounts/000000000000000000000000"
```

## Result

```json
{
  "err": false,
  "res": {...} // deleted account JSON representation
}
```

---

# (GET) /api/accounts/:id/logs

*[List of Documents routes](#accounts)*

## Description

This route get the logs of the given accounts (JSON formatted).

## Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available.

## How to request

```bash
# Will return the logs of the given accounts (JSON formated)
curl "http://localhost:3000/api/accounts/000000000000000000000001/logs"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // An array of logs (see models documentation)
}
```

---

# (GET) /api/accounts/:id/activities

*[List of Documents routes](#accounts)*

## Description

This route get the (documents) logs of the given accounts (JSON formatted).

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
      <td>Maximum number of returned results (default:20, maximum:100)</td>
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
  </tbody>
</table>

## How to request

```bash
# Will return the activities of the given accounts (JSON formated)
curl "http://localhost:3000/api/accounts/000000000000000000000001/activities"
# Get the 50 most recent activities
curl "http://localhost:3000/api/accounts/000000000000000000000001/activities?limit=50"
# Get the 20 most recent activities, skipping the first 5
curl "http://localhost:3000/api/accounts/000000000000000000000001/activities?skip=5"
# Get the 20 least recent activities
curl "http://localhost:3000/api/accounts/000000000000000000000001/activities?sort=asc"
```

## Result

```json
{
  "err": false,
  "res": [{...}] // An array of logs (see models documentation)
}
```

---

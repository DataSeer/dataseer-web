

# API documentation
*[Main Documentation](#../README.md#documentations)*
- [Responses Status Codes](#responses-status-code)
- [Credentials](#credentials)
- [Results](#results)
- [Available Routes](#available-routes)
  - [Accounts](#accounts)
  - [Roles](#roles)
  - [Organizations](#organizations)
  - [Documents ](#documents)
  - [/signin](#signin)
  - [/signup](#signup)
  - [/signout](#signout)
  - [/upload](#upload)

## Responses Status Code
*[Table of contents](#api-documentation)*
<table>
  <thead>
    <tr>
      <th>HTTP Status code</th>
      <th>Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>200</td>
      <td>Successful operation</td>
    </tr>
    <tr>
      <td>401</td>
      <td>Access not granted</td>
    </tr>
    <tr>
      <td>404</td>
      <td>URL no found (route does not exist)</td>
    </tr>
    <tr>
      <td>500</td>
      <td>Internal service error</td>
    </tr>
  </tbody>
</table>

## Credentials

*[Table of contents](#api-documentation)*

You must use your API token to access all of the following routes

Set your own token into HTTP headers (Authorization: Bearer MY_TOKEN)

```bash
# You have to replace MY_TOKEN by your tdm-plateform API token
# Use -H "Authorization: Bearer MY_TOKEN" to set headers with curl
$ curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
# Or you can use token parameter
$ curl "http://localhost:3000/api/accounts?token=MY_TOKEN"

If you try to access an unauthorized route, the application will return an HTTP 401 error
```bash
$ curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer WRONG_TOKEN"
# HTTP 401 will return :
# Your current role does not grant you access to this part of the website
# This error is caused by: a wrong token, expired token, blacklisted token
```

## Results

*[Table of contents](#api-documentation)*

API will return JSON object response with HTTP 200

### Success

In case of success, API will return this kind of object:
````json
{
  "err": false,
  "res": {...}
}
// OR
{
  "err": false,
  "res": [{...}]
}
````

### Error

````json
{
  "err": true,
  "res": null, // or false or undefined
  "msg": "A human-readable message describing the error that occurred"
}
````

## Available Routes

*[Table of contents](#api-documentation)*

All of these routes return a JSON object:

### Accounts
- [(GET) /api/accounts](#get-apiaccounts)
- [(GET) /api/accounts/:id](#get-apiaccountsid)
- [(POST) /api/accounts](#post-apiaccounts)
- [(PUT) /api/accounts/:id](#put-apiaccountsid)
- [(PUT) /api/accounts](#put-apiaccounts)
- [(DELETE) /api/accounts/:id](#delete-apiaccountsid)
- [(DELETE) /api/accounts](#delete-apiaccounts)


### Roles
- [(GET) /api/roles](#get-apiroles)
- [(GET) /api/roles/:id](#get-apirolesid)
- [(POST) /api/roles](#post-apiroles)
- [(PUT) /api/roles/:id](#put-apirolesid)
- [(PUT) /api/roles](#put-apiroles)
- [(DELETE) /api/roles/:id](#delete-apirolesid)
- [(DELETE) /api/roles](#delete-apiroles)

### Organizations
- [(GET) /api/organizations](#get-apiorganizations)
- [(GET) /api/organizations/:id](#get-apiorganizationsid)
- [(POST) /api/organizations](#post-apiorganizations)
- [(PUT) /api/organizations/:id](#put-apiorganizationsid)
- [(PUT) /api/organizations](#put-apiorganizations)
- [(DELETE) /api/organizations/:id](#delete-apiorganizationsid)
- [(DELETE) /api/organizations](#delete-apiorganizations)

### Documents

  - [(GET) /api/documents](#get-apidocuments)
  - [(POST) /api/documents](#post-apidocuments)
 
 ---
 ### (GET) /api/accounts/
 
*[Available Routes](#available-routes)*

#### Description
This route return all accounts (JSON formated)

#### Role required
Accessible to users with the following role :  **standardUser**, **moderator**, **administrator**.

#### Parameters
<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>roles</td>
      <td>optional</td>
      <td>Use this parameter (set it with an array of roles id) to filter results by roles</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Use this parameter (set it with an array of organizations id) to filter results by organizations</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>visible</td>
      <td>optional</td>
      <td>Use this parameter to filter results by visible states (true or false)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>protected</td>
      <td>optional</td>
      <td>Use this parameter to filter results by protected states (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/accounts?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": [{...}] // Array of account JSON representation
}
```

---

### (GET) /api/accounts/:id


*[Available Routes](#available-routes)*

#### Description

This route return an account (JSON formated).

#### Role required

Accessible to users with the following role:  **standardUser**, **moderator**, **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the account (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // Account JSON representation
}
```

---

### (POST) /api/accounts/

*[Available Routes](#available-routes)*

#### Description

This route add a new account in database and return this account (JSON formated).

#### Role required

Accessible to user with the following role: **administrator**

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>POST</td>
      <td>fullname</td>
      <td>required</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>username</td>
      <td>required</td>
      <td>Email adress of the account</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>password</td>
      <td>required</td>
      <td>Password of the account</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>confirm_password</td>
      <td>required</td>
      <td>To secure your password</td>
    </tr>
        <tr>
      <td>POST</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations of the account</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>role</td>
      <td>optional</td>
      <td>Role of the account</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>visible</td>
      <td>optional</td>
      <td>To set the visiblity of the account (true or false)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the account (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the new account (JSON formated)
curl -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME" -F "password=MY_PASSWORD" -F "confirm_password=MY_PASSWORD" -F "organization=ID_ORGANISATION" -F "role=ID_ROLE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME" -F "password=MY_PASSWORD" -F "confirm_password=MY_PASSWORD" -F "organization=ID_ORGANISATION" -F "role=ID_ROLE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // new account JSON representation
}
```

---
### (PUT) /api/accounts/:id

*[Available Routes](#available-routes)*

#### Description

This route update an account by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>PUT</td>
      <td>fullname</td>
      <td>optional</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>role</td>
      <td>optional</td>
      <td>Role id of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ID of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>visible</td>
      <td>optional</td>
      <td>To set the visibility of the account (true or false)</td>
    </tr>
        <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the account (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the updated account (JSON formated)
curl -X PUT -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME"-F "organizations=ID_ORGANISATIONS" -F "role=ID_ROLE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME" -F "organizations=ID_ORGANISATIONS" -F "role=ID_ROLE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // updated account JSON representation
}
```
---
### (PUT) /api/accounts/

*[Available Routes](#available-routes)*

#### Description

This route updates multiple accounts by their ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>PUT</td>
      <td>fullname</td>
      <td>optional</td>
      <td>Name of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>role</td>
      <td>optional</td>
      <td>Role id of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Array of organizations ID of the account</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>visible</td>
      <td>optional</td>
      <td>To set the visibility of the account (true or false)</td>
    </tr>
        <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the account (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the numbers of accounts updated (JSON formated)
curl -X PUT -F "accounts= [{accountId1 : xxxxx}, {accountId2 : xxxxx}]]" -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME"-F "organizations=ID_ORGANISATIONS" -F "role=ID_ROLE" "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "accounts= [{accountId1 : xxxxx}, {accountId2 : xxxxx}]]" -F "fullname=MY_FULLNAME" -F "username=MY_USERNAME" -F "organizations=ID_ORGANISATIONS" -F "role=ID_ROLE" "http://localhost:3000/api/accounts?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // nb of accounts updated
}
```
---
### (DELETE) /api/accounts/:id

*[Available Routes](#available-routes)*

#### Description

This route delete account by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the account (with 123456789 id) deleted (JSON formated)
curl -X DELETE "http://localhost:3000/api/accounts/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE "http://localhost:3000/api/accounts/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the account delete (JSON formated)
}
```
---
### (DELETE) /api/accounts/

*[Available Routes](#available-routes)*

#### Description

This route deletes an array of accounts ID.

#### Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return number of deleted accounts
curl -X DELETE -F "accounts:[{accountId1, accountId2, accountId3}]" "http://localhost:3000/api/accounts/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE -F "accounts:[{accountId1, accountId2, accountId3}]" "http://localhost:3000/api/accounts/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the number of deleted accounts (JSON formated)
}
```
 ---
 ### (GET) /api/roles/
 
*[Available Routes](#available-routes)*

#### Description
This route return all roles (JSON formated)

#### Role required
Accessible to users with the following role :  **standardUser**, **moderator**, **administrator**.

#### Parameters
<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>protected</td>
      <td>optional</td>
      <td>Use this parameter to filter results by protected states (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all roles (JSON formated)
curl "http://localhost:3000/api/roles" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/roles?token=MY_TOKEN"
```

#### Result

```json
{
  "err": false,
  "res": [{...}] // Array of roles JSON representation
}
```

---

### (GET) /api/roles/:id


*[Available Routes](#available-routes)*

#### Description

This route return an role (JSON formated).

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the role (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/roles/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/roles/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // Roles JSON representation
}
```
---

### (POST) /api/roles/

*[Available Routes](#available-routes)*

#### Description

This route add a new role in database and return this role (JSON formated).

#### Role required

Accessible to user with the following role: **administrator**

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>POST</td>
      <td>label</td>
      <td>required</td>
      <td>Label of the role</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>key</td>
      <td>required</td>
      <td>Key adress of the role</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>weight</td>
      <td>required</td>
      <td>Weight of the role</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>protected</td>
      <td>optional</td>
      <td>To protect the role</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the new account (JSON formated)
curl -F "label=MY_LABEL" -F "key=MY_KEY" -F "weight=MY_WEIGHT" -F "protected=TRUE OR FALSE" "http://localhost:3000/api/roles" -H "Authorization: Bearer MY_TOKEN"
curl -F "label=MY_LABEL" -F "key=MY_KEY" -F "weight=MY_WEIGHT" -F "protected=TRUE OR FALSE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // new role JSON representation
}
```
---
### (PUT) /api/roles/:id

*[Available Routes](#available-routes)*

#### Description

This route update an role by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>PUT</td>
      <td>label</td>
      <td>optional</td>
      <td>Label of the role</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>key</td>
      <td>optional</td>
      <td>Key id of the role</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>weight</td>
      <td>optional</td>
      <td>Weight of the role</td>
    </tr>
     <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the role (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the updated account (JSON formated)
curl -X PUT -F "label=MY_LABEL" -F "key=MY_KEY"-F "weight=MY_WEIGHT" -F "protected=TRUE OF FALSE" "http://localhost:3000/api/roles/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "label=MY_LABEL" -F "key=MY_KEY"-F "weight=MY_WEIGHT" -F "protected=TRUE OF FALSE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // updated role JSON representation
}
```
---
### (PUT) /api/roles/

*[Available Routes](#available-routes)*

#### Description

This route updates multiple roles by their ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>PUT</td>
      <td>weight</td>
      <td>optional</td>
      <td>Weight of the role</td>
    </tr>
     <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the role (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the numbers of accounts updated (JSON formated)
curl -X PUT -F "roles= [{roleId : xxxxx}, {roleId : xxxxx}]]" -F "protected=TRUE" "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "roles= [{roleId : xxxxx}, {roleId : xxxxx}]]" -F "protected=TRUE" "http://localhost:3000/api/accounts?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // nb of roles updated
}
```
---
### (DELETE) /api/roles/:id

*[Available Routes](#available-routes)*

#### Description

This route delete role by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the roles (with 123456789 id) deleted (JSON formated)
curl -X DELETE "http://localhost:3000/api/roles/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE "http://localhost:3000/api/roles/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the role delete (JSON formated)
}
```
---
### (DELETE) /api/roles/

*[Available Routes](#available-routes)*

#### Description

This route deletes an array of accounts ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return number of deleted accounts
curl -X DELETE -F "roles:[{roleId, roleId, roleId}]" "http://localhost:3000/api/accounts/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE -F "roles:[{roleId, roleId, roleId}]" "http://localhost:3000/api/accounts/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the number of deleted roles (JSON formated)
}
```
 ---
  ### (GET) /api/organizations/
 
*[Available Routes](#available-routes)*

#### Description
This route return all organizations (JSON formated)

#### Role required
Accessible to users with the following role : **standardUser**, **moderator**, **administrator**.

#### Parameters
<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>protected</td>
      <td>optional</td>
      <td>Use this parameter to filter results by protected states (true or false)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>visible</td>
      <td>optional</td>
      <td>Use this parameter to filter results by visible states (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all organizations (JSON formated)
curl "http://localhost:3000/api/organizations" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/organizations?token=MY_TOKEN"
```

#### Result

```json
{
  "err": false,
  "res": [{...}] // Array of organizations JSON representation
}
```

---

### (GET) /api/organizations/:id


*[Available Routes](#available-routes)*

#### Description

This route return an organization (JSON formated).

#### Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the role (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/organizations/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/organizations/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // organization JSON representation
}
```
---

### (POST) /api/organizations/

*[Available Routes](#available-routes)*

#### Description

This route add a new organization in database and return this organization (JSON formated).

#### Role required

Accessible to user with the following role: **administrator**

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>POST</td>
      <td>name</td>
      <td>required</td>
      <td>Name of the organization</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>visible</td>
      <td>required</td>
      <td>Visbility of the organization</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>protected</td>
      <td>optional</td>
      <td>To protect the organization</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the new account (JSON formated)
curl -F "name=MY_NAME" -F "visible=TRUE OR FALSE" -F "protected=TRUE OR FALSE" "http://localhost:3000/api/roles" -H "Authorization: Bearer MY_TOKEN"
curl -F "name=MY_NAME" -F "visible=TRUE OR FALSE" -F "protected=TRUE OR FALSE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // new organization JSON representation
}
```
---
### (PUT) /api/organizations/:id

*[Available Routes](#available-routes)*

#### Description

This route update an organization by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>PUT</td>
      <td>name</td>
      <td>optional</td>
      <td>Name of the organization</td>
    </tr>
    <tr>
      <td>PUT</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the organization (true or false)</td>
    </tr>
     <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the organization (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the updated account (JSON formated)
curl -X PUT -F "name=MY_LABEL" -F "visible=TRUE OF FALSE" -F "protected=TRUE OF FALSE" "http://localhost:3000/api/roles/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "name=MY_LABEL" -F "visible=TRUE OF FALSE" -F "protected=TRUE OF FALSE" "http://localhost:3000/api/accounts/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // updated organization JSON representation
}
```
---
### (PUT) /api/organizations/

*[Available Routes](#available-routes)*

#### Description

This route updates multiple roles by their ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>PUT</td>
      <td>visible</td>
      <td>optional</td>
      <td>Visibility of the organizations (true or false)</td>
    </tr>
     <tr>
      <td>PUT</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the organizations (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the numbers of accounts updated (JSON formated)
curl -X PUT -F "organizations= [{organizationId : xxxxx}, {organizationId : xxxxx}]]" -F "protected=TRUE" -F "visible=TRUE OR FALSE" "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
curl -X PUT -F "organizations= [{organizationId : xxxxx}, {organizationId : xxxxx}]]" -F "protected=TRUE" -F "visible=TRUE OR FALSE" "http://localhost:3000/api/accounts?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // nb of roles updated
}
```
---
### (DELETE) /api/organizations/:id

*[Available Routes](#available-routes)*

#### Description

This route delete organization by his ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the organizations (with 123456789 id) deleted (JSON formated)
curl -X DELETE "http://localhost:3000/api/organizations/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE "http://localhost:3000/api/organizations/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the organization delete (JSON formated)
}
```
---
### (DELETE) /api/organizations/

*[Available Routes](#available-routes)*

#### Description

This route deletes an array of organizations ID.

#### Role required

Accessible to users with the following role: **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return number of deleted accounts
curl -X DELETE -F "organizations:[{organizationId, organizationId, organizationId}]" "http://localhost:3000/api/accounts/123456789" -H "Authorization: Bearer MY_TOKEN"
curl -X DELETE -F "organizations:[{organizationId, organizationId, organizationId}]" "http://localhost:3000/api/accounts/123456789?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // return the number of deleted organizations (JSON formated)
}
```
 ---
   ### (GET) /api/documents/
 
*[Available Routes](#available-routes)*

#### Description
This route return all documents (JSON formated)

#### Role required
Accessible to users with the following role :  **standardUser**, **moderator**, **administrator**.

#### Parameters
<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GET</td>
      <td>limit</td>
      <td>optional</td>
      <td>Maximum number of returned results (default:20)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>skip</td>
      <td>optional</td>
      <td>Number of documents skipped (default:0)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>owners</td>
      <td>optional</td>
      <td>Use this parameter to filter results by owners</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>organizations</td>
      <td>optional</td>
      <td>Use this parameter to filter results by organizations</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>visible</td>
      <td>optional</td>
      <td>Use this parameter to filter results by visible states (true or false)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>protected</td>
      <td>optional</td>
      <td>Use this parameter to filter results by protected states (true or false)</td>
    </tr>
    <tr>
      <td>GET</td>
      <td>updatedBefore</td>
      <td>optional</td>
      <td>Use this parameter to filter results by date of updates before a date </td>
    </tr>
    <tr>
      <td>GET</td>
      <td>updateAfter</td>
      <td>optional</td>
      <td>Use this parameter to filter results by date of updates after a date </td>
    </tr>
    <tr>
      <td>GET</td>
      <td>uploadBefore</td>
      <td>optional</td>
      <td>Use this parameter to filter results by date of upload before a date </td>
    </tr>
    <tr>
      <td>GET</td>
      <td>uploadAfter</td>
      <td>optional</td>
      <td>Use this parameter to filter results by date of upload after a date </td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all documents (JSON formated)
curl "http://localhost:3000/api/documents" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents?token=MY_TOKEN"
```

#### Result

```json
{
  "err": false,
  "res": [{...}] // Array of organizations JSON representation
}
```

---

### (GET) /api/documents/:id


*[Available Routes](#available-routes)*

#### Description

This route return an document (JSON formated).

#### Role required

Accessible to users with the following role: **standardUser**, **moderator**, **administrator**.

#### Parameters

No parameters available

#### How to request

```bash
# Will return the role (JSON formated) with id 5e2f6afe0bb7cd4cdfba9f03
curl "http://localhost:3000/api/documents/5e2f6afe0bb7cd4cdfba9f03" -H "Authorization: Bearer MY_TOKEN"
curl "http://localhost:3000/api/documents/5e2f6afe0bb7cd4cdfba9f03?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // document JSON representation
}
```
---
### (POST) /api/documents/

*[Available Routes](#available-routes)*

#### Description

This route add a new account in database and return this account (JSON formated).

#### Role required

Accessible to user with the following role: **standardUser**, **moderator**, **administrator**

#### Parameters

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Parameters</th>
      <th>Requirement</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
      <td>POST</td>
      <td>file</td>
      <td>required</td>
      <td>File of the document</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>attached_files</td>
      <td>optional</td>
      <td>Attached files of the document</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>email</td>
      <td>optional</td>
      <td>Email of the uploader</td>
    </tr>
        <tr>
      <td>POST</td>
      <td>organization</td>
      <td>optional</td>
      <td>Organization who upload the document</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>visible</td>
      <td>optional</td>
      <td>To set the visiblity of the account (true or false)</td>
    </tr>
    <tr>
      <td>POST</td>
      <td>protected</td>
      <td>optional</td>
      <td>To set the protection of the account (true or false)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return the new account (JSON formated)
curl -X POST -F "file=@/path/to/document" -F "attached_files[]=@/path/to/attached_files" -F "attached_files[]=@/path/to/attached_files" -F "attached_files[]=@/path/to/attached_files" "http://localhost:3000/api/documents" -H "Authorization: Bearer MY_TOKEN"
curl -X POST -F "file=@/path/to/document" -F "attached_files[]=@/path/to/attached_files" -F "attached_files[]=@/path/to/attached_files" -F "attached_files[]=@/path/to/attached_files" "http://localhost:3000/api/documents?token=MY_TOKEN"
```
#### Result

```json
{
  "err": false,
  "res": {...} // new document JSON representation
}
```
---
### /Signin

*[Available Routes](#api-documentation)*

#### Role required

This route is public.

#### Purpose
Use this route to sign in to TDM-Plateform.

---
### /Signup

*[Available Routes](#api-documentation)*

#### Role required

This route is public.

#### Purpose
Use this route to sign up to TDM-Plateform.

---
### /Signout

*[Available Routes](#api-documentation)*

#### Role required

Accessible to user with the following role: **standardUser**, **moderator**, **administrator**

#### Purpose
Use this route to sign out to TDM-Plateform.

---
### /Upload

*[Available Routes](#api-documentation)*

#### Role required

Accessible to user with the following role: **standardUser**, **moderator**, **administrator**

#### Purpose
Use this to upload document to TDM-Plateform.


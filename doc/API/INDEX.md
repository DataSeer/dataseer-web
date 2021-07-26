# Index

  - [(POST) /api/signup](#post-apisignup)
  - [(POST) /api/signin](#post-apisignin)
  - [(GET) /api/signout](#get-apisignout)
  - [(GET) /api/currentUser](#get-apicurrentuser)
  - [(GET) /api/getCrispId](#get-apigetcrispid)
  - [(GET) /api/getUserflowToken](#get-apigetuserflowtoken)
  - [(POST) /api/forgotPassword](#post-apiforgotpassword)
  - [(POST) /api/resetPassword](#post-apiresetpassword)

---

## (POST) /api/signin

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to sign in to dataseer-web. It will return a JWT that must be used to interact with the API.
(The response header will contain a "Set-Cookie" instruction to set an httpOnly cookie "token" containing the JWT)

### Role required

This route is public.

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
      <td>username</td>
      <td>required</td>
      <td>Username of the account (an email address)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>password</td>
      <td>required</td>
      <td>Password of the account</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all accounts (JSON formated)
curl -X POST -F "username=address@email.com" -F "password=myPassword" "http://localhost:3000/signin"
```

#### Result

```json
{
  "err": false,
  "res": {  // A JSON representation of the registred account
    "token": "", // The JWT token of the account
    "username": "address@email.com",
    "fullname": "My Fullname",
    "organizations":[...], // List of organizations
    "role": {...}, // Current role
    "_id": "" // Id of the account
  }
}
```

---

## (POST) /api/signup

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to sign up to dataseer-web (created account will be a standardUser).

### Role required

This route is public.

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
      <td>username</td>
      <td>required</td>
      <td>Username of the account (an email address)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>fullname</td>
      <td>required</td>
      <td>Fullname of the account</td>
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

#### How to request

```bash
# Will return all accounts (JSON formated)
curl -X POST -F "username=address@email.com" -F "fullname=My Fullname" -F "password=myPassword" -F "confirm_password=myPassword" "http://localhost:3000/signup"
```

#### Result

```json
{
  "err": false,
  "res": {  // A JSON representation of the registred account
    "username": "address@email.com",
    "fullname": "My Fullname",
    "organizations":[...], // List of organizations
    "role": {...}, // Current role
    "_id": "" // Id of the account
  }
}
```

---

## (GET) /api/signout

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to sign out to dataseer-web. It will revoke the current JWT.

### Role required

Accessible to user with the following role: **standardUser**, **moderator**, **administrator**

#### Parameters

No parameters available

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/signout"
```

#### Result

```json
{
  "err": false,
  "res": true
}
```

---

## (GET) /api/currentUser

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to get the current user.

### Role required

Accessible to user with the following role: **visitor**, **standardUser**, **moderator**, **administrator**

#### Parameters

No parameters available

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/currentUser"
```

#### Result

```json
{
  "err": false,
  "res": {...} // A JSON representation of the current user (see Account model to get more infos)
}
```

---

## (GET) /api/getCrispId

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to sign out to dataseer-web. (It will revoke the current JWT)

### Role required

Accessible to user with the following role: **visitor**, **standardUser**, **moderator**, **administrator**

#### Parameters

No parameters available

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/getCrispId"
```

#### Result

```json
{
  "err": false,
  "res": {...} // All infos about Crisp authentication (see crisp.json conf file to get more infos)
}
```

---

## (GET) /api/getUserflowToken

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to sign out to dataseer-web. (It will revoke the current JWT)

### Role required

Accessible to user with the following role: **visitor**, **standardUser**, **moderator**, **administrator**

#### Parameters

No parameters available

#### How to request

```bash
# Will return all accounts (JSON formated)
curl "http://localhost:3000/getUserflowToken"
```

#### Result

```json
{
  "err": false,
  "res": {...} // All infos about Crisp authentication (see userflow.json conf file to get more infos)
}
```

---

## (POST) /api/forgotPassword

*[Available Routes](../API.md#available-routes)*

### Description

Use this route to start "forgotPassword" process (step before "resetPassword" process).
An email containing a "resestPasswordToken" that will allow user to reset the password will be sent.

### Role required

This route is public.

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
      <td>username</td>
      <td>required</td>
      <td>Username of the account (an email address)</td>
    </tr>
  </tbody>
</table>

#### How to request

```bash
# Will return all accounts (JSON formated)
curl -X POST -F "username=address@email.com" "http://localhost:3000/forgotPassword"
```

#### Result

```json
{
  "err": false,
  "res": "" // A message that confirm the process success
}
```

---

## (POST) /api/resetPassword

*[Available Routes](../API.md#available-routes)*

### Description

Use this route reset password of a given account.

### Role required

This route is public (using the resestPasswordToken) and private (using the current password) for users with the following role: **standardUser**, **moderator**, **administrator**

#### Parameters (private)

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
      <td>username</td>
      <td>required</td>
      <td>Username of the account (an email address)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>current_password</td>
      <td>required</td>
      <td>Current password of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>new_password</td>
      <td>required</td>
      <td>The new password of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>confirm_new_password</td>
      <td>required</td>
      <td>The confirmed new password of the account</td>
    </tr>
  </tbody>
</table>

#### How to request (private)

```bash
# Will return all accounts (JSON formated)
curl -X POST -F "username=address@email.com" -F "current_password=myPassword" -F "new_password=myNewPassword" -F "confirm_new_password=myNewPassword" "http://localhost:3000/resetPassword"
```

#### Parameters (public)

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
      <td>resetPasswordToken</td>
      <td>required</td>
      <td>The token sent by email</td>
    </tr>
    <tr>
      <td>String</td>
      <td>new_password</td>
      <td>required</td>
      <td>THe new password of the account</td>
    </tr>
    <tr>
      <td>String</td>
      <td>confirm_new_password</td>
      <td>required</td>
      <td>The confirmed new password of the account</td>
    </tr>
  </tbody>
</table>

#### How to request (public)

```bash
# Will return all accounts (JSON formated)
curl -X POST -F "resetPasswordToken=myResetPasswordToken" -F "new_password=myNewPassword" -F "confirm_new_password=myNewPassword" "http://localhost:3000/resetPassword"
```

#### Result (private & public)

```json
{
  "err": false,
  "res": {  // A JSON representation of the registred account
    "token": "", // The JWT token of the account
    "username": "address@email.com",
    "fullname": "My Fullname",
    "organizations":[...], // List of organizations
    "role": {...}, // Current role
    "_id": "" // Id of the account
  }
}
```

---


# Documents files

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/files/:id](#get-apifilesid)

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
# Sciscore

*[Available Routes](../API.md#available-routes)*

  - [(POST) /api/sciscore/processFile/:id](#post-apisciscoreprocessfileid)

---

# (POST) /api/sciscore/processFile/:id

*[List of Sciscore routes](#sciscore)*

## Description

This route process a DataSeer file with Sciscore API.

## Role required

Accessible to users with the following role: **administrator**.

## Parameters

No parameters available

## How to request

```bash
# Will return the result of the process of the file with DataSeer ID 000000000000000000000001 (JSON formated)
curl -X POST "http://localhost:3000/api/sciscore/processFile/000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": { // process logs
    "stderr": [...],
    "stdout": [...]
  }
}
```

---
# Hypothesis

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/hypothesis/bioRxiv](#get-hypothesisbioRxiv)
  - [(PUT) /api/hypothesis/bioRxiv](#put-hypothesisbioRxiv)
  - [(GET) /api/hypothesis/bioRxiv/:id](#get-hypothesisbioRxivid)

---

# (GET) /api/hypothesis/bioRxiv

*[List of Hypothesis routes](#hypothesis)*

## Description

This route return annotations linked to the given url

Note: it is just an interface to the [hypothes.is API](https://h.readthedocs.io/en/latest/api-reference/))

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
      <td>url</td>
      <td>required</td>
      <td>The given URL</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will return all annotations linked to the URL "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1" (JSON formated)
curl http://localhost:3000/api/hypothesis/bioRxiv?url="https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1"
```

## Result

```json
{
  "err": false,
  "res": {
    "total": 1,
    "rows": [
      {
        "id": "********",
        "created": "2021-07-14T17:50:33.721207+00:00",
        "updated": "2021-08-06T13:23:18.763349+00:00",
        "user": "acct:DataSeer@hypothes.is",
        "uri": "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
        "text": "Text of the annotation",
        "tags": [
          "DataSeer summary"
        ],
        "group": "*******",
        "permissions": {
          "read": [
            "group:__world__"
          ],
          "admin": [
            "acct:DataSeer@hypothes.is"
          ],
          "update": [
            "acct:DataSeer@hypothes.is"
          ],
          "delete": [
            "acct:DataSeer@hypothes.is"
          ]
        },
        "target": [
          {
            "source": "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
            "selector": [
              {
                "type": "RangeSelector",
                "endOffset": 79,
                "startOffset": 0,
                "endContainer": "/div[3]/section[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/h1[1]",
                "startContainer": "/div[3]/section[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/h1[1]"
              },
              {
                "end": 2467,
                "type": "TextPositionSelector",
                "start": 2388
              },
              {
                "type": "TextQuoteSelector",
                "exact": "HyDrop: droplet-based scATAC-seq and scRNA-seq using dissolvable hydrogel beads",
                "prefix": "     New Results    \n  \n        ",
                "suffix": "  \n       View ORCID ProfileFlor"
              }
            ]
          }
        ],
        "document": {
          "title": [
            "HyDrop: droplet-based scATAC-seq and scRNA-seq using dissolvable hydrogel beads"
          ]
        },
        "links": {
          "html": "https://hypothes.is/a/*********",
          "incontext": "https://hyp.is/*********/www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
          "json": "https://hypothes.is/api/annotations/*********"
        },
        "flagged": false,
        "hidden": false,
        "moderation": {
          "flagCount": 0
        },
        "user_info": {
          "display_name": "DataSeer"
        }
      }
    ]
  }
}
```

---

# (PUT) /api/hypothesis/bioRxiv

*[List of Hypothesis routes](#hypothesis)*

## Description

This route update (or create) an annotation (linked to the given url)

Note: it is just an interface to the [hypothes.is API](https://h.readthedocs.io/en/latest/api-reference/))

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
      <td>url</td>
      <td>required</td>
      <td>The given URL</td>
    </tr>
    <tr>
      <td>String</td>
      <td>id</td>
      <td>required</td>
      <td>The document id (that will be used to produce the markdown annotation)</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Will update (or create) an annotation linked to the URL "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1" with data coming from document with id 000000000000000000000001 (JSON formated)
curl -X PUT http://localhost:3000/api/hypothesis/bioRxiv?url="https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1"&id="000000000000000000000001"
```

## Result

```json
{
  "err": false,
  "res": {
    "total": 1,
    "rows": [
      {
        "id": "********",
        "created": "2021-07-14T17:50:33.721207+00:00",
        "updated": "2021-08-06T13:23:18.763349+00:00",
        "user": "acct:DataSeer@hypothes.is",
        "uri": "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
        "text": "Text of the annotation (generated with documents data)",
        "tags": [
          "DataSeer summary"
        ],
        "group": "*******",
        "permissions": {
          "read": [
            "group:__world__"
          ],
          "admin": [
            "acct:DataSeer@hypothes.is"
          ],
          "update": [
            "acct:DataSeer@hypothes.is"
          ],
          "delete": [
            "acct:DataSeer@hypothes.is"
          ]
        },
        "target": [
          {
            "source": "https://www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
            "selector": [
              {
                "type": "RangeSelector",
                "endOffset": 79,
                "startOffset": 0,
                "endContainer": "/div[3]/section[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/h1[1]",
                "startContainer": "/div[3]/section[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[1]/div[1]/h1[1]"
              },
              {
                "end": 2467,
                "type": "TextPositionSelector",
                "start": 2388
              },
              {
                "type": "TextQuoteSelector",
                "exact": "HyDrop: droplet-based scATAC-seq and scRNA-seq using dissolvable hydrogel beads",
                "prefix": "     New Results    \n  \n        ",
                "suffix": "  \n       View ORCID ProfileFlor"
              }
            ]
          }
        ],
        "document": {
          "title": [
            "HyDrop: droplet-based scATAC-seq and scRNA-seq using dissolvable hydrogel beads"
          ]
        },
        "links": {
          "html": "https://hypothes.is/a/*********",
          "incontext": "https://hyp.is/*********/www.biorxiv.org/content/10.1101/2021.06.04.447104v1",
          "json": "https://hypothes.is/api/annotations/*********"
        },
        "flagged": false,
        "hidden": false,
        "moderation": {
          "flagCount": 0
        },
        "user_info": {
          "display_name": "DataSeer"
        }
      }
    ]
  }
}
```

---

# (GET) /api/hypothesis/bioRxiv/:id

*[List of Hypothesis routes](#hypothesis)*

## Description

This route return annotation content (generated with the data of the given document). (Template used)[../../conf/hypothesis/bioRxiv.pug]

Note: it is just an interface to the [hypothes.is API](https://h.readthedocs.io/en/latest/api-reference/))

## Role required

Accessible to users with the following role: **visitor**, **standardUser**, **moderator**, **administrator**.

## Parameters

No parameter available

## How to request

```bash
# Will return the content of annotation generated with document 000000000000000000000001 (MarkDown formated)
curl http://localhost:3000/api/hypothesis/bioRxiv/000000000000000000000001
```

## Result

A string containing the markdown annotation 

---
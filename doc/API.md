# API documentation

*[Main Documentation](../README.md#documentations)*

  - [Responses Status Codes](#responses-status-code)
  - [Credentials](#credentials)
  - [Results](#results)
  - [Available Routes](#available-routes)
    - [Index](#index)
    - [Accounts](#accounts)
    - [Roles](#roles)
    - [Organizations](#organizations)
    - [Documents](#documents)
    - [Documents Datasets](#documents-datasets)
    - [Documents Files](#documents-files)
    - [Statistics](#statistics)
    - [Dataseer-ml](#dataseer-ml)
    - [Softcite](#softcite)
    - [RepoRecommender](#reporecommender)
    - [Charts](#charts)

## Responses Status Code

*[Table of contents](#api-documentation)*

If there is no blocking errors, API will return an HTTP 200 status code (and the given resource).
Else it will return a raw HTTP error (HTTP status code & an human readable message)

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
# You have to replace MY_TOKEN by your dataseer-web API token
# Use -H "Authorization: Bearer MY_TOKEN" to set headers with curl
$ curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer MY_TOKEN"
# Or you can use token parameter
$ curl "http://localhost:3000/api/accounts?token=MY_TOKEN"
```

If you try to access an unauthorized route, the application will return an HTTP 401 error

```bash
$ curl "http://localhost:3000/api/accounts" -H "Authorization: Bearer WRONG_TOKEN"
# HTTP 401 will return :
# Your current role does not grant you access to this part of the website
# This error is caused by: a wrong token or expired token
```

Note: once authenticated, the server sends you a cookie (httpOnly). They will therefore be automatically managed by your browser

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

In case of no-blocking error, API will return this kind of object:

````json
{
  "err": true,
  "res": null, // or false or undefined
  "msg": "A human-readable message describing the error that occurred",
}
````

## Available Routes

*[Table of contents](#api-documentation)*

List of available API routes:

### [Index](./API/INDEX.md#index)

  - [(POST) /api/signup](./API/INDEX.md#post-apisignup)
  - [(POST) /api/signin](./API/INDEX.md#post-apisignin)
  - [(GET) /api/signout](./API/INDEX.md#get-apisignout)
  - [(GET) /api/currentUser](./API/INDEX.md#get-apicurrentuser)
  - [(GET) /api/getCrispId](./API/INDEX.md#get-apigetcrispid)
  - [(GET) /api/getUserflowToken](./API/INDEX.md#get-apigetuserflowtoken)
  - [(POST) /api/forgotPassword](./API/INDEX.md#post-apiforgotpassword)
  - [(POST) /api/resetPassword](./API/INDEX.md#post-apiresetpassword)

### [Accounts](./API/ACCOUNTS.md#accounts)

  - [(GET) /api/accounts](./API/ACCOUNTS.md#get-apiaccounts)
  - [(POST) /api/accounts](./API/ACCOUNTS.md#post-apiaccounts)
  - [(PUT) /api/accounts](./API/ACCOUNTS.md#put-apiaccounts)
  - [(DELETE) /api/accounts](./API/ACCOUNTS.md#delete-apiaccounts)
  - [(GET) /api/accounts/:id](./API/ACCOUNTS.md#get-apiaccountsid)
  - [(PUT) /api/accounts/:id](./API/ACCOUNTS.md#put-apiaccountsid)
  - [(DELETE) /api/accounts/:id](./API/ACCOUNTS.md#delete-apiaccountsid)
  - [(GET) /api/accounts/:id/logs](./API/ACCOUNTS.md#get-apiaccountsidlogs)
  - [(GET) /api/accounts/:id/activity](./API/ACCOUNTS.md#get-apiaccountsidactivity)

### [Roles](./API/ROLES.md#roles)

  - [(GET) /api/roles](./API/ROLES.md#get-apiroles)
  - [(GET) /api/roles/:id](./API/ROLES.md#get-apirolesid)
  - [(POST) /api/roles](./API/ROLES.md#post-apiroles)
  - [(PUT) /api/roles/:id](./API/ROLES.md#put-apirolesid)
  - [(PUT) /api/roles](./API/ROLES.md#put-apiroles)
  - [(DELETE) /api/roles/:id](./API/ROLES.md#delete-apirolesid)
  - [(DELETE) /api/roles](./API/ROLES.md#delete-apiroles)

### [Organizations](./API/ORGANIZATIONS.md#organizations)

  - [(GET) /api/organizations](./API/ORGANIZATIONS.md#get-apiorganizations)
  - [(GET) /api/organizations/:id](./API/ORGANIZATIONS.md#get-apiorganizationsid)
  - [(POST) /api/organizations](./API/ORGANIZATIONS.md#post-apiorganizations)
  - [(PUT) /api/organizations/:id](./API/ORGANIZATIONS.md#put-apiorganizationsid)
  - [(PUT) /api/organizations](./API/ORGANIZATIONS.md#put-apiorganizations)
  - [(DELETE) /api/organizations/:id](./API/ORGANIZATIONS.md#delete-apiorganizationsid)
  - [(DELETE) /api/organizations](./API/ORGANIZATIONS.md#delete-apiorganizations)

### [Documents](./API/DOCUMENTS.md#documents)

  - [(GET) /api/documents](./API/DOCUMENTS.md#get-apidocuments)
  - [(POST) /api/documents](./API/DOCUMENTS.md#post-apidocuments)
  - [(PUT) /api/documents](./API/DOCUMENTS.md#put-apidocuments)
  - [(DELETE) /api/documents](./API/DOCUMENTS.md#delete-apidocuments)
  - [(GET) /api/documents/:id](./API/DOCUMENTS.md#get-apidocumentsid)
  - [(PUT) /api/documents/:id](./API/DOCUMENTS.md#put-apidocumentsid)
  - [(DELETE) /api/documents/:id](./API/DOCUMENTS.md#delete-apidocumentsid)
  - [(POST) /api/documents/:target/importDatasets/:source](./API/DOCUMENTS.md#post-apidocumentstargetimportdatasetssource)
  - [(PUT) /api/documents/:id/datasets](./API/DOCUMENTS.md#put-apidocumentsiddatasets)
  - [(GET) /api/documents/:id/logs](./API/DOCUMENTS.md#get-apidocumentsidlogs)
  - [(GET) /api/documents/:id/reports/html/bioRxiv](./API/DOCUMENTS.md#get-apidocumentsidreportshtmlbiorxiv)
  - [(GET) /api/documents/:id/reports/html/default](./API/DOCUMENTS.md#get-apidocumentsidreportshtmldefault)
  - [(GET) /api/documents/:id/reports/json/default](./API/DOCUMENTS.md#get-apidocumentsidreportsjsondefault)
  - [(GET) /api/documents/:id/reports/docx/default](./API/DOCUMENTS.md#get-apidocumentsidreportsdocxdefault)
  - [(GET) /api/documents/:id/reports/gSpreadsheets/:kind](./API/DOCUMENTS.md#get-apidocumentsidreportsgspreadsheetskind)
  - [(POST) /api/documents/:id/reports/gSpreadsheets/:kind](./API/DOCUMENTS.md#post-apidocumentsidreportsgspreadsheetskind)
  - [(GET) /api/documents/:id/charts/asap](./API/DOCUMENTS.md#get-apidocumentsidchartsasap)
  - [(GET) /api/documents/:id/pdf](./API/DOCUMENTS.md#get-apidocumentsidpdf)
  - [(GET) /api/documents/:id/pdf/content](./API/DOCUMENTS.md#get-apidocumentsidpdfcontent)
  - [(GET) /api/documents/:id/tei](./API/DOCUMENTS.md#get-apidocumentsidtei)
  - [(GET) /api/documents/:id/tei/content](./API/DOCUMENTS.md#get-apidocumentsidteicontent)
  - [(PUT) /api/documents/:id/tei/content](./API/DOCUMENTS.md#put-apidocumentsidteicontent)
  - [(GET) /api/documents/:id/files](./API/DOCUMENTS.md#get-apidocumentsidfiles)
  - [(POST) /api/documents/:id/refreshToken](./API/DOCUMENTS.md#post-apidocumentsidrefreshtoken)
  - [(POST) /api/documents/:id/metadata/reload](./API/DOCUMENTS.md#post-apidocumentsidmetadatareload)
  - [(POST) /api/documents/:id/metadata/validate](./API/DOCUMENTS.md#post-apidocumentsidmetadatavalidate)
  - [(POST) /api/documents/:id/datasets/backToMetadata](./API/DOCUMENTS.md#post-apidocumentsiddatasetsbacktometadata)
  - [(POST) /api/documents/:id/finish/reopen](./API/DOCUMENTS.md#post-apidocumentsidfinishreopen)
  - [(POST) /api/documents/:id/processOCR](./API/DOCUMENTS.md#post-apidocumentsidprocessocr)
  - [(POST) /api/documents/:id/detectNewSentences](./API/DOCUMENTS.md#post-apidocumentsiddetectnewsentences)

### [Documents datasets](./API/DOCUMENTS.DATASETS.md#documents-datasets)

  - [(POST) /api/datasets/:id/dataset](./API/DOCUMENTS.DATASETS.md#post-apidatasetsiddataset)
  - [(PUT) /api/datasets/:id/dataset](./API/DOCUMENTS.DATASETS.md#put-apidatasetsiddataset)
  - [(DELETE) /api/datasets/:id/dataset](./API/DOCUMENTS.DATASETS.md#delete-apidatasetsiddataset)
  - [(POST) /api/datasets/:id/link](./API/DOCUMENTS.DATASETS.md#post-apidatasetsidlink)
  - [(POST) /api/datasets/:id/unlink](./API/DOCUMENTS.DATASETS.md#post-apidatasetsidunlink)

### [Documents files](./API/DOCUMENTS.FILES.md#documents-files)

  - [(GET) /api/files/:id](./API/DOCUMENTS.FILES.md#get-apifilesid)
  - [(PUT) /api/files/:id](./API/DOCUMENTS.FILES.md#put-apifilesid)
  - [(POST) /api/files](./API/DOCUMENTS.FILES.md#post-apifiles)

### [Dataseer ML](./API/DATASEERML.md#dataseer-ml)

  - [(POST) /api/dataseer-ml/processDataseerSentence](./API/DATASEERML.md#post-apidataseermlprocessdataseersentence)
  - [(POST) /api/dataseer-ml/processDataseerSentences](./API/DATASEERML.md#post-apidataseermlprocessdataseersentences)
  - [(GET) /api/dataseer-ml/jsonDataTypes](./API/DATASEERML.md#get-apidataseermljsonDataTypes)
  - [(POST) /api/dataseer-ml/resyncJsonDataTypes](./API/DATASEERML.md#post-apidataseermlresyncJsonDataTypes)

### [RepoRecommender](./API/REPORECOMMENDER.md#reporecommender)

  - [(POST) /api/repoRecommender/findRepo](./API/REPORECOMMENDER.md#post-apireporecommenderfindrepo)

### [Softcite](./API/SOFTWARE.md#softcite)

  - [(POST) /api/softcite/processSoftwareText](./API/SOFTWARE.md#post-apisoftciteprocesssoftwaretext)

### [Statistics](./API/STATISTICS.md#statistics)

  - [(GET) /api/statistics/documents](./API/STATISTICS.md#get-apistatisticsdocuments)
  - [(GET) /api/statistics/documents/:id](./API/STATISTICS.md#get-apistatisticsdocumentsid)

### [Hypothesis](./API/HYPOTHESIS.md#hypothesis)

  - [(GET) /api/hypothesis/bioRxiv](./API/HYPOTHESIS.md#get-apihypothesisbioRxiv)
  - [(PUT) /api/hypothesis/bioRxiv](./API/HYPOTHESIS.md#put-apihypothesisbioRxiv)
  - [(GET) /api/hypothesis/bioRxiv/:id](./API/HYPOTHESIS.md#get-apihypothesisbioRxivid)

### [Charts](./API/CHARTS.md#charts)

  - [(GET) /api/charts/asap](./API/CHARTS.md#get-apichartsasap)

### [Sciscore](./API/SCISCORE.md#sciscore)

  - [(POST) /api/sciscore/processFile/:id](./API/SCISCORE.md#post-apisciscoreprocessfileid)

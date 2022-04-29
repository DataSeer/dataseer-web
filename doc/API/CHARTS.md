# Charts

*[Available Routes](../API.md#available-routes)*

  - [(GET) /api/charts/asap](#get-apichartsasap)

---

# (GET) /api/charts/asap

*[List of Charts routes](#charts)*

## Description

This route get the ASAP Graphics (HTML format or image).

## Role required

This is a public URL.

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
      <td>render</td>
      <td>optional</td>
      <td>Charts will be server-side rendered (available values: 'html', 'jpeg', 'png', 'webp')</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>width</td>
      <td>optional</td>
      <td>Width of the rendered image (min/max values: [0-1920]; default value: 1600)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>height</td>
      <td>optional</td>
      <td>Height of the rendered content (min/max values: [0-1080]; default value: 900)</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>quality</td>
      <td>optional</td>
      <td>Quality of the rendered image (min/max values: [0-100]; default value: 95). The "render" parameter must contain the value "jpeg", "png" or "webp".</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>maxNumberOfSubSlices</td>
      <td>optional</td>
      <td>Maximum number of sub slices (default: 20)</td>
    </tr>
    <tr>
      <td>String</td>
      <td>
        reUseDatasetsName<br/>
        reUseMaterialsName<br/>
        reUseProtocolsName<br/>
        reUseCodesName<br/>
        newDatasetsName<br/>
        newCodesName<br/>
        newMaterialsName<br/>
        newProtocolsName<br/>
      </td>
      <td>optional</td>
      <td>Define custom text in charts labels</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>
        reUseDatasetsDone<br/>
        reUseCodesDone<br/>
        reUseMaterialsDone<br/>
        reUseProtocolsDone<br/>
        newDatasetsDone<br/>
        newCodesDone<br/>
        newMaterialsDone<br/>
        newProtocolsDone<br/>
      </td>
      <td>optional</td>
      <td>Define custom value for 'done' values in charts labels</td>
    </tr>
    <tr>
      <td>Integer</td>
      <td>
        reUseDatasetsTotal<br/>
        reUseCodesTotal<br/>
        reUseMaterialsTotal<br/>
        reUseProtocolsTotal<br/>
        newDatasetsTotal<br/>
        newCodesTotal<br/>
        newMaterialsTotal<br/>
        newProtocolsTotal<br/>
      </td>
      <td>optional</td>
      <td>Define custom value for 'total' values in charts labels</td>
    </tr>
  </tbody>
</table>

## How to request

```bash
# Using this URL will return the HTML source which must be interpreted by your browser (graphics will not be rendered)
curl "http://localhost:3000/api/charts/asap"
# Using this URL will return the HTML source containing all charts
curl "http://localhost:3000/api/charts/asap?render=html"
# Using this URL will return the image (jpeg format) containing all charts
curl "http://localhost:3000/api/charts/asap?render=jpeg"
# Using this URL will return the image (jpeg format) containing custom values
curl "http://localhost:3000/api/charts/asap?render=jpeg&reUseDatasetsName=reUseDatasetsName&reUseMaterialsName=reUseMaterialsName&reUseProtocolsName=reUseProtocolsName&reUseCodesName=reUseCodesName&newDatasetsName=newDatasetsName&newCodesName=newCodesName&newMaterialsName=newMaterialsName&newProtocolsName=newProtocolsName&reUseDatasetsDone=1&reUseCodesDone=1&reUseMaterialsDone=1&reUseProtocolsDone=1&newDatasetsDone=1&newCodesDone=1&newMaterialsDone=1&newProtocolsDone=1&reUseDatasetsTotal=3&reUseCodesTotal=3&reUseMaterialsTotal=3&reUseProtocolsTotal=3&newDatasetsTotal=3&newCodesTotal=3&newMaterialsTotal=3&newProtocolsTotal=3"
```

## Result

The ASAP Graphics (HTML format)

---
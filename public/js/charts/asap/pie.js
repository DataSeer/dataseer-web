/*
 * @prettier
 */

'use strict';
(function (d3) {
  let urlParams = URLMANAGER.getParamsOfCurrentURL();

  let convertedParams = {
    reUseDatasetsName: PARAMS.convertToString(urlParams.reUseDatasetsName),
    reUseDatasetsColor: PARAMS.convertToString(urlParams.reUseDatasetsColor) || `#8c4e9f`,
    reUseDatasetsDone: PARAMS.convertToInteger(urlParams.reUseDatasetsDone),
    reUseDatasetsTotal: PARAMS.convertToInteger(urlParams.reUseDatasetsTotal),
    reUseCodesName: PARAMS.convertToString(urlParams.reUseCodesName),
    reUseCodesColor: PARAMS.convertToString(urlParams.reUseCodesColor) || `#0c8dc3`,
    reUseCodesDone: PARAMS.convertToInteger(urlParams.reUseCodesDone),
    reUseCodesTotal: PARAMS.convertToInteger(urlParams.reUseCodesTotal),
    reUseMaterialsName: PARAMS.convertToString(urlParams.reUseMaterialsName),
    reUseMaterialsColor: PARAMS.convertToString(urlParams.reUseMaterialsColor) || `#307a77`,
    reUseMaterialsDone: PARAMS.convertToInteger(urlParams.reUseMaterialsDone),
    reUseMaterialsTotal: PARAMS.convertToInteger(urlParams.reUseMaterialsTotal),
    reUseProtocolsName: PARAMS.convertToString(urlParams.reUseProtocolsName),
    reUseProtocolsColor: PARAMS.convertToString(urlParams.reUseProtocolsColor) || `#cf2fb3`,
    reUseProtocolsDone: PARAMS.convertToInteger(urlParams.reUseProtocolsDone),
    reUseProtocolsTotal: PARAMS.convertToInteger(urlParams.reUseProtocolsTotal),
    newDatasetsName: PARAMS.convertToString(urlParams.newDatasetsName),
    newDatasetsColor: PARAMS.convertToString(urlParams.newDatasetsColor) || `#8c4e9f`,
    newDatasetsDone: PARAMS.convertToInteger(urlParams.newDatasetsDone),
    newDatasetsTotal: PARAMS.convertToInteger(urlParams.newDatasetsTotal),
    newCodesName: PARAMS.convertToString(urlParams.newCodesName),
    newCodesColor: PARAMS.convertToString(urlParams.newCodesColor) || `#0c8dc3`,
    newCodesDone: PARAMS.convertToInteger(urlParams.newCodesDone),
    newCodesTotal: PARAMS.convertToInteger(urlParams.newCodesTotal),
    newMaterialsName: PARAMS.convertToString(urlParams.newMaterialsName),
    newMaterialsColor: PARAMS.convertToString(urlParams.newMaterialsColor) || `#307a77`,
    newMaterialsDone: PARAMS.convertToInteger(urlParams.newMaterialsDone),
    newMaterialsTotal: PARAMS.convertToInteger(urlParams.newMaterialsTotal),
    newProtocolsName: PARAMS.convertToString(urlParams.newProtocolsName),
    newProtocolsColor: PARAMS.convertToString(urlParams.newProtocolsColor) || `#34a270`,
    newProtocolsDone: PARAMS.convertToInteger(urlParams.newProtocolsDone),
    newProtocolsTotal: PARAMS.convertToInteger(urlParams.newProtocolsTotal)
  };

  const params = {
    maxNumberOfSubSlices: PARAMS.convertToInteger(urlParams.maxNumberOfSubSlices),
    customData: PARAMS.convertToBoolean(urlParams.customData),
    data: {
      reUse: {
        datasets: {
          name: PARAMS.convertToString(urlParams.reUseDatasetsName),
          color: PARAMS.convertToString(urlParams.reUseDatasetsColor) || `#8c4e9f`,
          done: isNaN(convertedParams.reUseDatasetsDone) ? -Infinity : convertedParams.reUseDatasetsDone,
          total: isNaN(convertedParams.reUseDatasetsTotal) ? -Infinity : convertedParams.reUseDatasetsTotal
        },
        codes: {
          name: PARAMS.convertToString(urlParams.reUseCodesName),
          color: PARAMS.convertToString(urlParams.reUseCodesColor) || `#0c8dc3`,
          done: isNaN(convertedParams.reUseCodesDone) ? -Infinity : convertedParams.reUseCodesDone,
          total: isNaN(convertedParams.reUseCodesTotal) ? -Infinity : convertedParams.reUseCodesTotal
        },
        materials: {
          name: PARAMS.convertToString(urlParams.reUseMaterialsName),
          color: PARAMS.convertToString(urlParams.reUseMaterialsColor) || `#307a77`,
          done: isNaN(convertedParams.reUseMaterialsDone) ? -Infinity : convertedParams.reUseMaterialsDone,
          total: isNaN(convertedParams.reUseMaterialsTotal) ? -Infinity : convertedParams.reUseMaterialsTotal
        },
        protocols: {
          name: PARAMS.convertToString(urlParams.reUseProtocolsName),
          color: PARAMS.convertToString(urlParams.reUseProtocolsColor) || `#cf2fb3`,
          done: isNaN(convertedParams.reUseProtocolsDone) ? -Infinity : convertedParams.reUseProtocolsDone,
          total: isNaN(convertedParams.reUseProtocolsTotal) ? -Infinity : convertedParams.reUseProtocolsTotal
        }
      },
      new: {
        datasets: {
          name: PARAMS.convertToString(urlParams.newDatasetsName),
          color: PARAMS.convertToString(urlParams.newDatasetsColor) || `#8c4e9f`,
          done: isNaN(convertedParams.newDatasetsDone) ? -Infinity : convertedParams.newDatasetsDone,
          total: isNaN(convertedParams.newDatasetsTotal) ? -Infinity : convertedParams.newDatasetsTotal
        },
        codes: {
          name: PARAMS.convertToString(urlParams.newCodesName),
          color: PARAMS.convertToString(urlParams.newCodesColor) || `#0c8dc3`,
          done: isNaN(convertedParams.newCodesDone) ? -Infinity : convertedParams.newCodesDone,
          total: isNaN(convertedParams.newCodesTotal) ? -Infinity : convertedParams.newCodesTotal
        },
        materials: {
          name: PARAMS.convertToString(urlParams.newMaterialsName),
          color: PARAMS.convertToString(urlParams.newMaterialsColor) || `#307a77`,
          done: isNaN(convertedParams.newMaterialsDone) ? -Infinity : convertedParams.newMaterialsDone,
          total: isNaN(convertedParams.newMaterialsTotal) ? -Infinity : convertedParams.newMaterialsTotal
        },
        protocols: {
          name: PARAMS.convertToString(urlParams.newProtocolsName),
          color: PARAMS.convertToString(urlParams.newProtocolsColor) || `#34a270`,
          done: isNaN(convertedParams.newProtocolsDone) ? -Infinity : convertedParams.newProtocolsDone,
          total: isNaN(convertedParams.newProtocolsTotal) ? -Infinity : convertedParams.newProtocolsTotal
        }
      }
    }
  };

  const minWidth = 800;
  const minHeight = 600;
  const width = window.innerWidth > minWidth ? window.innerWidth : minWidth;
  const height = window.innerHeight > minHeight ? window.innerHeight : minHeight;

  const slicesColor = [
    params.data.new.datasets.color,
    params.data.new.codes.color,
    params.data.new.materials.color,
    params.data.new.protocols.color,
    params.data.reUse.protocols.color,
    params.data.reUse.materials.color,
    params.data.reUse.codes.color,
    params.data.reUse.datasets.color
  ];

  const data = [
    {
      name: params.data.new.datasets.name ? params.data.new.datasets.name : `New Data shared`,
      done: params.data.new.datasets.done,
      total: params.data.new.datasets.total,
      opacity: 0.9,
      color: params.data.new.datasets.color,
      background: `#FFFFFF`
    }, // Top right slice
    {
      name: params.data.new.codes.name ? params.data.new.codes.name : `New Code/Software\\Shared`,
      done: params.data.new.codes.done,
      total: params.data.new.codes.total,
      opacity: 0.9,
      color: params.data.new.codes.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.new.materials.name ? params.data.new.materials.name : `New Lab Materials\\given IDs`,
      done: params.data.new.materials.done,
      total: params.data.new.materials.total,
      opacity: 0.9,
      color: params.data.new.materials.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.new.protocols.name ? params.data.new.protocols.name : `Protocols shared`,
      done: params.data.new.protocols.done,
      total: params.data.new.protocols.total,
      opacity: 0.9,
      color: params.data.new.protocols.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.reUse.protocols.name ? params.data.reUse.protocols.name : `ORCIDs`,
      done: params.data.reUse.protocols.done,
      total: params.data.reUse.protocols.total,
      opacity: 0.6,
      color: params.data.reUse.protocols.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.reUse.materials.name ? params.data.reUse.materials.name : `IDs for existing\\Lab Materials`,
      done: params.data.reUse.materials.done,
      total: params.data.reUse.materials.total,
      opacity: 0.6,
      color: params.data.reUse.materials.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.reUse.codes.name ? params.data.reUse.codes.name : `Code/Software\\Cited`,
      done: params.data.reUse.codes.done,
      total: params.data.reUse.codes.total,
      opacity: 0.6,
      color: params.data.reUse.codes.color,
      background: `#FFFFFF`
    },
    {
      name: params.data.reUse.datasets.name ? params.data.reUse.datasets.name : `Data re-use cited`,
      done: params.data.reUse.datasets.done,
      total: params.data.reUse.datasets.total,
      opacity: 0.6,
      color: params.data.reUse.datasets.color,
      background: `#FFFFFF`
    }
  ];

  const radius = Math.min(width, height) * 0.75;

  const maxNumberOfSubSlices = isNaN(params.maxNumberOfSubSlices) ? 20 : params.maxNumberOfSubSlices; // Maximum number of "sub-slices" rendered. If this number is higher, they will not be rendered.

  const innerRadius = radius / 5;

  const fontSize = radius / 15;

  const outerRadius = radius;

  const colorScale = d3.scaleLinear().domain(d3.range(Math.PI)).range([`#8c4e9f`, `#0c8dc3`, `#34a270`]);

  const colorRange = (n) => (n <= 3 ? n : 7 - n);

  const getColor = (n) => (slicesColor[n] ? slicesColor[n] : colorScale((Math.PI / 4) * colorRange(n)));
  // colorScale((Math.PI / 4) * colorRange(n))
  // colorScale(((2 * colorRange(n) * Math.PI) + Math.PI) / 8)

  const yAxis = (g) =>
    g
      .attr(`font-family`, `sans-serif`)
      .attr(`font-size`, fontSize)
      .attr(`text-anchor`, `middle`)
      .call((g) =>
        g
          .selectAll(`g`)
          .data(y.ticks(20).reverse())
          .join(`g`)
          .attr(`fill`, `none`)
          /*.call(g => g.append("circle")
            .attr("stroke", "#000")
            .attr("stroke-opacity", 0.1)
            .attr("r", y))*/
          .call((g) =>
            g
              .append(`text`)
              .attr(`y`, (d) => -y(d) + y(0) - innerRadius)
              .attr(`dy`, `0.3em`)
              .attr(`dx`, `-0.25em`)
              .attr(`stroke`, `#fff`)
              .attr(`stroke-width`, 5)
              .text((d) => (d > 0 && d < 100 && d % 25 === 0 ? `-` : ``)) // Hide first & last "scale"
              .clone(true)
              .attr(`fill`, `currentColor`)
              .attr(`stroke`, `none`)
          )
          .call((g) =>
            g
              .append(`text`)
              .attr(`y`, (d) => -y(d) + y(5) - innerRadius)
              .attr(`dy`, `-0.15em`)
              .attr(`dx`, `-1.8em`)
              .attr(`stroke`, `#fff`)
              .attr(`stroke-width`, 5)
              .text((x, i) => (x > 0 && x < 100 && x % 25 === 0 ? `${x.toFixed(0)}%` : ``))
              .clone(true)
              .attr(`fill`, `currentColor`)
              .attr(`stroke`, `none`)
          )
      );

  const y = d3.scaleLinear().domain([0, 100]).range([innerRadius, outerRadius]);

  const arc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(y(100) + y(0) - innerRadius)
    .cornerRadius(10)
    .padRadius(10);

  const slice = (w, i) =>
    d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(y(w * 100) + y(0) - innerRadius)
      .cornerRadius(10)
      .padRadius(10)({
        startAngle: (Math.PI / 4) * i,
        endAngle: (Math.PI / 4) * i + Math.PI / 4
      });

  const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);

  const pie = d3.pie().sort(null).value(1);

  const init = (data) => {
    // Remove existing nodes
    d3.select(`div#graphic`).selectAll(`*`).remove();

    const arcs = pie(data);

    const svg = d3
      .select(`div#graphic`)
      .append(`svg`)
      .attr(`preserveAspectRatio`, `xMinYMin meet`)
      .attr(`viewBox`, [-width, -radius - 25, width * 2, radius * 2 + 50]);

    let radialGradient = svg
      .append(`defs`)
      .append(`radialGradient`)
      .attr(`id`, `radialGradient`)
      .attr(`gradientUnits`, `userSpaceOnUse`)
      .attr(`r`, y(100))
      .attr(`cx`, `0`)
      .attr(`cy`, `0`);
    radialGradient.append(`stop`).attr(`offset`, `0%`).attr(`stop-color`, `white`).attr(`stop-opacity`, 0.75);
    radialGradient.append(`stop`).attr(`offset`, `15%`).attr(`stop-color`, `white`).attr(`stop-opacity`, 0.5);
    radialGradient.append(`stop`).attr(`offset`, `35%`).attr(`stop-color`, `white`).attr(`stop-opacity`, 0.25);
    radialGradient.append(`stop`).attr(`offset`, `50%`).attr(`stop-color`, `white`).attr(`stop-opacity`, 0.15);
    radialGradient.append(`stop`).attr(`offset`, `100%`).attr(`stop-color`, `white`).attr(`stop-opacity`, 0);

    // Pie slices
    svg
      .append(`g`)
      .attr(`stroke`, `white`)
      .selectAll(`path`)
      .data(arcs)
      .join(`path`)
      .attr(`fill`, (d) => d.data.background)
      .attr(`stroke`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke-width`, (d) => (d.data.total > 0 ? 2 : 0))
      .attr(`d`, arc)
      .clone(true)
      .attr(`fill`, (d) => getColor(d.index))
      .attr(`fill-opacity`, (d) => d.data.opacity)
      .attr(`stroke`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke-width`, (d) => (d.data.total > 0 ? 2 : 0))
      .attr(`d`, (d, i) => (d.data.total > 0 ? slice(d.data.done / d.data.total, i) : ``))
      .clone(true)
      .attr(`fill`, `url(#radialGradient)`);

    // Pie sub-slices
    svg
      .append(`g`)
      .selectAll(`path`)
      .data(
        data.reduce(
          (acc, item, i) =>
            acc.concat(
              Array.from(Array(item.total > 0 && item.total <= maxNumberOfSubSlices ? item.total : 0).keys()).map(
                function (index) {
                  return { index: i, value: item.total > 0 ? index / item.total : 0, opacity: item.opacity };
                }
              )
            ),
          []
        )
      )
      .join(`path`)
      .attr(`fill`, `none`)
      .attr(`fill-opacity`, (d) => d.opacity)
      .attr(`stroke`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke-width`, 2)
      .attr(`d`, (d) => (d.value > 0 ? slice(d.value, d.index) : ``));

    // Center
    svg
      .append(`g`)
      .append(`circle`)
      .attr(`fill`, `white`)
      .attr(`stroke`, `black`)
      .attr(`r`, y(0) + 5);

    // Labels
    svg
      .append(`g`)
      .attr(`font-family`, `sans-serif`)
      .attr(`font-size`, fontSize)
      .attr(`text-anchor`, `middle`)
      .selectAll(`text`)
      .data(
        arcs
          .map(function (arc, index) {
            arc.data.name = `${arc.data.name} (${arc.data.done < 0 ? `?` : arc.data.done}/${
              arc.data.total < 0 ? `?` : arc.data.total
            })`;
            let chunks = arc.data.name.split(`\\`);
            return chunks.map(function (txt, i) {
              let copy = _.cloneDeep(arc);
              copy.data.name = txt;
              copy.data.coeff = index;
              copy.data.line = { number: i, max: chunks.length };
              return copy;
            });
          })
          .flat()
      )
      .join(`text`)
      .text((d) => d.data.name)
      .attr(`transform`, function (d) {
        let elem = d3.select(this);
        let i = d.data.coeff;
        let c = arcLabel.centroid(d);
        let offset = elem.node().getBBox().width / 2;
        let coeff = i === 1 || i === 2 || i === 5 || i === 6 ? 3 : 1.5;
        let pos = c[0] + (i < 4 ? +offset + innerRadius / coeff : -offset - innerRadius / coeff);
        return `translate(${pos},${d.data.line.max <= 1 ? c[1] : c[1] - (fontSize * (d.data.line.max - 1)) / 2 + fontSize * d.data.line.number})`;
      })
      .clone(true)
      .attr(`fill`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke`, `none`);

    // Y axis
    svg.append(`g`).call(yAxis);

    // Dispatch the event.
    window.document.dispatchEvent(new Event(`build`));
    return svg.node();
  };

  let id = URLMANAGER.extractIdsFromCurrentURL()[`documents`];

  if (params.customData || !id) return init(data);

  return API.get(`documents`, { id: id, params: { datasets: true } }, function (err, query) {
    if (err) return;
    if (query.err) return;
    let protocols = query.res.datasets.current.filter(function (item) {
      return item.kind === `protocol`;
    });
    let codes = query.res.datasets.current.filter(function (item) {
      return item.kind === `code`;
    });
    let softwares = query.res.datasets.current.filter(function (item) {
      return item.kind === `software`;
    });
    let reagents = query.res.datasets.current.filter(function (item) {
      return item.kind === `reagent`;
    });
    let datasets = query.res.datasets.current.filter(function (item) {
      return item.kind === `dataset`;
    });
    if (data[0].done < 0)
      data[0].done = datasets.filter(function (item) {
        return !item.reuse && item.status === `valid`;
      }).length;
    if (data[0].total < 0)
      data[0].total = datasets.filter(function (item) {
        return !item.reuse;
      }).length;
    if (data[1].done < 0)
      data[1].done = codes.filter(function (item) {
        return item.status === `valid`;
      }).length;
    if (data[1].total < 0) data[1].total = codes.length;
    if (data[2].done < 0)
      data[2].done = reagents.filter(function (item) {
        return !item.reuse && item.status === `valid`;
      }).length;
    if (data[2].total < 0)
      data[2].total = reagents.filter(function (item) {
        return !item.reuse;
      }).length;
    if (data[3].done < 0)
      data[3].done = protocols.filter(function (item) {
        return !item.reuse && item.status === `valid`;
      }).length;
    if (data[3].total < 0)
      data[3].total = protocols.filter(function (item) {
        return !item.reuse;
      }).length;
    if (data[4].done < 0)
      data[4].done = protocols.filter(function (item) {
        return item.reuse && item.status === `valid`;
      }).length;
    if (data[4].total < 0)
      data[4].total = protocols.filter(function (item) {
        return item.reuse;
      }).length;
    if (data[5].done < 0)
      data[5].done = reagents.filter(function (item) {
        return item.reuse && item.status === `valid`;
      }).length;
    if (data[5].total < 0)
      data[5].total = reagents.filter(function (item) {
        return item.reuse;
      }).length;
    if (data[6].done < 0)
      data[6].done = softwares.filter(function (item) {
        return item.status === `valid`;
      }).length;
    if (data[6].total < 0) data[6].total = softwares.length;
    if (data[7].done < 0)
      data[7].done = datasets.filter(function (item) {
        return item.reuse && item.status === `valid`;
      }).length;
    if (data[7].total < 0)
      data[7].total = datasets.filter(function (item) {
        return item.reuse;
      }).length;
    init(data);
  });
})(d3);

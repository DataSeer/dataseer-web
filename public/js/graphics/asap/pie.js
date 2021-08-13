/*
 * @prettier
 */

'use strict';

(function (d3) {
  const width = 700;
  const height = 700;

  const data = [
    { name: `New Datasets publicly shared`, done: 0, total: 0, opacity: 0.9, background: `#EBEBEB` }, // Top right slice
    { name: `Original Code publicly shared`, done: 0, total: 0, opacity: 0.9, background: `#EBEBEB` },
    { name: `New Materials available`, done: 0, total: 0, opacity: 0.9, background: `#EBEBEB` },
    { name: `Protocols publicly shared`, done: 0, total: 0, opacity: 0.9, background: `#EBEBEB` },
    { name: `Existing Protocol re-use`, done: 0, total: 0, opacity: 0.35, background: `#FFFFFF` },
    { name: `Existing Materials identified`, done: 0, total: 0, opacity: 0.35, background: `#FFFFFF` },
    { name: `Code re-use correctly cited`, done: 0, total: 0, opacity: 0.35, background: `#FFFFFF` },
    { name: `Data re-use correctly cited`, done: 0, total: 0, opacity: 0.35, background: `#FFFFFF` } // Top left slice
  ];

  const innerRadius = height / 10;

  const outerRadius = height / 2;

  const radius = Math.min(width, height) / 2;

  const colorScale = d3.scaleLinear().domain(d3.range(Math.PI)).range([`#8c4e9f`, `#0c8dc3`, `#34a270`]);

  const colorRange = (n) => (n <= 3 ? n : 7 - n);

  const getColor = (n) => colorScale((Math.PI / 4) * colorRange(n));
  // colorScale((Math.PI / 4) * colorRange(n))
  // colorScale(((2 * colorRange(n) * Math.PI) + Math.PI) / 8)

  const yAxis = (g) =>
    g
      .attr(`text-anchor`, `middle`)
      .attr(`font-family`, `roboto`)
      .attr(`font-size`, 12)
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
              .attr(`dy`, `4px`)
              .attr(`dx`, `-1em`)
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
              .attr(`dy`, `4px`)
              .attr(`dx`, `-2em`)
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
    const arcs = pie(data);

    const svg = d3
      .select(`div#graphic`)
      .append(`svg`)
      .attr(`viewBox`, [-width, -(height / 1.8) + 25, width * 2, height + 25]);

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

    // let linearGradient = svg.append("defs")
    //   .append("linearGradient")
    //     .attr("id","linearGradient")
    //     .attr('gradientUnits', 'userSpaceOnUse')
    //     .attr("x1", "0%").attr("y1", "0%")
    //     .attr("x2", "0%").attr("y2", "100%");
    // linearGradient.append("stop")
    //   .attr("offset", "0%")
    //   .attr("stop-color", "white")
    //   .attr("stop-opacity", 1);
    // linearGradient.append("stop")
    //   .attr("offset", "100%")
    //   .attr("stop-color", "white")
    //   .attr("stop-opacity", 0);

    // Pie slices
    svg
      .append(`g`)
      .attr(`stroke`, `white`)
      .selectAll(`path`)
      .data(arcs)
      .join(`path`)
      .attr(`fill`, (d) => d.data.background)
      .attr(`stroke`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke-width`, 2)
      .attr(`d`, arc)
      .clone(true)
      .attr(`fill`, (d) => getColor(d.index))
      .attr(`fill-opacity`, (d) => d.data.opacity)
      .attr(`stroke`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke-width`, 2)
      .attr(`d`, (d, i) => (d.data.done > 0 && d.data.total > 0 ? slice(d.data.done / d.data.total, i) : ``))
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
              Array.from(Array(item.total).keys()).map(function (index) {
                return { index: i, value: index / item.total, opacity: item.opacity };
              })
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
      .attr(`font-size`, 16)
      .attr(`text-anchor`, `middle`)
      .selectAll(`text`)
      .data(arcs)
      .join(`text`)
      .attr(`transform`, (d, i) => {
        let c = arcLabel.centroid(d);
        return `translate(${c[0] * (i === 1 || i === 2 || i === 5 || i === 6 ? 1.5 : 2.5)},${c[1] * 1})`;
      })
      .attr(`dy`, (d) => `1em`)
      .attr(`y`, `-0.5em`)
      .attr(`font-weight`, `bold`)
      .attr(`stroke`, `#fff`)
      .attr(`stroke-width`, 5)
      .text((d) => `${d.data.name} (${d.data.done}/${d.data.total})`)
      .clone(true)
      .attr(`fill`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke`, `none`);

    // Y axis
    svg.append(`g`).call(yAxis);

    return svg.node();
  };

  let id = URLMANAGER.extractIdsFromCurrentURL()[`documents`];
  return API.get(`documents`, { id: id, params: { datasets: true } }, function (err, query) {
    if (err) return;
    if (query.err) return;
    let protocols = query.res.datasets.current.filter(function (item) {
      return item.dataType === `other` && item.subType === `protocol`;
    });
    let codes = query.res.datasets.current.filter(function (item) {
      return item.dataType === `other` && item.subType === `code`;
    });
    let reagents = query.res.datasets.current.filter(function (item) {
      return item.dataType === `other` && item.subType === `reagent`;
    });
    let datasets = query.res.datasets.current.filter(function (item) {
      return item.dataType !== `other`;
    });
    console.log(protocols, codes, reagents, datasets);
    data[0].done = datasets.filter(function (item) {
      return !item.reuse && item.status === `valid`;
    }).length;
    data[0].total = datasets.filter(function (item) {
      return !item.reuse;
    }).length;
    data[1].done = datasets.filter(function (item) {
      return !item.reuse && item.status === `valid`;
    }).length;
    data[1].total = datasets.filter(function (item) {
      return !item.reuse;
    }).length;
    data[2].done = reagents.filter(function (item) {
      return !item.reuse && item.status === `valid`;
    }).length;
    data[2].total = reagents.filter(function (item) {
      return !item.reuse;
    }).length;
    data[3].done = protocols.filter(function (item) {
      return !item.reuse && item.status === `valid`;
    }).length;
    data[3].total = protocols.filter(function (item) {
      return !item.reuse;
    }).length;
    data[4].done = protocols.filter(function (item) {
      return item.reuse && item.status === `valid`;
    }).length;
    data[4].total = protocols.filter(function (item) {
      return item.reuse;
    }).length;
    data[5].done = reagents.filter(function (item) {
      return item.reuse && item.status === `valid`;
    }).length;
    data[5].total = reagents.filter(function (item) {
      return item.reuse;
    }).length;
    data[6].done = datasets.filter(function (item) {
      return item.reuse && item.status === `valid`;
    }).length;
    data[6].total = datasets.filter(function (item) {
      return item.reuse;
    }).length;
    data[7].done = datasets.filter(function (item) {
      return item.reuse && item.status === `valid`;
    }).length;
    data[7].total = datasets.filter(function (item) {
      return item.reuse;
    }).length;
    init(data);
  });
})(d3);

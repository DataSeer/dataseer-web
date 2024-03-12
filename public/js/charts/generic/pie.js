/*
 * @prettier
 */

'use strict';
(function (d3) {
  let urlParams = URLMANAGER.getParamsOfCurrentURL();

  const params = {
    startAngleDelta: parseFloat(urlParams.startAngleDelta),
    scale: PARAMS.convertToBoolean(urlParams.scale),
    maxNumberOfSubSlices: PARAMS.convertToInteger(urlParams.maxNumberOfSubSlices),
    label: Array.isArray(urlParams.label) ? urlParams.label : [],
    done: Array.isArray(urlParams.done) ? urlParams.done : [],
    total: Array.isArray(urlParams.total) ? urlParams.total : [],
    opacity: Array.isArray(urlParams.opacity) ? urlParams.opacity : [],
    color: Array.isArray(urlParams.color) ? urlParams.color : [],
    backgroundColor: Array.isArray(urlParams.backgroundColor) ? urlParams.backgroundColor : []
  };

  const minWidth = 800;
  const minHeight = 600;
  const width = window.innerWidth > minWidth ? window.innerWidth : minWidth;
  const height = window.innerHeight > minHeight ? window.innerHeight : minHeight;

  let hideDate = PARAMS.convertToBoolean(urlParams.hideDate);

  if (hideDate) {
    let element = document.getElementById(`date`);
    element.style.display = `none`;
  }

  let radius = Math.min(width, height) * 0.75;

  const limit = Math.max(
    params.label.length,
    params.done.length,
    params.total.length,
    params.opacity.length,
    params.color.length,
    params.backgroundColor.length
  );

  const startAngleDelta = isNaN(params.startAngleDelta) ? 0 : params.startAngleDelta;

  const scale = params.scale === true;

  const data = [];

  const angleLimit = {
    left: { start: Math.PI, end: 2 * Math.PI },
    right: { start: 0, end: Math.PI },
    top: { start: 0 - Math.PI / 4, end: 0 + Math.PI / 4 },
    bottom: { start: Math.PI - Math.PI / 4, end: Math.PI + Math.PI / 4 }
  };

  for (let i = 0; i < limit; i++) {
    let _d = {
      index: i,
      label: params.label[i].toString(),
      done: params.done[i] === `` ? 0 : PARAMS.convertToInteger(params.done[i]),
      total: params.total[i] === `` ? -1 : PARAMS.convertToInteger(params.total[i]),
      opacity: params.opacity[i] === `` ? 0.9 : parseFloat(params.opacity[i]),
      color: !params.color[i] ? `#000000` : params.color[i],
      backgroundColor: !params.backgroundColor[i] ? `#FFFFFF` : params.backgroundColor[i],
      startAngle: ((2 * Math.PI) / limit) * i - startAngleDelta,
      endAngle: ((2 * Math.PI) / limit) * i + Math.PI / (limit / 2) - startAngleDelta
    };
    _d.inTop = _d.startAngle >= angleLimit.top.start && _d.endAngle <= angleLimit.top.end;
    _d.inBottom = _d.startAngle >= angleLimit.bottom.start && _d.endAngle <= angleLimit.bottom.end;
    _d.inLeft = _d.startAngle >= angleLimit.left.start && _d.endAngle <= angleLimit.left.end;
    _d.inRight = _d.startAngle >= angleLimit.right.start && _d.endAngle <= angleLimit.right.end;
    data.push(_d);
  }

  let topOffset = 0;
  let bottomOffset = 0;
  let leftOffset = 0;
  let rightOffset = 0;

  const slicesColor = data.map(function (item, i) {
    return item.color;
  });

  const maxNumberOfSubSlices = isNaN(params.maxNumberOfSubSlices) ? 20 : params.maxNumberOfSubSlices; // Maximum number of "sub-slices" rendered. If this number is higher, they will not be rendered.

  const innerRadius = radius / 5;

  const fontSize = radius / 15;

  const outerRadius = radius;

  const getColor = (n) => slicesColor[n];

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

  const arc = (w, i) =>
    d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(y(100) + y(0) - innerRadius)
      .cornerRadius(10)
      .padRadius(10)({
        startAngle: data[i].startAngle,
        endAngle: data[i].endAngle
      });

  const slice = (w, i) =>
    d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(y(w * 100) + y(0) - innerRadius)
      .cornerRadius(10)
      .padRadius(10)({
        startAngle: data[i].startAngle,
        endAngle: data[i].endAngle
      });

  // const arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);
  const arcLabel = (w, i) =>
    d3.arc().innerRadius(radius).outerRadius(radius).startAngle(data[i].startAngle).endAngle(data[i].endAngle);

  const pie = d3.pie().sort(null).value(1);

  const init = (data) => {
    // Remove existing nodes
    d3.select(`div#graphic`).selectAll(`*`).remove();

    const arcs = pie(data);

    const svg = d3
      .select(`div#graphic`)
      .append(`svg`)
      .attr(`preserveAspectRatio`, `xMinYMin meet`)
      .attr(`viewBox`, [-radius, -radius, radius * 2, radius * 2]);

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
      .attr(`fill`, (d) => d.data.backgroundColor)
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
            arc.data.label = `${arc.data.label} (${arc.data.done < 0 ? `?` : arc.data.done}/${
              arc.data.total < 0 ? `?` : arc.data.total
            })`;
            let chunks = arc.data.label.split(`\\`);
            return chunks.map(function (txt, i) {
              let copy = _.cloneDeep(arc);
              copy.data.label = txt;
              copy.data.coeff = index;
              copy.data.line = { number: i, max: chunks.length };
              return copy;
            });
          })
          .flat()
      )
      .join(`text`)
      .text((d) => d.data.label)
      .attr(`transform`, function (d) {
        let elem = d3.select(this);
        let c = arcLabel(1, d.index).centroid(d);
        let offset = { x: elem.node().getBBox().width, y: elem.node().getBBox().height };
        let x = c[0];
        let y = c[1] + ((fontSize * (d.data.line.max - 1)) / 2 + fontSize * d.data.line.number);
        if (d.data.inTop) {
          let _o = offset.y;
          y -= _o / 2;
          topOffset = _o > topOffset ? _o : topOffset;
        } else if (d.data.inBottom) {
          let _o = offset.y;
          y += _o / 2 + fontSize;
          bottomOffset = _o > bottomOffset ? _o : bottomOffset;
        }
        if (d.data.inLeft) {
          let _o = offset.x;
          x -= _o / 2 + fontSize;
          leftOffset = _o > leftOffset ? _o : leftOffset;
        } else if (d.data.inRight) {
          let _o = offset.x;
          x += _o / 2 + fontSize;
          rightOffset = _o > rightOffset ? _o : rightOffset;
        }
        return `translate(${x},${y})`;
      })
      .clone(true)
      .attr(`fill`, (d) => d3.rgb(getColor(d.index)).darker(1))
      .attr(`stroke`, `none`);

    // Y axis
    if (scale) svg.append(`g`).call(yAxis);

    let xRadiusOffset = (leftOffset + rightOffset) / 1.5;
    let yRadiusOffset = bottomOffset + topOffset;

    let computedWidth = radius + xRadiusOffset;
    let computedHeight = radius + yRadiusOffset; // +50 is for the Assesed Date

    radius += xRadiusOffset > yRadiusOffset ? xRadiusOffset : yRadiusOffset;

    svg.attr(`viewBox`, [-computedWidth, -computedHeight, computedWidth * 2, computedHeight * 2]);
    svg.style(`width`, computedWidth);
    svg.style(`height`, computedHeight);
    svg.style(`display`, `block`);
    svg.style(`margin`, `auto`);

    // Dispatch the event.
    window.document.dispatchEvent(new Event(`build`));
  };

  return init(data);
})(d3);

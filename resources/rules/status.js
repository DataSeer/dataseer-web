/*
 * @prettier
 */

'use strict';

module.exports = {
  datasets: require(`./status/datasets.json`),
  protocols: {
    'manufacturer instructions': require(`./status/protocols.mi.json`),
    '': require(`./status/protocols.none.json`),
    'published protocol': require(`./status/protocols.pp.json`),
    'surveys and questionnaires': require(`./status/protocols.s&q.json`)
  },
  softwares: {
    'custom scripts': require(`./status/softwares.custom-scripts.json`),
    '': require(`./status/softwares.none.json`),
    'software package': require(`./status/softwares.software-package.json`),
    'software': require(`./status/softwares.software.json`)
  },
  codes: require(`./status/codes.json`),
  reagents: require(`./status/reagents.json`)
};

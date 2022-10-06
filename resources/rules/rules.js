/*
 * @prettier
 */

'use strict';

module.exports = {
  datasets: require(`./mappings/datasets.json`),
  protocols: {
    'manufacturer instructions': require(`./mappings/protocols.mi.json`),
    '': require(`./mappings/protocols.none.json`),
    'published protocol': require(`./mappings/protocols.pp.json`),
    'surveys and questionnaires': require(`./mappings/protocols.s&q.json`)
  },
  softwares: {
    'custom scripts': require(`./mappings/softwares.custom-scripts.json`),
    '': require(`./mappings/softwares.none.json`),
    'software package': require(`./mappings/softwares.software-package.json`),
    'software': require(`./mappings/softwares.software.json`)
  },
  codes: require(`./mappings/codes.json`),
  reagents: require(`./mappings/reagents.json`)
};

/*
 * @prettier
 */

'use strict';

module.exports = {
  datasets: require(`./checks/datasets.js`),
  protocols: {
    'manufacturer instructions': require(`./checks/protocols.mi.js`),
    '': require(`./checks/protocols.none.js`),
    'published protocol': require(`./checks/protocols.pp.js`),
    'surveys and questionnaires': require(`./checks/protocols.s&q.js`)
  },
  softwares: {
    'custom scripts': require(`./checks/softwares.custom-scripts.js`),
    '': require(`./checks/softwares.none.js`),
    'software package': require(`./checks/softwares.software-package.js`),
    'software': require(`./checks/softwares.software.js`)
  },
  codes: require(`./checks/codes.js`),
  reagents: require(`./checks/reagents.js`)
};

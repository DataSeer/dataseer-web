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
  software: {
    'custom scripts': require(`./checks/software.custom-scripts.js`),
    '': require(`./checks/software.none.js`),
    'software package': require(`./checks/software.software-package.js`),
    'software': require(`./checks/software.software.js`)
  },
  code: {
    'custom scripts': require(`./checks/code.custom-scripts.js`),
    '': require(`./checks/code.none.js`),
    'software package': require(`./checks/code.software-package.js`),
    'software': require(`./checks/code.software.js`)
  },
  reagents: require(`./checks/reagents.js`)
};

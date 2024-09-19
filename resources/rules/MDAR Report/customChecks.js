/*
 * @prettier
 */

'use strict';

module.exports = {
  datasets: require(`./checks/datasets.js`),
  protocols: {
    'animal': require(`./checks/protocols.ethics.js`),
    'human': require(`./checks/protocols.ethics.js`),
    'collection permit': require(`./checks/protocols.ethics.js`),
    '': require(`./checks/protocols.none.js`),
    'published protocol': require(`./checks/protocols.pp.js`),
    'pre-registration': require(`./checks/protocols.pre-reg.js`)
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

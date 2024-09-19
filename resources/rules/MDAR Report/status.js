/*
 * @prettier
 */

'use strict';

module.exports = {
  datasets: require(`./status/datasets.json`),
  protocols: {
    'animal': require(`./status/protocols.ethics.json`),
    'human': require(`./status/protocols.ethics.json`),
    'collection permit': require(`./status/protocols.ethics.json`),
    '': require(`./status/protocols.none.json`),
    'published protocol': require(`./status/protocols.pp.json`),
    'pre-registration': require(`./status/protocols.pre-reg.json`)
  },
  software: {
    'custom scripts': require(`./status/software.custom-scripts.json`),
    '': require(`./status/software.none.json`),
    'software package': require(`./status/software.software-package.json`),
    'software': require(`./status/software.software.json`)
  },
  code: {
    'custom scripts': require(`./status/code.custom-scripts.json`),
    '': require(`./status/code.none.json`),
    'software package': require(`./status/code.software-package.json`),
    'software': require(`./status/code.software.json`)
  },
  reagents: require(`./status/reagents.json`)
};

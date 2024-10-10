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
  software: require(`./checks/software.js`),
  code: require(`./checks/code.js`),
  reagents: require(`./checks/reagents.js`)
};

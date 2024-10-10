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
  software: require(`./status/software.json`),
  code: require(`./status/code.json`),
  reagents: require(`./status/reagents.json`)
};

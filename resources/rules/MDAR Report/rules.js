/*
 * @prettier
 */

'use strict';

const mappings = {
  'datasets': require(`./mappings/datasets.json`),
  'protocols': {
    'animal': require(`./mappings/protocols.ethics.json`),
    'human': require(`./mappings/protocols.ethics.json`),
    'collection permit': require(`./mappings/protocols.ethics.json`),
    '': require(`./mappings/protocols.none.json`),
    'published protocol': require(`./mappings/protocols.pp.json`),
    'pre-registration': require(`./mappings/protocols.pre-reg.json`)
  },
  'software': require(`./mappings/software.json`),
  'code': require(`./mappings/code.json`),
  'reagents': require(`./mappings/reagents.json`)
};

// Build the given mapping
const buildMapping = function (mapping) {
  let result = {};
  for (let key in mapping) {
    let value = parseInt(key, 10);
    if (isNaN(value)) continue;
    let rules = mapping[key];
    if (!Array.isArray(rules)) continue;
    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i];
      if (typeof result[rule] === `undefined`) {
        result[rule] = [value];
      } else if (Array.isArray(result[rule])) {
        result[rule].push(value);
      }
    }
  }
  return result;
};

module.exports = {
  'datasets': buildMapping(mappings.datasets),
  'protocols': {
    'animal': buildMapping(mappings.protocols[`animal`]),
    'human': buildMapping(mappings.protocols[`human`]),
    'collection permit': buildMapping(mappings.protocols[`collection permit`]),
    '': buildMapping(mappings.protocols[``]),
    'published protocol': buildMapping(mappings.protocols[`published protocol`]),
    'pre-registration': buildMapping(mappings.protocols[`pre-registration`]),
  },
  'software': buildMapping(mappings.software),
  'code': buildMapping(mappings.code),
  'reagents': buildMapping(mappings.reagents)
};

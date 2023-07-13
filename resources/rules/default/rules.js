/*
 * @prettier
 */

'use strict';

const mappings = {
  'datasets': require(`./mappings/datasets.json`),
  'protocols': {
    'manufacturer instructions': require(`./mappings/protocols.mi.json`),
    '': require(`./mappings/protocols.none.json`),
    'published protocol': require(`./mappings/protocols.pp.json`),
    'surveys and questionnaires': require(`./mappings/protocols.s&q.json`)
  },
  'softwares': {
    'custom scripts': require(`./mappings/softwares.custom-scripts.json`),
    '': require(`./mappings/softwares.none.json`),
    'software package': require(`./mappings/softwares.software-package.json`),
    'software': require(`./mappings/softwares.software.json`)
  },
  'codes': {
    'custom scripts': require(`./mappings/codes.custom-scripts.json`),
    '': require(`./mappings/codes.none.json`),
    'software package': require(`./mappings/codes.software-package.json`),
    'software': require(`./mappings/codes.software.json`)
  },
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
    'manufacturer instructions': buildMapping(mappings.protocols[`manufacturer instructions`]),
    '': buildMapping(mappings.protocols[``]),
    'published protocol': buildMapping(mappings.protocols[`published protocol`]),
    'surveys and questionnaires': buildMapping(mappings.protocols[`surveys and questionnaires`])
  },
  'softwares': {
    'custom scripts': buildMapping(mappings.softwares[`custom scripts`]),
    '': buildMapping(mappings.softwares[``]),
    'software package': buildMapping(mappings.softwares[`software package`]),
    'software': buildMapping(mappings.softwares[`software`])
  },
  'codes': {
    'custom scripts': buildMapping(mappings.codes[`custom scripts`]),
    '': buildMapping(mappings.codes[``]),
    'software package': buildMapping(mappings.codes[`software package`]),
    'software': buildMapping(mappings.codes[`software`])
  },
  'reagents': buildMapping(mappings.reagents)
};

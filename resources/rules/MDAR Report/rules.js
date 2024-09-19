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
  'software': {
    'custom scripts': require(`./mappings/software.custom-scripts.json`),
    '': require(`./mappings/software.none.json`),
    'software package': require(`./mappings/software.software-package.json`),
    'software': require(`./mappings/software.software.json`)
  },
  'code': {
    'custom scripts': require(`./mappings/code.custom-scripts.json`),
    '': require(`./mappings/code.none.json`),
    'software package': require(`./mappings/code.software-package.json`),
    'software': require(`./mappings/code.software.json`)
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
  'software': {
    'custom scripts': buildMapping(mappings.software[`custom scripts`]),
    '': buildMapping(mappings.software[``]),
    'software package': buildMapping(mappings.software[`software package`]),
    'software': buildMapping(mappings.software[`software`])
  },
  'code': {
    'custom scripts': buildMapping(mappings.code[`custom scripts`]),
    '': buildMapping(mappings.code[``]),
    'software package': buildMapping(mappings.code[`software package`]),
    'software': buildMapping(mappings.code[`software`])
  },
  'reagents': buildMapping(mappings.reagents)
};

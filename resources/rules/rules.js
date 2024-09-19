/*
 * @prettier
 */

'use strict';

const DEFAULT = require(`./default/dataObjects.js`);
const HHMI = require(`./HHMI/dataObjects.js`);
const ASAP = require(`./ASAP/dataObjects.js`);
const ASAP_GP2 = require(`./ASAP-GP2/dataObjects.js`);
const ASAP_PPMI = require(`./ASAP-PPMI/dataObjects.js`);
const MDARReport = require(`./MDAR Report/dataObjects.js`);
const MJFFImpactReport = require(`./MJFF Impact Report/dataObjects.js`);

let Self = {
  'default': DEFAULT,
  'HHMI': HHMI,
  'ASAP': ASAP,
  'ASAP-GP2': ASAP_GP2,
  'ASAP-PPMI': ASAP_PPMI,
  'MDAR Report': MDARReport,
  'MJFF Impact Report': MJFFImpactReport
};

module.exports = Self;

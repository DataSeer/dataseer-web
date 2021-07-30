/*
 * @prettier
 */

'use strict';

const OrganizationsLogs = require(`../../models/organizations.logs.js`);

const Logs = require(`../../lib/logs.js`);

module.exports = new Logs(OrganizationsLogs);

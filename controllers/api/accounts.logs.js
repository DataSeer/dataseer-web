/*
 * @prettier
 */

'use strict';

const AccountsLogs = require(`../../models/accounts.logs.js`);

const Logs = require(`../../lib/logs.js`);

module.exports = new Logs(AccountsLogs);

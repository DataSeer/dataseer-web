/*
 * @prettier
 */

let object = {
  'roles': {
    'standard_user': {
      'label': 'standard_user',
      'weigth': 10
    },
    'annotator': {
      'label': 'annotator',
      'weigth': 100
    },
    'curator': {
      'label': 'curator',
      'weigth': 1000
    }
  },
  'match': {
    'role': 'role', // will check only role
    'weight': 'weight', // will check only weight
    'all': 'all' // will check role & weight
  }
};

// check AccessRight of given user
object.checkAccountAccessRight = function(account, role = object.roles.standard_user, match = object.match.weight) {
  if (typeof account !== 'undefined' && typeof role === 'object') {
    if (typeof object.match[match] !== 'undefined') {
      if (object.match[match] === object.match.weight) return account.role.weigth >= role.weigth;
      else if (object.match[match] === object.match.all)
        return account.role.weigth >= role.weigth && account.role.label === role.label;
      else if (object.match[match] === object.match.role) return account.role.label === role.label;
    }
  }
  return false;
};

module.exports = object;

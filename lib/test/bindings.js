const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

const tag = (ident, type, selector) => ({
  token: { ident, type },
  message: { selector },
});

const token = (id) => (id.token ? id : { token: { ...id } });

module.exports = {
  int: (...ident) => ({ ident: parseInt(ident.join('')), type: 'literal' }),
  op: (ident) => ({ ident, type: 'literal' }),
  cell: (...ident) => ({ ident: ident.join(''), type: 'cell' }),
  predicate: (arg1, op, arg2) => {
    return op ? [tag('postfix', 'bind', [arg1, arg2, token(op)])] : arg1;
  },
  postfix: (arg1, arg2, op) =>
    ({
      '+': arg1 + arg2,
      '-': arg1 - arg2,
      '<': arg1 < arg2,
      '>': arg1 > arg2,
    }[op]),
  log: (args = 'undefined') => console.log(...[].concat(args)) || args,
};

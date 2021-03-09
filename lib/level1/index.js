const requires = require('./requires');
const Token = require('./Token');
const Selector = require('./Selector');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

const flatmap = (acc, arg) =>
  Array.isArray(arg) ? arg.reduce(flatmap, acc) : [...acc, arg];

module.exports = (frame) => {
  Object.entries({
    int: (...ident) => ({ ident: parseInt(ident.join('')), type: 'literal' }),
    op: (ident) => ({ ident, type: 'literal' }),
    cell: (...ident) => ({ ident: ident.join(''), type: 'cell' }),
    predicate: (arg1, op, arg2) => {
      return op
        ? [
            Selector(Token('postfix', 'bind'), [
              arg1,
              arg2,
              Selector(Token(op)),
            ]),
          ]
        : arg1;
    },
    postfix: (...props) => {
      const binary = (arg1, arg2, op) =>
        ({
          '+': arg1 + arg2,
          '-': arg1 - arg2,
          '<': arg1 < arg2,
          '>': arg1 > arg2,
          '=': arg1 == arg2,
          '<>': arg1 != arg2,
          '||': arg1 || arg2,
          '&&': arg1 && arg2,
        }[op]);
      const args = props.reduce(flatmap, []);
      if (args.length === 3) return binary(...args);
    },
    log: (args = 'undefined') => console.log(...[].concat(args)) || args,
    requires: requires(frame).action,
  }).reduce((acc, [id, binding]) => {
    if (acc[id]) console.warn(`level-1: binding ${id} will be overwritten`);
    acc[id] = binding;
    return acc;
  }, frame.bindings);

  frame.compile(`
    predicate:\`tag (op predicate)?\` is selector {
      op:\`('+' / '-' / '<' / '>' / '||' / '&&' / '=' / '<>')\`
    }
    int:\`[0-9]+\` is token
    ${requires(frame).grammar}
  `);
};

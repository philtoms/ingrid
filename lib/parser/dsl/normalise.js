const identity = require('../../utils/identity');
const actions = require('../actions');

const normaliseActions = actions(identity);

const log = (res) => console.log(JSON.stringify(res, null, 2));

const normalise = (rule) =>
  ({
    intention: (ast, error) => {
      if (error) {
        let [_, intent, selector] = ast;
        if (selector.rule === 'str') {
          selector = [{ token: selector }];
        }
        return [intent, selector];
      }
      if (ast === 'whitespace') return [ast];
      return ast;
    },
    symbol: (ast) => {
      if (ast.token) return ast.token.ident;
      return ast;
    },
    token: (ast) => {
      if (ast.token) return [ast.token, ast.quantifier];
      return ast;
    },
    selector: (ast) => {
      if (ast.token) return [ast];
      return ast;
    },
    tag: (ast) => {
      if (Array.isArray(ast)) {
        if (ast[0] === 'whitespace' && ast[1].ident)
          // [token, message]
          return [normaliseActions.token(ast[1]), null];
        if (ast[0].token) {
          const [s1, ...s2] = ast;
          return Object.values(s1).concat(s2);
        }
      }
      if (ast === 'whitespace') return [ast];
      return ast;
    },
  }[rule] || ((ast) => ast));

module.exports = normalise;

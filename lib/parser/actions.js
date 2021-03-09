const { empty } = require('../utils/symbols');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

const baseActions = (parseRule) => ({
  module: (statements) => {
    return statements;
  },
  statement: (selectors, intentions) => {
    const ast = {
      ...withLocation(),
      selectors,
      intentions: intentions.filter(({ intent }) => intent !== 'whitespace'),
    };
    if (selectors.find(({ rule }) => rule)) {
      const location = getLocation();
      return parseRule(ast, location);
    }
    return ast;
  },
  tag: (alias, token, message, quantifier, selectors) => {
    return [
      { ...withLocation(), token: { ...token, ...alias, quantifier }, message },
    ].concat(selectors);
  },
  intention: (intent, selector) => {
    selector = selector.filter(
      ({ token = {} }) => token.quantifier !== 'whitespace'
    );
    return {
      ...withLocation(),
      intent: selector.length ? intent : 'whitespace',
      selector,
    };
  },
  block: (statementBlock) => {
    return ['block', statementBlock];
  },
  message: (selector) => {
    return {
      ...withLocation(),
      selector: selector[0].token
        ? selector
        : [
            {
              token: {
                type: empty,
                ...selector[0],
                ...(selector[1] ? { quantifier: selector[1] } : {}),
              },
            },
          ],
    };
  },
  selector: (selector) => {
    return selector;
  },
  intent: (intent) => {
    return intent;
  },
  alias: ({ ident }) => {
    return { ...withLocation(), alias: ident };
  },
  token: ({ ident, type }) => {
    return { ...withLocation(), ident, type, rule: 'token' };
  },
  str: (chars) => {
    return { ident: chars.join(''), type: 'tag', rule: 'str' };
  },
  regex: (chars) => {
    return { ident: '/' + chars.join(''), type: 'regex' };
  },
  regexstr: (ld, chars, rd, quantifier) => {
    return {
      ident: ld + chars.join('') + rd + (quantifier || ''),
      type: 'regexstr',
    };
  },
  symbol: (chars) => {
    return { ident: [].concat(chars).join(''), type: 'tag' };
  },
  quantifier: (quantifier) => {
    if (Array.isArray(quantifier)) {
      const [q1, q2] = quantifier;
      return q2 === null
        ? {
            min: q1.join(''),
            max: q1.join(''),
          }
        : {
            min: q1.join(''),
            max: q2[1].join(''),
          };
    }
    return quantifier;
  },
  whitespace: (_) => {
    return 'whitespace';
  },
  rule: ({ alias }, ld, ws1, tokens, ws2, rd) => {
    const grammar = {
      rule: alias,
      tokens: tokens.map(([token]) =>
        token.ident
          ? token.rule === 'str'
            ? `'${token.ident}'`
            : token.ident
          : token
      ),
    };
    return [{ rule: true, token: { ident: alias, type: 'grammar', grammar } }];
  },
});

module.exports = baseActions;

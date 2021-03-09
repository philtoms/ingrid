const rules = {
  module: `statement+`,
  statement: `((rule / tag) intention*)`,
  tag: `(alias? token message? quantifier?)`,
  intention: `(intent selector) / block`,
  selector: `tag`,
  block: `'{' statement+ '}'`,
  message: `'(' (selector / (alias? quantifier?)) ')'`,
  intent: `'is' / 'after' / 'before'`,
  alias: `((symbol / str) ':')`,
  token: `symbol / str / regex`,
  regex: `'/' [^\\/]+ '/'`,
  symbol: `[\.a-zA-Z0-9_]+`,
  str: `"'" ("\\\\'" / [^'])* "'"`,
  regexstr: `'[' [\\\\\ \\.\\-\\^a-zA-Z0-9_]+ ']' [\\*\\+\\?]?`,
  quantifier: `('{' [0-9]+ (',' [1-9]+)? '}') / '?' / '*' /'+'`,
  ws: `[ \\t\\r\\n]*`,
  rule: `'undefined'`,
};

module.exports = rules;

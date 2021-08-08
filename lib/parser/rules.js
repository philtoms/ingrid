const rules = {
  module: `statement+`,
  statement: `((rule / selector) intention*)`,
  selector: `tag`,
  intention: `(intent selector) / block`,
  block: `'{' statement* '}'`,
  intent: `'is' / 'after' / 'before'`,
  tag: `(alias? token message? quantifier?)`,
  message: `'(' (selector / (alias? quantifier?)) ')'`,
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

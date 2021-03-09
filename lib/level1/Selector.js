Token = require('./Token');

module.exports = (tag, selector = [], quantifier = null) => ({
  alias: null,
  token: Token(tag),
  message: selector.length ? { selector } : null,
  quantifier,
  ...(tag.token ? tag : {}),
});

module.exports = (ident, type = 'tag', rule = 'token') => ({
  ident,
  type,
  rule,
  ...(ident.type ? ident : {}),
});

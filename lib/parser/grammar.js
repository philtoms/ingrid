const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

module.exports = (rules, ruleTokens = []) => `
{
  global.withLocation = global.pegContext.detail === 'debug'? () => ({location:location()}): () => ({});
  global.getLocation = location;
  const actions = global.pegContext.actions;
  global.pegContext.failed = peg$FAILED;
}

module = _ b:(${rules.module}) _ {
  return actions.module(b)
}
statement = _ s:(${rules.statement}) _ {
  return actions.statement(...s)
}
selector = s:(${rules.selector}) t:(',' tag)* _ {
  return actions.selector(s, t.map(([,t])=>t))
}
tag = t:(${rules.tag}) {
  return actions.tag(...t)
}
intention = i:(${rules.intention}) {
  return actions.intention(...i)
}
block = _ sb:(${rules.block}) _ {
  return actions.block(sb[1])
}
message = m:(${rules.message}) {
  return actions.message((m[1][0] ? m[1] : [{}, m[1][1]]))
}
intent = _ i:(${rules.intent}) _ {
  return actions.intent(i)
}
alias = _ a:(${rules.alias}) {
  return actions.alias(...a)
}
token = _ t:(${rules.token}) {
  return actions.token(t)
}
symbol = s:(${rules.symbol}) {
  return actions.symbol(s)
}
str	= s:(${rules.str}) {
  return actions.str(s[1])
}
regex	= r:(${rules.regex}) {
  return actions.regex(r[1])
}
regexstr = r:(${rules.regexstr}) {
  return actions.regexstr(...r)
}
quantifier = q:(${rules.quantifier}) {
  return actions.quantifier(Array.isArray(q) ? [q[1], q[2]] : q)
}
_ = ws:(${rules.ws}) {
  return actions.whitespace(ws)
}
rule = r:(${rules.rule}) {
  return actions.rule(...r)
}
${ruleTokens
  .map(
    (ident) => `${ident} = _${ident}:(${rules[ident]}) {
  var dsl$currPos = peg$savedPos;
  var dsl$tokens = actions.${ident}(_${ident})
  if (dsl$tokens === peg$FAILED) {
    peg$currPos = dsl$currPos;
  }
  return dsl$tokens;
}`
  )
  .join('\n')}
`;

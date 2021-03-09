const baseRules = require('../rules');
const baseActions = require('../actions');
const grammar = require('../grammar');
const ruleParser = require('./ruleParser');

const log = res => console.log(JSON.stringify(res, null, 2)) || res;

const generator = (bindings, parse, regenerate) => {
  const parseRule = ruleParser(bindings, parse, baseRules, regenerate);

  return grammars => {
    const dslRules = Object.entries(grammars).reduce(
      (acc, [ruleToken, { baseRule, grammar }]) => ({
        ...acc,
        ...(baseRule
          ? { [baseRule]: `(${ruleToken}) / ${acc[baseRule]}` }
          : {}),
        [ruleToken]: grammar
      }),
      baseRules
    );

    const rules = {
      ...dslRules,
      rule: `alias '\`' _ ((${[
        ...Object.keys(dslRules).map(key => `'${key}'`),
        "'('",
        "')'",
        "'/'",
        "'+'",
        "'?'",
        "'*'",
        'regexstr',
        'str',
        'symbol'
      ].join(' / ')}) _)+ _ '\`'`
    };

    const actions = Object.entries(grammars).reduce(
      (acc, [rule, { action }]) => ({
        ...acc,
        [rule]: action
      }),
      baseActions(parseRule(grammars))
    );

    const ruleTokens = Object.entries(grammars).reduce(
      (acc, [ruleToken]) => [...acc, ruleToken],
      []
    );
    return [grammar(rules, ruleTokens), actions];
  };
};
module.exports = generator;

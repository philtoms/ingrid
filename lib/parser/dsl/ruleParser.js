const parseAction = require('./parseAction');

const log = (res) => console.log(JSON.stringify(res, null, 2));

let curLocation;
let curGrammar;

const ruleParser = (bindings, parse, baseRules, regenerate) => (grammars) => (
  ast,
  location
) => {
  const {
    token: { ident },
  } = ast.selectors[0];
  const parsed = parse([ast]).selectors;
  const token = Object.keys(parsed).find((key) => key === ident);
  const { intentions, blocks, grammar: { rule, tokens } = {} } = parsed[token]
    .selected[0] || {
    rule: {},
  };
  if (rule && !grammars[rule]) {
    // extract the base level rule then cascade
    const baseRule = Object.keys(baseRules).find(
      (key) =>
        key ===
        (
          intentions.find(({ intent }) => intent === 'is') || {
            selector: [{}],
          }
        ).selector[0].ident
    );

    const newGrammar = {
      ...grammars,
      [rule]: {
        baseRule,
        grammar: `(_ ${tokens.join(' ')})`,
        action: parseAction(baseRule, tokens, bindings[rule]),
      },
    };
    const newLocationTest = JSON.stringify(location);
    const newGrammarTest = JSON.stringify(newGrammar);
    if (newGrammarTest !== curGrammar && newLocationTest !== curLocation) {
      curGrammar = newGrammarTest;
      curLocation = newLocationTest;
      regenerate(newGrammar);
    }
  }
  return ast;
};

module.exports = ruleParser;

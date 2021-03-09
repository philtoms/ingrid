const normalise = require('./normalise');

const flattenArgs = (acc, arg) => {
  if (arg === 'whitespace') return acc;
  if (Array.isArray(arg)) return arg.reduce(flattenArgs, acc);
  return [...acc, arg];
};

const removeWhitespace = (acc, arg) => {
  if (arg === 'whitespace') return acc;
  return [...acc, Array.isArray(arg) ? arg.reduce(removeWhitespace, []) : arg];
};

const parseAction = (baseRule, grammar, binding) => {
  const normaliseArgs = normalise(baseRule);
  const action = binding || (args => args);

  return args => {
    const ast = action(...args.reduce(flattenArgs, []));
    if (ast === pegContext.failed) {
      return pegContext.failed;
    }
    return normaliseArgs(ast);
  };
};

module.exports = parseAction;

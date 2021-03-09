const parser = require('../parser');
const resolver = require('../resolver');
const compiler = require('../compiler');
const level1 = require('../level1');
const imports = require('./imports');
const Statements = require('./statements');
const Selectors = require('./selectors');

const log = res => console.log(JSON.stringify(res, null, 2)) || res;

const ingrid = (baseOptions = {}) => {
  let counter = 0;
  const nextCounter = () => ++counter;
  const nextSymbol = () => '$' + nextCounter();

  const isolate = options => {
    const frame = {
      ...baseOptions,
      ...options,
      selectors: Selectors(),
      statements: Statements({}),
      bindings: {
        ...baseOptions.bindings,
        ...options.bindings
      },
      exports: [],
      instructions: {},
      heap: {},
      nextSymbol,
      nextFrame: isolate
    };

    const resolve = resolver(frame);
    const compile = compiler(frame);

    frame.parse = parser(frame);
    frame.resolve = src => resolve(frame.parse(src));

    frame.compile = src => {
      const output = compile(frame.resolve(src));
      frame.exports = [...frame.exports, ...output.exports];
      frame.instructions = {
        ...frame.instructions,
        ...output.instructions
      };
      frame.api = {
        ...frame.api,
        ...output.api
      };
      frame.selectors.merge();
      frame.statements.merge();

      return output;
    };

    frame.import = imports(frame);

    if (frame.level1) {
      level1(frame);
    }

    return frame;
  };
  return isolate(baseOptions);
};

module.exports = ingrid;

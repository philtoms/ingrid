const Frame = require('../frame');
const interpreter = require('../interpreter');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

const src = `predicate:\`arg (op selector)?\` is selector {
  arg:\`tag\`
  op:\`'*' / '/' / '+' / '-'\` {
    prec is 2 if postfix('=',op,'*')
         is 1 if postfix('=',op,'+')
  }

  opstack* is op
    is predicate.op after postfix('=', push, true)

  parts+ is arg
    is opstack.pop() after postfix('=', push, false, '&&', opstack.pop, 'call')

  push is postfix('>', selector.op.prec?, opstack.top.prec)

  predicate is postfix(parts*, selector.parts*)
}
`;
describe('predicate', () => {
  let compile;
  let frame;

  beforeEach(() => {
    frame = Frame({ level1: true, __dirname });
    compile = frame.compile;
    interpret = interpreter(frame);
  });

  test('snapshot', () => {
    expect(compile(src)).toMatchSnapshot();
  });
});

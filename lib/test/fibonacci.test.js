const Frame = require('../frame');
const interpreter = require('../interpreter');

const log = res => console.log(JSON.stringify(res, null, 2)) || res;

describe('fibonacci', () => {
  let compile;
  let frame;

  beforeEach(() => {
    frame = Frame({ level1: true, __dirname });
    compile = frame.compile;
    interpret = interpreter(frame);
  });

  test('snapshot', () => {
    compile(`A is './fibonacci.in' is fibonacci(10)`);
    expect(interpret('A')).toMatchSnapshot();
  });
});

const Frame = require('../../frame');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('requires', () => {
  let compile;
  let frame;

  beforeEach(() => {
    frame = Frame({ __dirname, level1: true });
    compile = frame.compile;
  });

  it('should ignore string identifier', () => {
    expect(compile(`A is 'test'`)).toMatchSnapshot();
  });
  it('should require file into selector scope', () => {
    const { instructions } = compile(`'./A.in'`);
    expect(instructions).toMatchSnapshot();
  });
  it('should require file Api into selector scope (one dot rule)', () => {
    compile(`'./AM.in'`);
    expect(frame.api).toMatchSnapshot();
  });
  it('should apply file Api to local scope(one dot rule)', () => {
    const { instructions } = compile(`'./AM.in' is b()`);
    expect(instructions).toMatchSnapshot();
  });
  it('should require nested file into selector scope', () => {
    const { instructions } = compile(`'./AB.in'`);
    expect(instructions).toMatchSnapshot();
  });
  it('should extend file selector', () => {
    const { instructions } = compile(`'./A.in' is 123 {b is 123}`);
    expect(instructions).toMatchSnapshot();
  });
  it('should append file selector as temporal', () => {
    const { instructions } = compile(`'./A.in' is 123 after b`);
    expect(instructions).toMatchSnapshot();
  });
  it('should prepend file selector as temporal', () => {
    const { instructions } = compile(`'./A.in' is 123 before c`);
    expect(instructions).toMatchSnapshot();
  });
  it('should select frame scoped file intention', () => {
    const { instructions } = compile(`A is './b/B.in'`);
    expect(instructions).toMatchSnapshot();
  });
  it('should reference frame scoped file selectors', () => {
    const { instructions } = compile(`A is './AA.in' is b2`);
    expect(instructions).toMatchSnapshot();
  });
  it('should reference selector scoped file', () => {
    const { instructions } = compile(`'./AA.in' B is './AA.in'`);
    expect(instructions).toMatchSnapshot();
  });
  it('augment inherited block intention', () => {
    const { instructions } = compile(`'./AA.in' {b2 is 4}`);
    expect(instructions).toMatchSnapshot();
  });
  it('regex augment inherited block intention', () => {
    compile(`'./AA.in' {/b/ is 4}`);
    expect(frame.instructions).toMatchSnapshot();
  });
});

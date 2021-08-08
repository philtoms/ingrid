const bindings = require('../test/bindings');
const identity = require('../utils/identity');
const baseActions = require('./actions');
const rules = require('./rules');
const grammar = require('./grammar');
const peg = require('./peg');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('parser', () => {
  let parse;
  beforeEach(() => {
    frame = { bindings };
    parse = peg()(grammar(rules), baseActions(identity));
  });

  it('selector', () => {
    expect(parse('a')).toMatchSnapshot();
  });
  it('selector aggregation', () => {
    expect(parse('a, b, c')).toMatchSnapshot();
  });
  it('full selector', () => {
    expect(parse('x:a(b)?, c')).toMatchSnapshot();
  });
  it('selector quantifier', () => {
    expect(parse('a*')).toMatchSnapshot();
  });
  it('quantifier', () => {
    expect(parse('A?')).toMatchSnapshot();
  });
  it('limit quantifier', () => {
    expect(parse('A{1}')).toMatchSnapshot();
  });
  it('range quantifier', () => {
    expect(parse('A{0,2}')).toMatchSnapshot();
  });
  it('alias str', () => {
    expect(parse(`'a b':x`)).toMatchSnapshot();
  });
  it('str - escaped', () => {
    expect(parse("'\\'b'")).toMatchSnapshot();
  });
  it('message', () => {
    expect(parse('A(x)')).toMatchSnapshot();
  });
  it('empty message', () => {
    expect(parse('A()')).toMatchSnapshot();
  });
  it('quantified message', () => {
    expect(parse('A(x+)')).toMatchSnapshot();
  });
  it('quantified annon message', () => {
    expect(parse('A(*)')).toMatchSnapshot();
  });
  it('aliased message', () => {
    expect(parse('A(X:1)')).toMatchSnapshot();
  });
  it('aliased annon message', () => {
    expect(parse('A(id:*)')).toMatchSnapshot();
  });
  it('aliased empty message', () => {
    expect(parse('A(id:)')).toMatchSnapshot();
  });
  it('message intention', () => {
    expect(parse('A is postfix(1, 2)')).toMatchSnapshot();
  });
  it('block', () => {
    expect(parse('A {B}')).toMatchSnapshot();
  });
  it('block aggregate', () => {
    expect(parse('A {B} {C}')).toMatchSnapshot();
  });
  it('block aggregate interleaved', () => {
    expect(parse('A {B} is B {C} is C')).toMatchSnapshot();
  });
  it('statement blocks', () => {
    expect(parse('A B {C} D {E}')).toMatchSnapshot();
  });
  it('regex selector', () => {
    expect(parse('/123/')).toMatchSnapshot();
  });
  it('regex selector ref', () => {
    expect(parse('A is /123/')).toMatchSnapshot();
  });
  it('multi-line', () => {
    const nested = `
    A1 is
    A2
`;
    expect(parse(nested)).toMatchSnapshot();
  });
  it('nested', () => {
    const nested = `
      A1 {
        B1 is 123 {
          C1 is D1 {
            D1 is 456
          }
        }
      }
      `;
    expect(parse(nested)).toMatchSnapshot();
  });
});

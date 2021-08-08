const bindings = require('../test/bindings');
const Frame = require('../frame');
const { empty } = require('../utils/symbols');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('parser', () => {
  let parse;
  let frame;
  beforeEach(() => {
    frame = Frame({ bindings });
    parse = (src) => {
      const { selectors, api } = frame.parse(src);
      return { selectors, api };
    };
  });
  describe('statement', () => {
    describe('aggregation', () => {
      it('fold selectors', () => {
        expect(parse('A1 A1').selectors).toMatchSnapshot();
      });
      it('aggregate selectors', () => {
        expect(parse('A1, B1').selectors).toMatchSnapshot();
      });
      it('aggregate message', () => {
        expect(parse('A1(1, 2)')).toMatchSnapshot();
      });
      it('multi-line intentions', () => {
        expect(
          parse(`
            A1 is A2(4)
            {
              A2(value:?) is
                A2(value)
                before value
            }
          `).selectors
        ).toMatchSnapshot();
      });
      it('fold intentions', () => {
        expect(parse('A1 is 1 A1 is 2').selectors).toMatchSnapshot();
      });
      it('fold message selectors', () => {
        expect(parse('A1(x) is x')).toMatchSnapshot();
      });
      it('fold aggregte message selectors', () => {
        expect(parse('A1(x, y) is x')).toMatchSnapshot();
      });
    });
    describe('immediate intentions', () => {
      it('message', () => {
        expect(parse('A1 is A2(2)').selectors).toMatchSnapshot();
      });
      it('aggregate message', () => {
        expect(parse('A1 is A2(1, 2)').selectors).toMatchSnapshot();
      });
      it('nested message', () => {
        expect(parse('A1 is A2(A3(2))').selectors).toMatchSnapshot();
      });
      it('aggregate', () => {
        expect(parse('A1 is 1 A1 is 2').selectors).toMatchSnapshot();
      });
    });
    describe('temporal intentions', () => {
      it('statement no intentions', () => {
        expect(parse('A1 B1 after A1').selectors).toMatchSnapshot();
      });
      it('statement one intention', () => {
        expect(parse('A1 B1 after A1 is 1').selectors).toMatchSnapshot();
      });
      it('statement aggregate intentions', () => {
        expect(parse('A1 B1 after A1 is 1 is 2').selectors).toMatchSnapshot();
      });
      it('statement and temporal', () => {
        expect(
          parse('A1 B1 after A1 is 1 is 2 after A1').selectors
        ).toMatchSnapshot();
      });
      it('statement aggregate and temporal', () => {
        expect(
          parse('A1 B1 after A1 is 1 is 2 after A1 is 3').selectors
        ).toMatchSnapshot();
      });
    });
    describe('message selectors', () => {
      it('selector message', () => {
        expect(parse('A1(1)').api).toMatchSnapshot();
      });
      it('aggregate message selector ', () => {
        expect(parse('A1(1, 2)').api).toMatchSnapshot();
      });
      it('nested message selector', () => {
        expect(parse('A1(A2(A3, A4))').api).toMatchSnapshot();
      });
    });
    describe('quantifier', () => {
      it('quantifier selector', () => {
        expect(parse('A1+').selectors).toMatchSnapshot();
      });
      it('quantifier message selector', () => {
        expect(parse('A1(+)')).toMatchSnapshot();
      });
      it('quantifier selector + quantifier message', () => {
        expect(parse('A1(1?)+')).toMatchSnapshot();
      });
      it('quantifier intention', () => {
        expect(parse('A1 is B1+')).toMatchSnapshot();
      });
      it('quantifier message intention', () => {
        expect(parse('A1 is B1(C1+)').selectors).toMatchSnapshot();
      });
    });
    describe('alias', () => {
      it('selector', () => {
        expect(parse('x:A1').selectors).toMatchSnapshot();
      });
      it('message', () => {
        expect(parse('A1(x:1)')).toMatchSnapshot();
      });
      it('selector + message', () => {
        expect(parse('x:A1(y:1)')).toMatchSnapshot();
      });
    });
    describe('blocks', () => {
      it('selector block', () => {
        expect(parse('A1 {A2}').selectors).toMatchSnapshot();
      });
      it('message block', () => {
        expect(parse('A1 {A2(1)}')).toMatchSnapshot();
      });
    });
    describe('rules', () => {
      it('rule - intent', () => {
        expect(parse("_iseq:`'=='` is intent == 1")).toMatchSnapshot();
      });
      // ignore until context parse
      xit('rule - block', () => {
        frame.bindings.has = jest.fn((_, ...args) => ['{', args]);
        expect(
          parse("has:`'has' statement+` is block A has B C has D")
        ).toMatchSnapshot();
      });
      it('rule - fail', () => {
        expect(parse("_iseq:`'=='` is intent += 1")).toMatchSnapshot();
      });
      it('rule - regexstr', () => {
        expect(parse('_is0:`[0]?`')).toMatchSnapshot();
      });
      it('rule - regex', () => {
        expect(parse("cell:`'X'[0-9]` is token is X1")).toMatchSnapshot();
      });
      it('rule - alias', () => {
        expect(parse('X:`tag` is 1')).toMatchSnapshot();
      });
      it('rule - binding', () => {
        expect(parse('int:`[0-9]+` is token X is 123')).toMatchSnapshot();
      });
      it('rule - construction', () => {
        expect(
          parse(`
            op:\`'+'\`
            predicate:\`tag op tag\` is selector {
              parts(+) is log(parts)
              intention is postfix(parts)
            }
          `)
        ).toMatchSnapshot();
        expect(
          parse(`
            A is 1 + 2
          `)
        ).toMatchSnapshot();
      });
      it('rule - nested rule', () => {
        expect(
          parse("predicate:`tag op tag` is selector {op:`'+'`} A is 1 + 2")
        ).toMatchSnapshot();
      });
      it('rule - in message', () => {
        expect(
          parse(
            "predicate:`tag op tag` is selector { op:`('+' / '-')`} A is A(1 - 2)"
          )
        ).toMatchSnapshot();
      });
      it('rule - recursive', () => {
        // expect(
        parse("predicate:`tag (op predicate)?` is selector {op:`'+'`}");
        // ).toMatchSnapshot();
        expect(parse('A is 1 + 2 + 3')).toMatchSnapshot();
      });
    });
  });

  describe('message handling', () => {
    it('single selector', () => {
      expect(parse('A1(X) { X } B1 is A1(X)')).toMatchSnapshot();
    });
    it('single selector unresolved', () => {
      expect(parse('A1(X) { X } B1 is A1(Y)')).toMatchSnapshot();
    });
  });
});

const Frame = require('../frame');
const { empty } = require('../utils/symbols');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('resolver', () => {
  let frame;
  let resolve;
  beforeEach(() => {
    frame = Frame({});
    resolve = (src) => {
      const { statements } = frame.resolve(src);
      frame.statements.merge();
      return statements;
    };
  });

  describe('scope', () => {
    it('child', () => {
      expect(resolve('A1 {B1} is B1')).toMatchSnapshot();
    });
    it('child.child', () => {
      expect(resolve('A1 {B1 {C1}} is B1.C1')).toMatchSnapshot();
    });
    it('sibling', () => {
      expect(resolve('A1 B1 is A1')).toMatchSnapshot();
      expect(resolve('A2 {B2 C2 is B2}')).toMatchSnapshot();
      expect(resolve('A3 {B3 is C3 C3}')).toMatchSnapshot();
    });
    it('parent', () => {
      expect(resolve('A1 {B1 is A1}')).toMatchSnapshot();
    });
    it('ancestor', () => {
      expect(resolve('A1 {B1 {C1 is A1}}')).toMatchSnapshot();
    });
    it('child > sibling', () => {
      expect(resolve('A1 B1 {A1} is A1')).toMatchSnapshot();
    });
    it('child > parent', () => {
      expect(resolve('A1 {B1 {A1} is A1}')).toMatchSnapshot();
    });
    it('child > ancestor', () => {
      expect(resolve('A1 {B1 {C1 {A1} is A1}}')).toMatchSnapshot();
    });
    it('sibling > parent', () => {
      expect(resolve('A1 {B1 is A1 A1}')).toMatchSnapshot();
    });
    it('sibling > ancestor', () => {
      expect(resolve('A1 {B1 {C1 is A1 A1}}')).toMatchSnapshot();
    });
    it('parent.sibling > child', () => {
      expect(resolve('A1 B1 {C1} is root.C1 C1')).toMatchSnapshot();
      expect(resolve('A2 {B2 {C2} is A2.C2 C2}')).toMatchSnapshot();
      expect(resolve('A3 {B3 {C3} is root.A3.C3 C3}')).toMatchSnapshot();
      expect(resolve('A4 {B4 {C4 {D4} is B4.D4 D4}}')).toMatchSnapshot();
      expect(resolve('A5 {B5 {C5 {D5} is A5.B5.D5 D5}}')).toMatchSnapshot();
    });
    it('ancestor.parent > child', () => {
      expect(resolve('A1 {B1 {A1} is root.A1}')).toMatchSnapshot();
      expect(resolve('A2 {B2 {C2 {B2} is A2.B2}}')).toMatchSnapshot();
    });
    it('ancestor.ancestor > child', () => {
      expect(resolve('A1 {B1 {C1 {A1} is root.A1}}')).toMatchSnapshot();
      expect(resolve('A2 {B2 {C2 {D2 {B2} is A2.B2}}}')).toMatchSnapshot();
    });
    it('ancestor.parent > sibling', () => {
      expect(resolve('A1 {B1 is root.A1 A1}')).toMatchSnapshot();
      expect(resolve('A2 {B2 {C2 is A2.B2 B2}}')).toMatchSnapshot();
    });
    it('ancestor.ancestor > sibling', () => {
      expect(resolve('A1 {B1 {C1 is root.A1 A1}}')).toMatchSnapshot();
      expect(resolve('A2 {B2 {C2 {D2 is A2.B2 B2}}}')).toMatchSnapshot();
    });
    it('child alias', () => {
      expect(resolve('A1 {X:B1} is X')).toMatchSnapshot();
    });
    it('sibling alias', () => {
      expect(resolve('X:A1 B1 is X')).toMatchSnapshot();
      expect(resolve('A2 {Y:B2 C2 is Y}')).toMatchSnapshot();
      expect(resolve('A3 {B3 is Z Z:C3}')).toMatchSnapshot();
    });
    it('parent alias', () => {
      expect(resolve('X:A1 {B1 is X}')).toMatchSnapshot();
    });
    it('ancestor alias', () => {
      expect(resolve('X:A1 {B1 {C1 is X}}')).toMatchSnapshot();
    });
    it(' parent alias > child alias', () => {
      expect(resolve('X:A1 {B1 is X {X:A1}}')).toMatchSnapshot();
    });
    it('child regex', () => {
      expect(resolve('A1 is /B/ {B1 B2}')).toMatchSnapshot();
    });
    it('sibling regex', () => {
      expect(resolve('A1 A2 B1 is /A/')).toMatchSnapshot();
    });
    it('parent regex', () => {
      expect(resolve('A1 {B1 is /A/}')).toMatchSnapshot();
    });
    it('child + sibling + parent regex', () => {
      expect(resolve('A1 {B1 is /A/ {A2} A3}')).toMatchSnapshot();
    });
    it('child only regex', () => {
      expect(resolve('A1 {B1 is /B1.A/ {A2} A3}')).toMatchSnapshot();
    });
    it('sibling only regex', () => {
      expect(resolve('A1 {B1 is /A1.A/ {A2} A3}')).toMatchSnapshot();
    });
  });

  it('should generate frame module entry point', () => {
    const statements = resolve('A1 {B1} C1 /D1/');
    expect(statements).toMatchSnapshot();
    expect(statements.A1.entryPoint).toBe(true);
    expect(statements.C1.entryPoint).toBe(true);
    expect(statements['A1.B1'].entryPoint).not.toBe(true);
  });

  describe('compound selectors', () => {
    it('part intentions', () => {
      expect(resolve('A1 is 1 A1 is 2')).toMatchSnapshot();
    });
    it('message intentions', () => {
      expect(resolve('A1(1) is 1 A1(2) is 2')).toMatchSnapshot();
    });
    it('immediate > temporal', () => {
      expect(resolve('A1 is 1 A1 after 2')).toMatchSnapshot();
    });
    it('temporal > immediate', () => {
      expect(resolve('A1 after 1 A1 is 2')).toMatchSnapshot();
    });
    it('temporal > temporal', () => {
      expect(resolve('A1 after 1 A1 after 2')).toMatchSnapshot();
    });
    it('immediate > temporal > immediate', () => {
      expect(resolve('A1 is 1 A1 after 2 A1 is 3')).toMatchSnapshot();
    });
    it('temporal > immediate > temporal', () => {
      expect(
        resolve('A1 is 1 after 1 A1 is 2 A1 is 3 after 3')
      ).toMatchSnapshot();
    });
  });

  describe('immediate intentions', () => {
    it('sibling', () => {
      expect(resolve('A1 B1 is A1')).toMatchSnapshot();
    });

    it('not self', () => {
      expect(resolve('A1 is A1')).toMatchSnapshot();
    });

    it('child', () => {
      expect(resolve('A1 is A2 {A2}')).toMatchSnapshot();
    });

    it('parent', () => {
      expect(resolve('A1 {A2 is A1}')).toMatchSnapshot();
    });

    it('sibling selector', () => {
      expect(resolve('A1 B1 C1 is A1, B1')).toMatchSnapshot();
    });

    it('block through sibling selector', () => {
      expect(resolve('A1 {A2} B1 is A1, A2')).toMatchSnapshot();
    });

    it('no block through child intention', () => {
      expect(resolve('A1 {A2} B1 {B2 is A2}').A2.type).toBe('unresolved');
    });

    it('block through parent intention', () => {
      expect(resolve('A1 {A2} B1 is A1 {B2 is A2}')).toMatchSnapshot();
    });

    it('no implicit intentional block', () => {
      expect(resolve('A1 {A2} B1 is A1 {A2}')).toMatchSnapshot();
    });

    it('deep nested intentional block', () => {
      expect(resolve('A1 {A2} B1 is A1 {B2 {B3 is A2}}')).toMatchSnapshot();
    });
    it('should not resolve nested selector block', () => {
      expect(
        resolve('A1 {A2 {A3}} B1 is A1 {B2 {B3 is A3}}')
      ).toMatchSnapshot();
    });
    it('should resolve nested selector block via one dot rule', () => {
      expect(
        resolve('A1 {A2 {A3}} B1 is A1 {B2 {B3 is A1.A2.A3}}')
      ).toMatchSnapshot();
    });
  });

  describe('alias', () => {
    it('aliased message selector', () => {
      expect(resolve('A1(x:) is x')).toMatchSnapshot();
    });
    it('aliased quantified message selector', () => {
      expect(resolve('A1(x:?) is x')).toMatchSnapshot();
    });
    it('aliased annon message selector', () => {
      expect(resolve('A1(x:.) is x')).toMatchSnapshot();
    });
    it('aliased anon message as temporal', () => {
      expect(resolve('A1(x:.) after x')).toMatchSnapshot();
    });
    it('aliased selector as intention', () => {
      expect(resolve('X:A1 B1 is X')).toMatchSnapshot();
    });

    it('aliased parent as intention', () => {
      expect(resolve('X:A1 {B1 is X}')).toMatchSnapshot();
    });

    it('aliased selector as intention', () => {
      expect(resolve('A1 B1 is X:A1, X')).toMatchSnapshot();
    });

    it('selector as aliased message', () => {
      expect(resolve('A1() {A2(x:)} B1 is A1(A2:X) {X}')).toMatchSnapshot();
    });

    it('aliased message to message arg', () => {
      expect(resolve('A1(A2, A3) B1 is A1(A2:X, A3:X) {X}')).toMatchSnapshot();
    });

    // TODO: consider block message scope
    it('should extend alias across block message scope', () => {
      expect(
        resolve('A1 {A2, A3} B1 is A1(A2:X, A3:A2) {X}')
      ).toMatchSnapshot();
    });
  });

  describe('temporal', () => {
    it('intentions after statement', () => {
      expect(resolve('A1 B1 after A1 is 1 is 2')).toMatchSnapshot();
    });

    it('intention after statement ahead of temporal', () => {
      expect(resolve('A1 B1 after A1 is A1 after A1 is A1')).toMatchSnapshot();
    });

    it('intention after intention', () => {
      expect(resolve('A1 B1 is A1 after A1')).toMatchSnapshot();
    });

    it('block after intention', () => {
      expect(resolve('A1 {A2} after A1')).toMatchSnapshot();
    });
    it('cyclic', () => {
      expect(resolve('A1 is B1 after B1 B1 is A1 after A1')).toMatchSnapshot();
    });

    it('intention + secondary intention after message', () => {
      expect(resolve('A1 B1 is A1 is A1 after A1')).toMatchSnapshot();
    });

    it('should select aggregate intentions', () => {
      // TODO flatten duplicate calls
      expect(resolve('A1 B1 is A1 after A1 after A1')).toMatchSnapshot();
    });

    it('should select aggregate intention selecteds', () => {
      // TODO flatten duplicate calls
      expect(resolve('A1 B1 is A1 after A1,A1')).toMatchSnapshot();
    });

    it('should select before intentions', () => {
      expect(resolve('A1 B1 after A1')).toMatchSnapshot();
    });
  });

  describe('messages', () => {
    it('child message', () => {
      expect(resolve('A1(A2) B1 is A1(A2) {A2}')).toMatchSnapshot();
    });

    it('empty message selector', () => {
      expect(resolve('A1() B1 is A1()')).toMatchSnapshot();
    });

    it('missing quantifier message selector hint', () => {
      expect(resolve('A1() B1 is A1(B1)')).toMatchSnapshot();
    });

    it('mismatched message selector', () => {
      expect(resolve('A1(B3) B1 is A1(B2) {B2}')).toMatchSnapshot();
    });
    it('message holder (unresolved message)', () => {
      expect(resolve('A1(A2) B1 is A1(A2)')).toMatchSnapshot();
    });

    it('aggregate message holder', () => {
      expect(resolve('A1(A2, A3) B1 is A1(A2, A3) {A2 A3}')).toMatchSnapshot();
    });
    it('nested value message', () => {
      expect(resolve('A1(B1) B1(B1) is A1(B1(B1))')).toMatchSnapshot();
    });
  });
  describe('quantifiers', () => {
    it('empty message to optional message selector', () => {
      expect(resolve('A1(?) B1 is A1()')).toMatchSnapshot();
    });
    it('empty message to + message selector', () => {
      expect(resolve('A1(+) B1 is A1()')).toMatchSnapshot();
    });
  });
  describe('block messages', () => {
    it('block message holder', () => {
      expect(resolve('A1 {A2} B1 is A1(A2) {A2}')).toMatchSnapshot();
    });
    it('temporal block message holder', () => {
      expect(resolve('A1 {A2()} B1 is A1, A2()')).toMatchSnapshot();
    });
    it('not duplicate block', () => {
      expect(resolve('A1 {A2} {A2}')).toMatchSnapshot();
    });
    it('aggregate block message holders', () => {
      expect(resolve('A1 {A2, A3} B1 is A1(A2, A3)')).toMatchSnapshot();
    });
  });

  describe('temporal messages', () => {
    it('statement after message', () => {
      expect(resolve('A1() B1 after A1')).toMatchSnapshot();
    });
    it('intention after message', () => {
      expect(resolve('A1() B1 C1 is B1 after A1')).toMatchSnapshot();
    });

    it('sibling message after message', () => {
      expect(resolve('A1(B1) B1 C1 after A1(B1)')).toMatchSnapshot();
    });

    it('child message after message', () => {
      expect(resolve('A1(B1) C1 after A1(B1) {B1}')).toMatchSnapshot();
    });

    it('intention after empty message', () => {
      expect(resolve('A1() B1 is A1 after A1()')).toMatchSnapshot();
    });

    it('after aggregate message', () => {
      expect(resolve('A1(B1,B2) C1 after A1(B1, B2)')).toMatchSnapshot();
    });

    it('secondary after message', () => {
      expect(
        resolve('A1(B1) B1 C1 after A1(B1) after A1(B1)')
      ).toMatchSnapshot();
    });

    it('intention + secondary after message', () => {
      expect(
        resolve('A1 B1(A1) C1 is A1 is A1 after B1(A1)')
      ).toMatchSnapshot();
    });
  });

  describe('regex selectors', () => {
    it('as selector', () => {
      expect(resolve('/A/ is 123 A1')).toMatchSnapshot();
    });
    it('as block selector', () => {
      expect(resolve('/B/ is 123 A1 {B}')).toMatchSnapshot();
    });
    it('as sibling selector', () => {
      expect(resolve('A {/B/ is 123 A1 {B}}')).toMatchSnapshot();
    });
    it('as aggregate selector', () => {
      expect(resolve('/A/ is 123 A1 is 456')).toMatchSnapshot();
    });
    it('as reference', () => {
      expect(resolve('A1 is 123 B is /A/')).toMatchSnapshot();
    });
    it('as message reference', () => {
      expect(resolve('A1 is 123 B is A1(/A/)')).toMatchSnapshot();
    });
    it('as aggregate reference', () => {
      expect(resolve('A1 is 123 A2 is 456 B is /A/')).toMatchSnapshot();
    });
    it('as temporal reference', () => {
      expect(resolve('A1 B after /A/')).toMatchSnapshot();
    });
    it('as aggregated temporal reference', () => {
      expect(resolve('A1 A2 B after /A/')).toMatchSnapshot();
    });
    it('as aggregate temporal reference', () => {
      expect(resolve('A1 B after /A/, /A/')).toMatchSnapshot();
    });
    it('as temporal message reference', () => {
      expect(resolve('A1 B after A1(/A/)')).toMatchSnapshot();
    });
    it('as temporal reference with message', () => {
      expect(resolve('A1 B after /A/(A1)')).toMatchSnapshot();
    });
    it('as aggregate temporal reference with message', () => {
      expect(resolve('A1 A2 B after /A/(A1, A2)')).toMatchSnapshot();
    });
    it('should be discoverable in child-sibling-parent order', () => {
      expect(resolve('A /A/ B /B/ { B1 /B1/ B2 /B2/}')).toMatchSnapshot();
    });
    it('should accumalate selectors', () => {
      expect(resolve('/A/ is 1 /B/ is 2 AB')).toMatchSnapshot();
    });

    it('should accumalate intentions', () => {
      expect(resolve('/A/ /B/ C is A1 is A2 is B1 is B2')).toMatchSnapshot();
    });
  });

  describe('custom selectors', () => {
    it('should resolve dsl', () => {
      expect(resolve("cell:`'X'[\\\\d]` is selector X1")).toMatchSnapshot();
    });
  });

  describe('aggregation', () => {
    it('should maintain aggregated selector map', () => {
      resolve('A1 is 1');
      expect(frame.statements.all()).toMatchSnapshot();
      resolve('A1 is 2');
      expect(frame.statements.all()).toMatchSnapshot();
      resolve('A1 {x y}');
      expect(frame.statements.all()).toMatchSnapshot();
      resolve('A1 is 3 after x before y');
      expect(frame.statements.all()).toMatchSnapshot();
    });

    it('should aggregate selector map', () => {
      resolve('A1 is 1 A1 is 2 A1 {a b} A1 is 3 after a before b');
      expect(frame.statements.all()).toMatchSnapshot();
    });
    it('should flat map (route) nested selectors', () => {
      expect(resolve('A1 {A1}')).toMatchSnapshot();
    });
  });
  it('should flatten message selectors', () => {
    expect(resolve('A1(?) B1 C1 is A1(B1, A1(B1))')).toMatchSnapshot();
  });
  describe('bindings', () => {
    beforeEach(() => {
      resolve = Frame({
        bindings: {
          boundFn: jest.fn(),
        },
      }).resolve;
    });

    it('should select bound selector', () => {
      expect(resolve('A1 is boundFn()').statements).toMatchSnapshot();
    });
  });

  describe('message handling', () => {
    it('single selector', () => {
      expect(resolve('A1(X) { X } B1 is A1(X)')).toMatchSnapshot();
    });
    it('single selector unresolved', () => {
      expect(resolve('A1(X) { X } B1 is A1(Y)')).toMatchSnapshot();
    });
  });
});

describe('fibonacci', () => {
  let resolve;
  const options = {
    level1: true,
    detail: 'debug',
  };
  beforeEach(() => {
    resolve = (src) => Frame(options).resolve(src);
  });
  it('resolves', () => {
    expect(
      resolve(`main
    is fibonacci(10)
    {
      fibonacci(value:) is value
      is fibonacci(value - 2) + fibonacci(value - 1)
        after value > 1
    }
  `).selectors
    ).toMatchSnapshot();
  });
});

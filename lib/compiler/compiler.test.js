const Frame = require('../frame');
const bindings = require('../test/bindings');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('compiler', () => {
  let frame;
  let compile;
  beforeEach(() => {
    frame = Frame({
      bindings,
    });
    compile = (src) => frame.compile(src).instructions;
  });

  it('reference', () => {
    compile('A1 B1(B2) C1 is A1, B1(B2:C2) after B1(B2:C2) {C2 is A1}');
    // log(frame);
  });
  it('should output entry points as exports', () => {
    compile('A1 B1 is A1 {B2} /C1/');
    expect(frame.exports).toEqual(['A1', 'B1']);
  });

  describe('compound selectors', () => {
    it('part intentions', () => {
      expect(compile('A1 is 1 A1 is 2')).toMatchSnapshot();
    });
    it('immediate > temporal', () => {
      expect(compile('A1 is 1 A1 after 2')).toMatchSnapshot();
    });
    it('temporal > immediate', () => {
      expect(compile('A1 after 1 A1 is 2')).toMatchSnapshot();
    });
    it('temporal > temporal', () => {
      expect(compile('A1 after 1 A1 after 2')).toMatchSnapshot();
    });
    it('immediate > temporal > immediate', () => {
      expect(compile('A1 is 1 A1 after 2 A1 is 3')).toMatchSnapshot();
    });
    it('temporal > immediate > temporal', () => {
      expect(
        compile('A1 is 1 after 1 A1 is 2 A1 is 3 after 3')
      ).toMatchSnapshot();
    });
  });

  describe('intentions', () => {
    it('simple intention', () => {
      compile('A1 B1 is A1');
      expect(frame.instructions.B1.immediate).toMatchSnapshot();
    });

    it('aggregate intention', () => {
      compile('A1 B1 is A1, A1');
      expect(frame.instructions.B1.immediate).toMatchSnapshot();
    });

    it('aggregate selector intentions', () => {
      compile('A1 B1 is A1, B1 is A1');
      expect(frame.instructions.B1.immediate).toMatchSnapshot();
    });

    it('nested intention', () => {
      compile('A1 {A2} B1 is A1 {B2 is A2}');

      expect(frame.instructions['B1'].immediate).toMatchSnapshot();
      expect(frame.instructions['B1.B2'].immediate).toMatchSnapshot();
    });

    it('self intention', () => {
      expect(compile('A1 {A2 is A1}')['A1.A2'].immediate).toMatchSnapshot();
    });
  });

  describe('unresolved', () => {
    it('unresolved id', () => {
      expect(compile(`A1 is abc`).A1.immediate).toMatchSnapshot();
    });
    it('string id', () => {
      expect(compile(`A1 is 'a b c'`).A1.immediate).toMatchSnapshot();
    });
    it('string message', () => {
      expect(compile(`A1 is A1('abc')`).A1.immediate).toMatchSnapshot();
    });
  });
  describe('messages', () => {
    it('empty message', () => {
      expect(compile('A1() B1 is A1()').B1.immediate).toMatchSnapshot();
    });
    it('value message', () => {
      expect(compile('A1(B1) B1 is A1(B1)').B1.immediate).toMatchSnapshot();
    });
    it('aggregate selector messages', () => {
      compile('A1(B1) is B1 A1(B2) is B2');
      expect(frame.instructions.A1).toMatchSnapshot();
    });
    it('multiple message', () => {
      expect(
        compile('A1(B1, B1) B1 is A1(B1, B1)').B1.immediate
      ).toMatchSnapshot();
    });
    it('nested value message', () => {
      expect(
        compile('A1(B1) B1(B1) is A1(B1(B1(B1)))').B1.temporal[0]
      ).toMatchSnapshot();
    });
    it('aggregated nested value message', () => {
      expect(
        compile('A1(B1, B1) B1(B1) is A1(B1, B1(B1))').B1.temporal[0]
      ).toMatchSnapshot();
    });
  });

  describe('temporal', () => {
    it('statement after intention', () => {
      compile('A1 B1 is A1 after A1 is A1');
      expect(frame.instructions.B1).toMatchSnapshot();
    });
    it('statements after intention', () => {
      expect(
        compile('A1 B1 after A1 is A1 C1 after A1 is A1')
      ).toMatchSnapshot();
    });
    it('empty statements after intention', () => {
      const output = compile('A1 B1 after A1 C1 after A1');
      expect(output).toMatchSnapshot();
    });
    it('intention after intention', () => {
      compile('A1 B1 is A1 after A1');
      expect(frame.instructions.B1.temporal).toMatchSnapshot();
    });
    it('cyclic', () => {
      compile('A1 is B1 after B1 B1 is A1 after A1');
      expect(frame.instructions).toMatchSnapshot();
    });

    it('indexed intention after intention', () => {
      expect(compile('A1 B1 is A1 is A1 after A1')).toMatchSnapshot();
    });
  });

  describe('temporal messages', () => {
    it('statement after message', () => {
      expect(compile('A1(B1) B1 C1 after A1(B1)')).toMatchSnapshot();
    });
    it('intention + indexed intention after message', () => {
      expect(
        compile('A1 B1(A1) C1 is A1 is A1 after B1(A1)')
      ).toMatchSnapshot();
    });
  });

  describe('custom rules', () => {
    it('should output custom intention instructions', () => {
      expect(
        compile('int:`[0-9]+` is token A1 is 123').A1.immediate[0]
      ).toMatchSnapshot();
    });
  });

  describe('quantifier', () => {
    it('slotted intentional values', () => {
      expect(compile('A1{0,3} is 1,2,3')).toMatchSnapshot();
    });
    it('slotted intentional values overspill', () => {
      expect(compile('A1{1,2} is 1,2,3')).toMatchSnapshot();
    });
    it('one or more selector values', () => {
      expect(compile('A1+ is 1,2,3')).toMatchSnapshot();
    });
  });

  describe('regex selectors', () => {
    it('as selector', () => {
      expect(compile('/A/ is 123 A1')).toMatchSnapshot();
    });
    it('as block selector', () => {
      expect(compile('/B/ is 123 A1 {B}')).toMatchSnapshot();
    });
    it('as sibling selector', () => {
      expect(compile('A {/B/ is 123 A1 {B}}')).toMatchSnapshot();
    });
    it('as aggregate selector', () => {
      expect(compile('/A/ is 123 A1 is 456')).toMatchSnapshot();
    });
    it('as reference', () => {
      expect(compile('A1 is 123 B is /A/')).toMatchSnapshot();
    });
    it('as message reference', () => {
      expect(compile('A1 is 123 B is A1(/A/)')).toMatchSnapshot();
    });
    it('as aggregate reference', () => {
      expect(compile('A1 is 123 A2 is 456 B is /A/')).toMatchSnapshot();
    });
    it('as temporal reference', () => {
      expect(compile('A1 B after /A/ is A1')).toMatchSnapshot();
    });
    it('as aggregate temporal reference', () => {
      expect(compile('A1 B after /A/, /A/ is A1')).toMatchSnapshot();
    });
    it('as temporal message reference', () => {
      expect(compile('A1 B after A1(/A/)')).toMatchSnapshot();
    });
    it('as temporal reference with message', () => {
      const output = compile('A1 B after /A/(A1) is A1');
      expect(output).toMatchSnapshot();
    });
    it('as aggregate temporal reference with message', () => {
      expect(compile('A1 A2 B after /A/(A1, A2)')).toMatchSnapshot();
    });
    it('should be discoverable in child-sibling-parent order', () => {
      expect(compile('A /A/ B /B/ { B1 /B1/ B2 /B2/}')).toMatchSnapshot();
    });
    it('should accumalate selectors', () => {
      expect(compile('/A/ is 1 /B/ is 2 AB')).toMatchSnapshot();
    });

    it('should accumalate intentions', () => {
      expect(compile('/A/ /B/ C is A1 is A2 is B1 is B2')).toMatchSnapshot();
    });
  });

  describe('message handling', () => {
    it('single selector', () => {
      expect(compile('A1(X) { X } B1 is A1(X)')).toMatchSnapshot();
    });
    it('single selector unresolved', () => {
      expect(compile('A1(X) { X } B1 is A1(Y)')).toMatchSnapshot();
    });
  });
});

describe('fibonacci', () => {
  let compile;
  const options = {
    level1: true,
    detail: 'debug',
  };
  beforeEach(() => {
    compile = (src) => Frame(options).compile(src);
  });
  it('compiles', () => {
    expect(
      compile(`main
    is fibonacci(10)
    {
      fibonacci(value:) is value
      is fibonacci(value - 2) + fibonacci(value - 1)
        after value > 1
    }
  `).statements
    ).toMatchSnapshot();
  });
});

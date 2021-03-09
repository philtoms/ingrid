const Frame = require('../frame');
const interpreter = require('.');
const bindings = require('../test/bindings');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

describe('interpreter', () => {
  let interpret;
  let compile;
  let frame;

  beforeEach(() => {
    frame = Frame({
      bindings: {
        ...bindings,
      },
    });
    compile = frame.compile;
    interpret = interpreter(frame);
    compile(`
      op:\`('+' / '<')\` is token
      int:\`[0-9]+\` is token
    `);
  });

  describe('quantifier', () => {
    it('slotted intentional values', () => {
      compile('A1 is B1(), B1() B1() is 1,2,3');
      interpret();
      expect(frame.heap[frame.heap.B1]).toStrictEqual({ value: 3 });
    });
    it('unslotted intentional values', () => {
      compile('A1 is B1(1), B1(2) B1(v:) is v');
      interpret();
      expect(frame.heap['B1.0']).toStrictEqual({ value: 2 });
    });
    it('one or more tag values', () => {
      compile('A1 is B1(), B1() B1()+ is 1,2,3');
      interpret();
      expect(frame.heap['B1.0']).toStrictEqual({ value: [1, 2, 3, 1, 2, 3] });
    });
  });
  describe('temporal logic', () => {
    it('after', () => {
      compile(`
        A1 is 1
        B1 after A1 is 2
      `);
      interpret();
      expect(frame.heap[frame.heap.B1]).toStrictEqual({ value: 2 });
    });
    it('A1 is 1 < 2', () => {
      // frame.bindings.postfix = jest.fn();
      compile(`A1 is postfix(1, 2, <)`);
      interpret();
      expect(frame.heap['A1.0']).toStrictEqual({ value: true });
    });
    it('A1 is 123 after A1 < 3', () => {
      compile(`A1 is 1 is 2 after postfix(A1, 3, <)`);
      interpret();
      expect(frame.heap[frame.heap.A1]).toStrictEqual({ value: 2 });
    });
    it('temporal cascade', () => {
      compile(`
        A1 is 1 is 2 after postfix(B1, 3, <)
        B1 is 4 is 2 after A1
      `);
      interpret();
      expect(frame.heap[frame.heap.A1]).toStrictEqual({ value: 2 });
    });
    it('A1 is 123 before A1 < 3', () => {
      compile(`A1 is 4 is 2 before postfix(A1, 3, <)`);
      interpret();
      expect(frame.heap[frame.heap.A1]).toStrictEqual({ value: 4 });
    });
  });
  describe('heap management', () => {
    it('should apply tag value', () => {
      compile('A1 is 123');
      interpret();
      expect(frame.heap[frame.heap.A1]).toStrictEqual({
        value: 123,
      });
    });

    it('should apply block tag value', () => {
      compile('A1 {A2 is 456}');
      interpret();
      expect(frame.heap[frame.heap['A1.A2']]).toStrictEqual({
        value: 456,
      });
    });

    it('should reference immediate intention value', () => {
      compile(`
        A1 is 123
        B1 is A1
      `);
      interpret();
      expect(frame.heap[frame.heap.B1]).toEqual({ value: 123 });
    });

    it('should add reference immediate intention value', () => {
      compile(`
        A1 is 123
        B1 is A1
        C1 is A1
      `);
      interpret();
      expect(frame.heap[frame.heap.C1]).toEqual({ value: 123 });
    });

    it('should dereference immediate intention value', () => {
      compile(`
        A1 is 123
        B1 is A1, 456
      `);
      interpret();
      expect(frame.heap[frame.heap.B1]).toEqual({ value: 456 });
    });

    it('should reference implicit block intention value', () => {
      compile(`
        A1 is 123 {
          A2 is 456
        }
        B1 is A1 {A2}
      `);
      interpret();
      expect(frame.heap[frame.heap['B1']]).toEqual({ value: 123 });
      // to decide: support implicit blocks?
      // expect(frame.heap[frame.heap['B1.A2']]).toBe(456);
    });

    it('should override implicit block intention value', () => {
      compile(`
        A1 is 123 {
          A2 is 456
        }
        B1 is A1 {A2 is 789}
      `);
      interpret();
      expect(frame.heap[frame.heap['B1.A2']]).toEqual({ value: 789 });
    });

    it('should copy on reference immediate intention value', () => {
      compile(`
        A1 is 123
        B1 is A1
        A1 is 456 after B1
      `);
      interpret();
      expect(frame.heap[frame.heap['A1']].value).toBe(456);
    });
  });
});

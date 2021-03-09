const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

module.exports = (frame) => {
  const callIfTrue = (acc) => {
    acc.push({ op: 'skip-if-false' });
    return 'call';
  };

  const callIfFalse = (acc) => {
    acc.push({ op: 'skip-if-true' });
    return 'call';
  };

  const callTemporal = (temporalIdx) => {
    return temporalIdx >= 0
      ? { op: 'call-temporal', temporalIdx }
      : { op: 'call' };
  };

  const applyValue = (acc, temporalIdx, selector, argCount) => {
    const op = callValue(selector, temporalIdx, argCount);
    acc.push({ selector, temporalIdx, ...op });
    return { op: 'pop-value' };
  };

  const callValue = (selector, temporalIdx = 0, argCount = 0) => {
    return {
      temporalIdx,
      op:
        frame.statements.get(selector) || frame.instructions[selector]
          ? 'call'
          : 'call-bind',
      argCount,
    };
  };

  const applyBlock = (id, selector) => {
    // scope rules: apply earliest block scope only
    if (
      !frame.instructions[id] ||
      !frame.instructions[id].immediate.find(
        (inst) => inst.id === id && inst.selector === selector
      )
    )
      return { op: 'apply-block' };
  };
  const compileIntention = ({ slot, quantifier }) => (acc, intention) => {
    if (intention.parts) {
      return intention.parts.reduce(compileIntention({ slot }));
    }
    const { id, selector = id, arg, argCount, type, temporalIdx } = intention;

    const nextOp = () => {
      switch (type) {
        case 'temporal-after':
          callIfTrue(acc);
          return callTemporal(temporalIdx);
        case 'temporal-before':
          callIfFalse(acc);
          return callTemporal(temporalIdx);
        case 'temporal':
          return callTemporal(temporalIdx);
        case 'block':
          return applyBlock(id, selector);
        case 'literal':
        case 'unresolved':
          return { op: arg ? 'push-literal' : 'apply-literal' };
        case 'apply-arg':
        case 'push-arg':
          return {
            op: type,
            arg: arg - 1,
          };
        case 'tag':
        case 'inst':
          return { op: arg ? 'push-value' : 'apply-value' };
        case 'call-message':
          return callValue(selector, temporalIdx, argCount);
        case 'apply-message':
          return applyValue(acc, temporalIdx, selector, argCount);
      }
    };

    const opArg = nextOp();
    if (opArg) {
      const withArg = opArg.op.startsWith('pop') || opArg.op.endsWith('arg');
      const applyOp = opArg.op.startsWith('apply') || withArg;
      // if (
      //   applyOp &&
      //   !frame.instructions[selector] &&
      //   frame.statements.get(selector)
      // ) {
      //   frame.instructions = {
      //     ...frame.instructions,
      //     ...[[selector, frame.statements.get(selector)]]
      //       .map(compileInstructions)
      //       .reduce(refineInstructions, {})
      //   };
      // }

      acc.push({
        ...(withArg ? {} : { selector }),
        ...(slot >= 0 && applyOp ? { slot } : {}),
        ...(typeof quantifier === 'string' ? { quantifier } : {}),
        ...opArg,
      });
    }
    return acc;
  };

  const compileImmediate = (ctx, intentions, quantifier = {}) => {
    const slots = quantifier.min >= 0;
    const immediates = intentions.filter(({ temporal }) => !temporal);
    return immediates.reduce((acc, intention, idx) => {
      const parts = intention.parts || [intention];
      return parts.reduce((acc, part) => {
        if (!slots || ctx.nextSlot < quantifier.max) {
          const slot =
            slots && intention.type !== 'block' ? ctx.nextSlot++ : undefined;
          compileIntention({ slot, quantifier })(acc, part);
        }
        return acc;
      }, acc);
    }, []);
  };

  const compileBefore = (ctx, intentions) =>
    intentions.reduce(compileIntention({}), []);

  const compileAfter = (ctx, intentions) =>
    intentions.reduce(compileIntention({}), []);

  const compileTemporal = (ctx, intentions, quantifier = {}) => {
    const slots = quantifier.min >= 0;
    return intentions
      .map((entry, idx) => [idx, entry])
      .filter(([idx, { temporal }]) => temporal)
      .reduce((acc, [idx, intention]) => {
        return {
          ...acc,
          [idx]: (intention.parts || [intention]).reduce((acc, part) => {
            const slot =
              slots && intention.type !== 'block' ? ctx.nextSlot++ : undefined;
            compileIntention({ slot, quantifier })(acc, part);
            return acc;
          }, []),
        };
      }, {});
  };
  const compileMessage = (ctx, intentions) =>
    Object.entries(intentions).reduce(
      (acc, [idx, intentions]) => ({
        ...acc,
        [idx]: intentions.reduce(compileIntention({}), []),
      }),
      {}
    );

  const compileInstructions = ([id, statement]) => {
    const ctx = { nextSlot: 0 };
    return [
      id,
      {
        is: compileImmediate(ctx, statement.is, statement.quantifier),
        before: compileBefore(ctx, statement.before),
        after: compileAfter(ctx, statement.after),
        temporal: {
          ...compileTemporal(ctx, statement.is, statement.quantifier),
          ...compileMessage(ctx, statement.message),
        },
      },
    ];
  };

  const compileExports = (acc, [id, statement]) => {
    if (
      statement.entryPoint &&
      !frame.exports.includes(id) &&
      !acc.includes(id)
    ) {
      return [...acc, id];
    }
    return acc;
  };

  const concatInstructions = (id, type, instructions) => {
    if (frame.instructions[id] && frame.instructions[id][type].length) {
      const ft = frame.instructions[id][type];
      const fta = ft[ft.length - 1].temporalIdx === 'after' ? [ft.pop()] : [];
      return [...ft, ...instructions, ...fta];
    }
    return instructions;
  };

  const wrapTemporals = (id, before, after) => (instructions) => [
    ...(before
      ? [{ op: 'call-temporal', temporalIdx: 'before', selector: id }]
      : []),
    ...instructions,
    ...(after
      ? [{ op: 'call-temporal', temporalIdx: 'after', selector: id }]
      : []),
  ];

  const refineInstructions = (acc, [id, { before, is, after, temporal }]) => {
    const wrap = wrapTemporals(id, before.length, after.length);
    return {
      ...acc,
      [id]: {
        immediate: wrap(concatInstructions(id, 'immediate', is)), // needs to work at statement.temporal level
        temporal: {
          ...(before.length && { before }),
          ...(after.length && { after }),
          ...Object.entries(temporal).reduce(
            (acc, [idx, entry]) => ({
              ...acc,
              // temporal intentions are not wrapped??
              // [idx]: temporal ? entry : wrap(entry)
              [idx]: wrap(entry),
            }),
            {}
          ),
        },
      },
    };
  };

  return (input) => {
    const statements = input.statements || input;
    const output = {
      ...(input.statements ? input : {}),
      exports: Object.entries(statements).reduce(compileExports, []),
      instructions: Object.entries(statements)
        .map(compileInstructions)
        .reduce(refineInstructions, {}),
    };

    return output;
  };
};

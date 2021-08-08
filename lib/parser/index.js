const dsl = require('./dsl');
const peg = require('./peg');
const { empty } = require('../utils/symbols');

// The parser is responsible for aggregating tagged selectors and
// organizing statement blocks under tagged selector entry points

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

module.exports = (frame) => {
  // capture frame level parse specs but don't let it leak out
  const bindings = frame.bindings;
  const grammars = {};
  const toIdPath = (...parts) => parts.filter(Boolean).join('.');

  const fromMessageAlias = (selector, message) => {
    if (!message || !message.selector.length) return {};
    return {
      ...(message.selector || []).reduce(
        (acc, { token: { alias }, message }) => ({
          ...acc,
          ...(alias ? { [alias]: selector } : {}),
          ...fromMessageAlias(selector, message),
        }),
        {}
      ),
    };
  };

  const fromMessageArgs = (parentId, aliasMap, quantifierMap, tidx) => (
    acc,
    { token, message },
    idx
  ) => {
    const { ident, alias, quantifier, type } = token;
    const id = toIdPath(parentId, ident);

    if (alias) {
      aliasMap[alias] = id;
      aliasMap[id] = alias;
    }

    if (quantifier) {
      quantifierMap[id] = quantifier;
    }

    const messages = message
      ? message.selector.reduce(
          fromMessageArgs(id, aliasMap, quantifierMap, tidx),
          {}
        )
      : {};

    // don't accept message arguments for empty selectors without an alias
    return type !== empty || alias || quantifier
      ? {
          ...acc,
          ...messages,
          [id]: {
            type,
            tidx,
            arg: idx + 1,
            ...(alias && type === empty ? { alias: true } : {}),
            ...(quantifier ? { quantifier } : {}),
          },
        }
      : empty;
  };

  const fromMessages = (message) => {
    return message
      ? message.selector
          .filter(Boolean)
          .filter(({ token: { type } }) => type !== empty)
          .map(({ token: { rule, quantifier, ...rest }, message }) => ({
            ...rest,
            ...(quantifier ? { quantifier } : {}),
            message: fromMessages(message),
          }))
      : null;
  };

  const fromTemporals = (parentId, temporalSlot, intentions) => (
    { intent, selector },
    idx
  ) => {
    if (intent === 'is' && temporalSlot) {
      const nextIntent =
        idx < intentions.length - 1 && intentions[idx + 1].intent;
      if (
        !nextIntent ||
        (nextIntent !== 'if' &&
          nextIntent !== 'else' &&
          nextIntent !== 'after' &&
          nextIntent !== 'before')
      ) {
        fromIntentions(parentId)({
          intent,
          selector,
        }).selector.forEach((selector) => temporalSlot.push(selector));
        return false;
      }
    }
    return true;
  };

  const fromIntentions = (parentId) => ({ intent, selector }) => ({
    intent,
    selector:
      intent === 'block'
        ? selector.reduce(
            (acc, { selectors }) => [
              ...acc,
              ...selectors.map(({ token: { ident } }) =>
                toIdPath(parentId, ident)
              ),
            ],
            []
          )
        : selector.map(({ token: { rule, quantifier, ...rest }, message }) => ({
            ...rest,
            ...(quantifier ? { quantifier } : {}),
            message: fromMessages(message),
          })),
  });

  const fromStatement = (parentId) => (acc, { selectors, intentions }) => {
    // maps are scoped to statement
    const aliasMap = {};
    const quantifierMap = {};
    return selectors.reduce((acc, { token, message }) => {
      const { alias, quantifier, type, rule, ident, ...rest } = token;
      const id = toIdPath(parentId, ident);
      if (alias) {
        aliasMap[alias] = id;
      }
      if (quantifier) {
        quantifierMap[id] = quantifier;
      }
      const statement = acc.selectors[id] || { selected: [] };
      const tidx = statement.selected.length;
      const messageArgs = message
        ? message.selector.reduce(
            fromMessageArgs(id, aliasMap, quantifierMap, tidx),
            {}
          )
        : null;

      // collate all immidiates into a temporal slot when
      // first intention is not immediate
      const temporalSlot =
        intentions.length &&
        intentions[0].intent !== 'is' &&
        intentions[0].intent !== 'block'
          ? [{ ident: id }]
          : null;

      const blocks = intentions
        .filter(({ intent }) => intent === 'block')
        .reduce((acc, { selector }) => [...acc, ...selector], [])
        .reduce(fromStatement(id), { selectors: {}, api: {} });

      return {
        api: {
          ...acc.api,
          ...blocks.api,
          ...(messageArgs || acc.api[id]
            ? {
                [id]: {
                  ...acc.api[id],
                  ...messageArgs,
                },
              }
            : {}),
        },
        selectors: {
          ...acc.selectors,
          [id]: {
            ...statement,
            id,
            parentId,
            ident,
            type,
            aliasMap,
            quantifierMap,
            ...(quantifier ? { quantifier } : {}),
            selected: [
              ...statement.selected,
              {
                intentions: [
                  ...(temporalSlot
                    ? [{ intent: 'is', selector: temporalSlot }]
                    : []),
                  ...intentions
                    .filter(fromTemporals(id, temporalSlot, intentions))
                    .map(fromIntentions(id)),
                ],
                ...(message ? { temporal: true } : {}),
                ...rest,
              },
            ],
          },
          ...blocks.selectors,
        },
      };
    }, acc);
  };

  const parseAst = (ast = []) => {
    const parsed = ast.reduce(fromStatement(''), { selectors: {}, api: {} });
    return parsed;
  };

  const generate = peg(frame);

  // regenerate a new peg parser before aborting the current pass.
  // The abort will be caught by the peg wrapper and  reparsed with
  // the latest parser.
  const regenerate = (grammars) => {
    frame.parseSrc = generate(...withDSL(grammars));
    throw new Error('new-rule');
  };

  const withDSL = dsl(bindings, parseAst, regenerate);

  frame.parseSrc = generate(...withDSL(grammars));

  return (src) => {
    const ast = frame.parseSrc(src);
    return { ast, ...parseAst(ast) };
  };
};

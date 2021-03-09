const { empty } = require('../utils/symbols');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

const toSelector = (acc, ident) =>
  [acc]
    .concat(ident || 'unresolved')
    .filter(Boolean)
    .join('.');

module.exports = (frame = {}) => {
  let statements;
  let resolved;
  let api;

  const resolveFuzzyRef = (selector, id) => {
    const [fuzzyRef, ...rest] = selector.substr(1).split('.').reverse();
    const ancestorId = rest.join('.');
    return (
      resolved
        .filter(({ type }) => type !== 'regex')
        //must be ancestral
        .filter(
          ({ parentId }) =>
            id.startsWith(parentId) && parentId.endsWith(ancestorId)
        )
        .filter(({ ident }) => new RegExp(fuzzyRef).test(ident))
        .map(({ id }) => resolved.get(id))
    );
  };

  const resolveFuzzyInstruction = (next, selector, parentId) => {
    return (
      resolved
        .filter(({ type }) => type === 'inst')
        //must be ancestor
        .filter(
          ({ parentId: fuzzyId }) =>
            fuzzyId === parentId || (fuzzyId && parentId.startsWith(fuzzyId))
        )
        .filter(({ ident }) => new RegExp(selector.substr(1)).test(ident))
        .map(({ id, ident, type, parentId }) => ({
          ...next,
          id,
          ident,
          type,
          parentId,
        }))
    );
  };

  const resolveFuzzyTag = (selector, id, parentId) => {
    return (
      resolved
        .filter(({ type }) => type === 'regex')
        //must be ancestor
        .filter(({ parentId: fuzzyId }) => parentId.startsWith(fuzzyId))
        .filter(
          ({ ident, type }) =>
            type === 'regex' && new RegExp(ident.substr(1)).test(selector)
        )
        .map((next) => ({
          ...next,
          id,
          type: 'fuzzy',
        }))
    );
  };

  const resolveBinding = (id) =>
    frame.bindings[id] && { id, selector: id, is: [], token: {}, type: 'bind' };

  const resolveIntention = (id, token, ident) => {
    const selector = statements
      .get(id, true)
      .is.filter(({ temporal }) => !temporal)
      .reduce(
        (id, { parts = [] }) =>
          id ||
          (
            parts.find(
              ({ type, args }) => (type === 'tag' || type === 'inst') && !args
            ) || {}
          ).selector,
        ''
      );

    const intention =
      selector && selector !== id && resolveReference(true, selector)(token);

    if (intention) {
      return { selector: intention.selector, type: intention.type };
    }
  };

  const resolveReference = (pure, parentId, id, aliasMap = {}) => (
    token,
    isPushRef
  ) => {
    let { ident, type } = token;
    // selector alias
    if (aliasMap[ident]) {
      const aliasRef = resolved.get(aliasMap[ident]);
      if (aliasRef) {
        return { selector: aliasRef.id, type: aliasRef.type };
      }
      const aliasedId = parentId || id;
      if (api[aliasedId][aliasMap[ident]]) {
        return { selector: aliasedId, type: resolved.get(aliasedId).type };
      }
    }

    // child
    const childRef = resolved.get(toSelector(id, ident));
    if (!isPushRef && id && childRef)
      return { selector: childRef.id, type: childRef.type };

    // sibling
    const siblingRef = resolved.get(toSelector(parentId, ident));
    if (siblingRef) {
      return { selector: siblingRef.id, type: siblingRef.type };
    }

    // sibling alias
    const siblingAlias = resolved.find(
      ({ aliasMap = {}, parentId }) => aliasMap[ident] && parentId === parentId
    );
    if (siblingAlias && siblingAlias.aliasMap[ident]) {
      const siblingRef = resolved.get(siblingAlias.aliasMap[ident]);
      if (siblingRef) {
        return { selector: siblingRef.id, type: siblingRef.type };
      }
    }

    // sibling intention
    const sibling = id && resolveIntention(id, token, ident);
    if (sibling) return sibling;

    // parent intention
    const parent = parentId && resolveIntention(parentId, token, ident);
    if (parent) return parent;

    const parentRef = resolved.get(parentId);
    if (parentRef) {
      // ..ancestor
      if (parentRef.parentId) {
        const ancestorRef = resolveReference(
          pure,
          parentRef.parentId,
          id
        )(token);
        if (ancestorRef) {
          return {
            selector: ancestorRef.selector,
            type: ancestorRef.type,
          };
        }
      }
      // // parent alias
      // if (parentRef.aliasMap[ident]) {
      //   const aliasRef = resolved.get(parentRef.aliasMap[ident]);
      //   if (aliasRef) {
      //     return { selector: aliasRef.id, type: aliasRef.type };
      //   }
      // }
    }

    // root
    if (ident.startsWith && ident.toLowerCase().startsWith('root.'))
      ident = ident.replace(/[Rr]oot./, '');
    if (resolved.get(ident))
      return { selector: ident, type: resolved.get(ident).type };

    // bindings
    const bindingRef = resolveBinding(ident);
    if (bindingRef) return { selector: bindingRef.id, type: bindingRef.type };

    // literals?
    if (type === 'literal') {
      return { selector: ident, type: 'literal' };
    }

    // unresolved
    return (
      !pure && {
        selector: statements.addUnresolved({ ident, parentId, id }),
        type: 'unresolved',
      }
    );
  };

  const resolveMessage = (id, selector, message, aliasMap) => {
    let hint;
    let apiId;
    let argCount = (message || []).length;

    const messageSet = (message || []).reduce((acc, token) => {
      const fuzzyRef =
        token.type === 'regex' ? resolveFuzzyRef(token.ident, id) : [token];

      return fuzzyRef.reduce((acc, token) => {
        const { alias, message } = token;
        const { selector: valueId, type: valueType } = resolveReference(
          false,
          id,
          null,
          aliasMap
        )(token, true);

        // selector reference is argument so push directly onto the stack
        const fromArg = (api[id] || {})[valueId] && 'push-arg';

        if (alias) {
          aliasMap[alias] = valueId;
        }

        const boundArgs = resolveBinding(selector);
        const apiArgs = !boundArgs && api[selector];
        const sId = toSelector(selector, token.alias || token.ident);
        let argument;
        const sArgument = apiArgs && apiArgs[sId];
        const qArgument = apiArgs && !sArgument && apiArgs[selector];
        const isArgument = sArgument || qArgument;
        apiId = sArgument ? sId : selector;
        const { selector: messageRef, type: refType } =
          boundArgs ||
          // argument
          (isArgument && { selector, type: 'argument' }) ||
          // block
          resolveReference(
            true,
            selector,
            null,
            alias ? {} : aliasMap
          )({
            ident: alias || token.ident,
            type: token.type,
          });
        const isBlockRef =
          refType !== 'literal' &&
          messageRef &&
          messageRef.startsWith(selector);

        selectorType = refType;

        const blockMessage = [];
        if (apiArgs) {
          const { quantifier, type, alias } = sArgument || qArgument || {};
          if (type !== empty || !alias) {
            if (qArgument) {
              if (quantifier === '+' && valueType === empty) {
                hint = 'quantifier';
              }
              if (!quantifier && valueType !== empty) {
                hint = 'quantifier';
              }
              argument = qArgument;
            } else if (sArgument) {
              if (type === undefined) {
                hint = 'message';
              }
              if (type === empty && valueType !== empty) {
                hint = 'message';
              }
              argument = sArgument;
            } else if (!isBlockRef) {
              // not a block token?
              hint = 'message';
            }
          }
        }
        // Is this a message to an argument? These take precedence
        // over blocks
        if (!argument && isBlockRef) {
          // send the message to the block selector
          const block = resolved.get(messageRef);
          if (block && selector !== messageRef) {
            argCount--;
            blockMessage.push({
              id: messageRef,
              selector: messageRef,
              argCount: 1,
              type: 'call-message',
            });
          }
        }

        const [
          nestedMessage,
          nestedRef,
          nestedHint = '',
          nestedArgCount,
        ] = resolveMessage(id, valueId, message, aliasMap);

        const arg = argument
          ? argument.arg
          : acc.reduceRight((acc, { type, arg }) => {
              return type.endsWith('message') || arg ? acc : acc + 1;
            }, 1);

        acc = [
          ...acc,
          ...(nestedArgCount
            ? [
                ...nestedMessage,
                {
                  id: nestedRef,
                  type: nestedHint ? 'hint' : 'call-message',
                  argCount: nestedArgCount,
                },
              ]
            : valueType !== empty
            ? [
                {
                  id: valueId,
                  type: fromArg || valueType,
                  arg,
                },
              ]
            : []),
          ...blockMessage,
        ];
        return acc;
      }, acc);
    }, []);
    return [messageSet, selector, hint, argCount, apiId];
  };

  const resolveBlock = (id, token) => {
    if (
      // filter out fuzzy intentions
      resolved.get(token).type !== 'regex' &&
      // and temporal messages blocks
      !api[token] &&
      // don't duplicate block types, but rely on order precedence
      !statements
        .get(id)
        .is.find(({ type, id }) => type === 'block' && id === token)
    ) {
      statements.add(id, {
        ...statements.get(id),
        is: [...statements.get(id).is, { id, selector: token, type: 'block' }],
      });
    }
    return;
  };

  const resolveTemporal = (id, selector, intent, temporalIdx) => {
    const statement = statements.get(selector, true);
    if (
      !statement[intent].find(
        ({ id: target, temporalIdx: tidx }) =>
          target === id && tidx === temporalIdx
      )
    ) {
      statements.add(selector, {
        ...statement,
        [intent]: [
          ...(statement[intent] || []),
          {
            id,
            temporalIdx,
            type: 'temporal',
          },
        ],
      });
    }
  };

  const resolveSelector = (
    id,
    intent,
    sidx,
    tidx,
    { aliasMap, parentId },
    isTemporal
  ) => (token) => {
    const resolveToken = (token) => {
      const { ident, message, alias } = token;
      if (intent === 'block') return resolveBlock(id, token);

      const fuzzyRef = token.type === 'regex' && resolveFuzzyRef(ident, id);

      if (fuzzyRef.length) {
        return fuzzyRef.map(resolveToken);
      }
      // resolve selector sans message but ensure that full
      // message reference is obtainable
      const { selector, type } = resolveReference(
        false,
        parentId,
        id,
        aliasMap
      )(token);

      if (intent !== 'is') {
        const temporalIdx = sidx - 1;
        statements.get(id).is[temporalIdx].temporal = true;

        if (!message) {
          //  statement + selector
          //  intention + selector
          resolveTemporal(id, selector, intent, temporalIdx);
        } else {
          //  statement + message
          //  intention + message
          const [
            messageIntentions,
            selectorRef,
            messageHint,
            argCount,
          ] = resolveMessage(id, selector, message, aliasMap);

          (messageIntentions || [])
            .filter(
              ({ arg, type }) =>
                arg &&
                (type === 'push-arg' || type === 'apply-arg' || type === 'tag')
            )
            // messages are in {id type} format
            .forEach(({ id: selector }) => {
              resolveTemporal(id, selector, intent, tidx);
            });

          statements.get(id).message = {
            ...statements.get(id).message,
            [tidx]: [
              ...messageIntentions,
              {
                id: selectorRef,
                type: messageHint ? 'hint' : 'call-message',
                argCount,
              },
              {
                id,
                temporalIdx,
                type: `temporal-${intent}`,
              },
            ],
          };
        }
        return;
      } else {
        const [
          messageIntentions,
          selectorRef,
          messageHint,
          argCount,
          apiId,
        ] = resolveMessage(id, selector, message, aliasMap);

        if (alias) {
          aliasMap[alias] = selectorRef;
        }

        const apiArgs = api[id];
        const intentionType = messageHint
          ? 'hint'
          : message
          ? 'apply-message'
          : apiArgs && selectorRef === id
          ? 'apply-arg'
          : type;

        const selectorIntentions = statements.withCleanRef(
          [],
          selectorRef,
          id,
          message,
          intentionType
        )
          ? [
              {
                id,
                selector: selectorRef,
                ...(message && {
                  argCount,
                }),
                type: intentionType,
                ...(!message && apiArgs && apiArgs[selectorRef]
                  ? { arg: apiArgs[selectorRef].arg }
                  : {}),
                ...(message && api[selectorRef]
                  ? {
                      temporalIdx: (api[selectorRef][apiId] || { tidx: 0 })
                        .tidx,
                    }
                  : {}),
              },
            ]
          : [];

        const parts = [...messageIntentions, ...selectorIntentions];
        if (parts.length) {
          const statement = statements.get(id);

          if (!statement.is[sidx]) {
            statement.is[sidx] = {
              parts,
              ...isTemporal,
            };
          } else {
            statement.is[sidx] = {
              parts: [...statement.is[sidx].parts, ...parts],
              ...isTemporal,
            };
          }
        }
      }
    };
    return resolveToken(token);
  };

  const resolveStatement = (next) => {
    const { id, selected, quantifierMap, ...rest } = next;
    const { ident, type, parentId } = rest;

    // extend regex into tagged instructions
    if (type === 'tag') {
      resolveFuzzyTag(ident, id, parentId).forEach((fuzzy) => {
        resolveStatement(fuzzy);
      });
    }

    // extend regex into inherited block instructions
    if (type === 'regex') {
      resolveFuzzyInstruction(next, ident, parentId).forEach((fuzzy) => {
        resolveStatement(fuzzy);
      });
    }

    const statement = statements.get(id, true);
    statements.add(id, {
      ...(quantifierMap[id] ? { quantifier: quantifierMap[id] } : {}),
      ...(type === 'regex' ? { type } : {}),
      ...statement,
    });

    let tidx = 0;
    selected.forEach(({ intentions, temporal }) => {
      (intentions || []).forEach(({ intent, selector }) => {
        const sidx = statements.get(id).is.length;
        selector.forEach(
          resolveSelector(
            id,
            intent,
            sidx,
            tidx++,
            rest,
            temporal ? { temporal: true } : {}
          )
        );
      });
    });

    if (
      !id.includes('.') &&
      !statements.get(id).temporal &&
      !api[id] &&
      (resolved.get(id).type === 'tag' || resolved.get(id).type === 'inst')
    ) {
      statements.get(id).entryPoint = true;
    }
  };

  return (input) => {
    const parsed = input.selectors || input;
    api = {
      ...frame.api,
      ...(input.api || {}),
    };
    resolved = frame.selectors;
    statements = frame.statements.next();

    const entries = Object.entries(parsed)
      .filter(([_, { type }]) => type !== 'grammar')
      .map(([id, entry]) => {
        resolved.add(id, {
          ...resolved.get(id),
          ...entry,
        });
        return resolved.get(id);
      });

    entries.forEach(resolveStatement);

    Object.values(statements.latest())
      .filter(({ dependencies }) => dependencies)
      .map(({ id, dependencies }) => {
        dependencies.forEach(({ id }) => {
          if (id) {
            statements.remove(id);
            resolveStatement(resolved.get(id));
          }
        });
        return { id };
      })
      .forEach(({ id }) => {
        Reflect.deleteProperty(statements.get(id), 'dependencies');
      });

    return {
      ...(input.selectors ? input : {}),
      statements: statements.latest(),
    };
  };
};

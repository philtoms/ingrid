const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

module.exports = (frame) => {
  const map = {};
  const mapToLocal = (id = '', op = '') => {
    if (op.includes('literal')) return id;
    if (op.includes('bind')) return id;
    const j = id.indexOf('.');
    if (j >= 0) {
      const parent = id.substr(0, j);
      const child = id.substr(j);
      if (!map[parent]) map[parent] = frame.nextSymbol();
      map[id] = map[parent] + child;
    }
    if (!map[id]) map[id] = frame.nextSymbol();
    return map[id];
  };

  const fromEntry = (entry) => ({
    ...entry,
    ...(entry.id === undefined ? {} : { id: mapToLocal(entry.id) }),
    ...(entry.selector === undefined
      ? {}
      : { selector: mapToLocal(entry.selector, entry.op) }),
  });

  const fromTemporal = (acc, [tidx, entries]) => ({
    ...acc,
    [tidx]: entries.map(fromEntry),
  });

  const fromApi = (acc, [id, entry]) => ({
    ...acc,
    [mapToLocal(id)]: fromEntry(entry),
  });

  const mapInstructions = (acc, [key, { immediate, temporal }]) => {
    const id = mapToLocal(key);
    const [ident, ...rest] = id.split('.').reverse();
    const parentId = rest.join('.');

    frame.selectors.add(id, {
      id,
      ident,
      parentId,
      type: 'inst',
      aliasMap: {},
    });

    return {
      ...acc,
      [id]: {
        immediate: immediate.map(fromEntry),
        temporal: Object.entries(temporal).reduce(fromTemporal, {}),
      },
    };
  };

  return (src, options = {}) => {
    const isFrame = !!src.instructions;
    const next = frame.nextFrame(options);

    // a very simple frame merge for now - just to bind the cli tests,
    // but same tests should continue to pass when this code is opened out.
    const { exports, instructions, api } = isFrame ? src : next.compile(src);
    frame.instructions = Object.entries(instructions).reduce(
      mapInstructions,
      frame.instructions
    );

    frame.api = Object.entries(api)
      .filter(([id]) => id.split('.').length < 3)
      .reduce(
        (acc, [id, messageArgs]) => ({
          ...acc,
          [mapToLocal(id)]: Object.entries(messageArgs).reduce(fromApi, {}),
        }),
        frame.api
      );

    return exports.map((id) => mapToLocal(id));
  };
};

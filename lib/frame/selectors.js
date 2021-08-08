const Selectors = (selectors) => {
  let existing = selectors || {};
  let latest = {};

  const add = (id, selector) => {
    latest[id] = selector;
  };
  const merge = () => {
    existing = {
      ...existing,
      ...latest,
    };
    api._all = existing;
    return api;
  };
  const get = (id) => latest[id] || existing[id];

  const find = (test) => Object.values(latest).find(test);

  const filter = (test) => Object.values(latest).filter(test);

  const next = () => {
    latest = {};
    return api;
  };

  const api = {
    _all: existing,
    _latest: latest,
    add,
    get,
    find,
    filter,
    merge,
    next,
    latest: () => latest,
    all: () => existing,
  };

  return api;
};

module.exports = Selectors;

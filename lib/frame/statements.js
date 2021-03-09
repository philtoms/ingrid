const newStatement = () => ({
  is: [],
  after: [],
  before: [],
  message: {}
});

const Statements = statements => {
  let existingStatements = statements || {};
  let latest = {};

  const add = (id, statement) => {
    latest[id] = { ...newStatement(), ...statement };
  };
  const remove = id => {
    Reflect.deleteProperty(latest, id);
  };
  const merge = () => {
    existingStatements = {
      ...existingStatements,
      ...latest
    };
    api._all = existingStatements;
    return api;
  };
  const get = (id, withNew) => {
    if (!latest[id]) {
      latest[id] =
        existingStatements[id] ||
        (withNew &&
          JSON.parse(
            JSON.stringify(
              existingStatements[id] || (withNew && newStatement())
            )
          ));
    }
    return latest[id];
  };

  const next = () => {
    latest = {};
    return api;
  };

  const addUnresolved = ({ ident, id, parentId }) => {
    const unresolved = get(ident, true);
    add(ident, {
      ...unresolved,
      id: ident,
      ident,
      type: 'unresolved',
      dependencies: [
        ...(unresolved.dependencies || []),
        {
          id,
          parentId
        }
      ]
    });

    return ident;
  };

  // clean up erroneous unresolveds
  const withCleanRef = (fuzzyRef, selectorRef, id, message, type) => {
    // if (!message && selectorRef === id && type !== 'apply-arg') return false;
    if (fuzzyRef.length && get(selectorRef).type === 'unresolved') {
      get(selectorRef).dependencies = get(selectorRef).dependencies.filter(
        d => d !== id
      );
      return false;
    }
    return true;
  };

  const api = {
    _all: existingStatements,
    _latest: latest,
    add,
    remove,
    get,
    merge,
    next,
    latest: () => latest,
    all: () => existingStatements,
    addUnresolved,
    withCleanRef
  };

  return api;
};

module.exports = Statements;

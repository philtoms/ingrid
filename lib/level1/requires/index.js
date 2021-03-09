const fs = require('fs');
const path = require('path');

const Selector = require('../Selector');

const log = (res) => console.log(JSON.stringify(res, null, 2)) || res;

module.exports = (frame) => {
  return {
    grammar: 'requires:`str` is tag',
    action: ({ ident }) => {
      if (!/\.*\//.test(ident)) return pegContext.failed;
      const filepath = path.resolve(frame.__dirname, ident);
      let imports = frame.bindings[filepath];
      if (!imports) {
        try {
          // up the tree? maybe later..
          const src = fs.readFileSync(filepath, 'utf8');

          // register the new dir path for any nested import resolutions
          imports = frame.import(src, { __dirname: path.dirname(filepath) });

          frame.bindings[filepath] = imports;
        } catch (err) {
          console.log(err);
          return pegContext.failed;
        }
      }

      return imports.map((id) => Selector(id));
      // eat up the intention
      // return pegContext.actions.whitespace();
    },
  };
};

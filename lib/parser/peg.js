const peg = require('pegjs');

const log = res => console.log(JSON.stringify(res, null, 2)) || res;

var options = {
  cache: false,
  dependencies: {},
  exportVar: null,
  format: 'commonjs',
  optimize: 'speed',
  output: 'parser',
  plugins: [],
  trace: false
};

const parser = ({ detail } = {}) => {
  let parse;
  const report = (src = '', e, tag) => {
    if (e.location !== undefined) {
      abort(
        src,
        '\n',
        tag +
          ':' +
          e.location.start.line +
          ':' +
          e.location.start.column +
          ': ' +
          (tag === 'parse' ? e.stack : e.message)
      );
    } else {
      abort(tag + ':' + (tag === 'parse' ? e.stack : e.message));
    }
  };

  const abort = (...msg) => console.error(...msg);

  return (grammar, actions) => {
    // the only way to get context into grammar extensions,
    // unless something was missed?
    global.pegContext = {
      actions,
      detail
    };
    try {
      parse = peg.generate(grammar, options).parse;
      const parseSrc = (src = '') => {
        try {
          return parse(src);
        } catch (e) {
          if (e.message === 'new-rule') {
            return parseSrc(src);
          }
          report(src, e, 'parse');
        }
      };
      return parseSrc;
    } catch (e) {
      report('', e, 'rules');
    }
  };
};
module.exports = parser;

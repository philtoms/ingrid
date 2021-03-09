const fs = require('fs');
const path = require('path');
const Frame = require('./frame');
const interpreter = require('./interpreter');

const log = res => console.log(JSON.stringify(res, null, 2)) || res;

if (process.argv.length !== 3) {
  return console.error('invalid cli: node ./lib/cli filepath.in(f)');
}

const load = file => (acc, dir) => {
  try {
    const filepath = dir ? path.resolve(dir, file) : file;
    return acc || [fs.readFileSync(filepath, 'utf8'), filepath];
  } catch (e) {
    return null;
  }
};

const [, cli, file] = process.argv;
const [src, filepath] = [__dirname, path.dirname(cli), ''].reduce(
  load(file),
  false
);

const options = {
  level1: true,
  detail: 'debug'
};

const frame = Frame(options);
const imports = frame.import(file.endsWith('.inf') ? JSON.parse(src) : src);
fs.writeFileSync(
  filepath.replace('.inf', '').replace('.in', '') + '.inf',
  JSON.stringify({ ...frame, exports: imports }, null, 2)
);

const interpret = interpreter(frame);
log(interpret(imports));

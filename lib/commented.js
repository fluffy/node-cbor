(function() {
  var Commented, Decoder, MT, NUMBYTES, NoFilter, SYMS, Simple, assert, bignumber, plural, ref, stream, util, utils,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  assert = require('assert');

  stream = require('stream');

  util = require('util');

  utils = require('./utils');

  Simple = require('./simple');

  Decoder = require('./decoder');

  ref = require('./constants'), MT = ref.MT, NUMBYTES = ref.NUMBYTES, SYMS = ref.SYMS;

  bignumber = require('bignumber.js');

  NoFilter = require('nofilter');

  plural = function(c) {
    if (c > 1) {
      return 's';
    } else {
      return '';
    }
  };

  module.exports = Commented = (function(superClass) {
    extend(Commented, superClass);

    function Commented(options) {
      var ref1;
      if (options == null) {
        options = {};
      }
      this._on_data = bind(this._on_data, this);
      this._on_value = bind(this._on_value, this);
      this._on_stop = bind(this._on_stop, this);
      this._on_start = bind(this._on_start, this);
      this._on_start_string = bind(this._on_start_string, this);
      this._on_more = bind(this._on_more, this);
      this._on_read = bind(this._on_read, this);
      this._on_error = bind(this._on_error, this);
      options.readableObjectMode = false;
      options.writableObjectMode = false;
      this.max_depth = (ref1 = options.max_depth) != null ? ref1 : 10;
      delete options.max_depth;
      Commented.__super__.constructor.call(this, options);
      this.depth = 1;
      this.all = new NoFilter;
      this.parser = new Decoder(options);
      this.parser.on('value', this._on_value);
      this.parser.on('start', this._on_start);
      this.parser.on('start-string', this._on_start_string);
      this.parser.on('stop', this._on_stop);
      this.parser.on('more-bytes', this._on_more);
      this.parser.on('error', this._on_error);
      this.parser.on('data', this._on_data);
      this.parser.bs.on('read', this._on_read);
    }

    Commented.prototype._transform = function(fresh, encoding, cb) {
      return this.parser.write(fresh, encoding, function(er) {
        return cb(er);
      });
    };

    Commented.prototype._flush = function(cb) {
      return this.parser._flush(cb);
    };

    Commented.comment = function(input, options, cb) {
      var bs, d, encoding, max_depth, p, ref1, ref2;
      if (input == null) {
        throw new Error('input required');
      }
      encoding = typeof input === 'string' ? 'hex' : void 0;
      max_depth = 10;
      switch (typeof options) {
        case 'function':
          cb = options;
          break;
        case 'string':
          encoding = options;
          break;
        case 'number':
          max_depth = options;
          break;
        case 'object':
          encoding = (ref1 = options.encoding) != null ? ref1 : encoding;
          max_depth = (ref2 = options.max_depth) != null ? ref2 : max_depth;
      }
      bs = new NoFilter;
      d = new Commented({
        max_depth: max_depth
      });
      p = null;
      if (typeof cb === 'function') {
        d.on('end', function() {
          return cb(null, bs.toString('utf8'));
        });
        d.on('error', cb);
      } else {
        p = new Promise(function(resolve, reject) {
          d.on('end', function() {
            return resolve(bs.toString('utf8'));
          });
          return d.on('error', reject);
        });
      }
      d.pipe(bs);
      d.end(input, encoding);
      return p;
    };

    Commented.prototype._on_error = function(er) {
      this.push('ERROR: ');
      this.push(er.toString());
      return this.push('\n');
    };

    Commented.prototype._on_read = function(buf) {
      var hex, ind;
      this.all.write(buf);
      hex = buf.toString('hex');
      this.push(new Array(this.depth + 1).join('  '));
      this.push(hex);
      ind = (this.max_depth - this.depth) * 2;
      ind -= hex.length;
      if (ind < 1) {
        ind = 1;
      }
      this.push(new Array(ind + 1).join(' '));
      return this.push('-- ');
    };

    Commented.prototype._on_more = function(mt, len, parent_mt, pos) {
      this.depth++;
      this.push((function() {
        switch (mt) {
          case MT.POS_INT:
            return 'Positive number,';
          case MT.NEG_INT:
            return 'Negative number,';
          case MT.ARRAY:
            return 'Array, length';
          case MT.MAP:
            return 'Map, count';
          case MT.BYTE_STRING:
            return 'Bytes, length';
          case MT.UTF8_STRING:
            return 'String, length';
          case MT.SIMPLE_FLOAT:
            if (len === 1) {
              return 'Simple value,';
            } else {
              return 'Float,';
            }
        }
      })());
      return this.push(" next " + len + " byte" + (plural(len)) + "\n");
    };

    Commented.prototype._on_start_string = function(mt, tag, parent_mt, pos) {
      this.depth++;
      this.push((function() {
        switch (mt) {
          case MT.BYTE_STRING:
            return "Bytes, length: " + tag;
          case MT.UTF8_STRING:
            return "String, length: " + (tag.toString());
        }
      })());
      return this.push('\n');
    };

    Commented.prototype._on_start = function(mt, tag, parent_mt, pos) {
      this.depth++;
      if (tag !== SYMS.BREAK) {
        this.push((function() {
          switch (parent_mt) {
            case MT.ARRAY:
              return "[" + pos + "], ";
            case MT.MAP:
              if (pos % 2) {
                return "{Val:" + (Math.floor(pos / 2)) + "}, ";
              } else {
                return "{Key:" + (Math.floor(pos / 2)) + "}, ";
              }
          }
        })());
      }
      this.push((function() {
        switch (mt) {
          case MT.TAG:
            return "Tag #" + tag;
          case MT.ARRAY:
            if (tag === SYMS.STREAM) {
              return 'Array (streaming)';
            } else {
              return "Array, " + tag + " item" + (plural(tag));
            }
            break;
          case MT.MAP:
            if (tag === SYMS.STREAM) {
              return 'Map (streaming)';
            } else {
              return "Map, " + tag + " pair" + (plural(tag));
            }
            break;
          case MT.BYTE_STRING:
            return 'Bytes (streaming)';
          case MT.UTF8_STRING:
            return 'String (streaming)';
        }
      })());
      return this.push('\n');
    };

    Commented.prototype._on_stop = function(mt) {
      return this.depth--;
    };

    Commented.prototype._on_value = function(val, parent_mt, pos, ai) {
      if (val !== SYMS.BREAK) {
        this.push((function() {
          switch (parent_mt) {
            case MT.ARRAY:
              return "[" + pos + "], ";
            case MT.MAP:
              if (pos % 2) {
                return "{Val:" + (Math.floor(pos / 2)) + "}, ";
              } else {
                return "{Key:" + (Math.floor(pos / 2)) + "}, ";
              }
          }
        })());
      }
      this.push((function() {
        switch (false) {
          case val !== SYMS.BREAK:
            return 'BREAK';
          case val !== SYMS.NULL:
            return 'null';
          case val !== SYMS.UNDEFINED:
            return 'undefined';
          case typeof val !== 'string':
            this.depth--;
            return JSON.stringify(val);
          case !Buffer.isBuffer(val):
            this.depth--;
            return val.toString('hex');
          case !(val instanceof bignumber):
            return val.toString();
          default:
            return util.inspect(val);
        }
      }).call(this));
      switch (ai) {
        case NUMBYTES.ONE:
        case NUMBYTES.TWO:
        case NUMBYTES.FOUR:
        case NUMBYTES.EIGHT:
          this.depth--;
      }
      return this.push('\n');
    };

    Commented.prototype._on_data = function() {
      this.push('0x');
      this.push(this.all.read().toString('hex'));
      return this.push('\n');
    };

    return Commented;

  })(stream.Transform);

}).call(this);

//# sourceMappingURL=commented.js.map

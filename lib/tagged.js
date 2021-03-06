(function() {
  var MINUS_ONE, TEN, TWO, Tagged, bignumber, url, utils;

  bignumber = require('bignumber.js');

  utils = require('./utils');

  url = require('url');

  MINUS_ONE = new bignumber(-1);

  TEN = new bignumber(10);

  TWO = new bignumber(2);

  module.exports = Tagged = (function() {
    function Tagged(tag, value, err) {
      this.tag = tag;
      this.value = value;
      this.err = err;
      if (typeof this.tag !== 'number') {
        throw new Error("Invalid tag type (" + (typeof this.tag) + ")");
      }
      if ((this.tag < 0) || ((this.tag | 0) !== this.tag)) {
        throw new Error("Tag must be a positive integer: " + this.tag);
      }
    }

    Tagged.prototype.toString = function() {
      return this.tag + "(" + (JSON.stringify(this.value)) + ")";
    };

    Tagged.prototype.encodeCBOR = function(gen) {
      gen._pushTag(this.tag);
      return gen._pushAny(this.value);
    };

    Tagged.prototype.convert = function(converters) {
      var er, error, f;
      f = converters != null ? converters[this.tag] : void 0;
      if (typeof f !== 'function') {
        f = Tagged["_tag_" + this.tag];
        if (typeof f !== 'function') {
          return this;
        }
      }
      try {
        return f.call(Tagged, this.value);
      } catch (error) {
        er = error;
        this.err = er;
        return this;
      }
    };

    Tagged._tag_0 = function(v) {
      return new Date(v);
    };

    Tagged._tag_1 = function(v) {
      return new Date(v * 1000);
    };

    Tagged._tag_2 = function(v) {
      return utils.bufferToBignumber(v);
    };

    Tagged._tag_3 = function(v) {
      return MINUS_ONE.minus(utils.bufferToBignumber(v));
    };

    Tagged._tag_4 = function(v) {
      var e, m;
      e = v[0], m = v[1];
      return TEN.pow(e).times(m);
    };

    Tagged._tag_5 = function(v) {
      var e, m;
      e = v[0], m = v[1];
      return TWO.pow(e).times(m);
    };

    Tagged._tag_32 = function(v) {
      return url.parse(v);
    };

    Tagged._tag_35 = function(v) {
      return new RegExp(v);
    };

    return Tagged;

  })();

}).call(this);

//# sourceMappingURL=tagged.js.map

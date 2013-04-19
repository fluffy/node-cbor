var csrequire = require('covershot').require.bind(null, require);
var cbor = csrequire('../lib/cbor');

exports.create = function(test) {
  var u = new cbor.Unallocated(0);
  test.deepEqual(u.value, 0);

  test.throws(function() {
    new cbor.Unallocated("0");
  });
  test.throws(function() {
    new cbor.Unallocated(-1);
  });
  test.throws(function() {
    new cbor.Unallocated(256);
  });
  test.throws(function() {
    new cbor.Unallocated(1.1);
  });

  test.done();
};
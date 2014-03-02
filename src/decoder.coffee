# jslint node: true

stream = require 'stream'
url = require 'url'
bignumber = require 'bignumber.js'

BufferStream = require '../lib/BufferStream'
Tagged = require '../lib/tagged'
utils = require '../lib/utils'

Evented = require './evented'
constants = require './constants'

TAG = constants.TAG
MT = constants.MT
MINUS_ONE = new bignumber -1
TEN = new bignumber 10
TWO = new bignumber 2

class Decoder extends stream.Writable
  constructor: (@options={}, tags={}) ->
    super()

    @tags = utils.extend {}, tags
    for k,v of TAG
      f = @["tag_" + k]
      if f? and (typeof(f) == 'function')
        @tags[v] = f
    @stack = []

    @parser = new Evented
      input: @options.input
    @listen()
    @on 'finish', ->
      @parser.end()

  start: ()->
    @parser.start()

  on_error: (er) =>
    @emit 'error', er

  process: (val,tags,kind)->
    for t in tags by -1
      try
        f = @tags[t]
        if f?
          val = f.call(this, val) ? new Tagged(t, val)
        else
          val = new Tagged t, val
      catch er
        val = new Tagged t, val, er

    switch kind
      when null then @emit 'complete', val
      when 'array first', 'array' then @last.push val
      when 'key first', 'key' then @stack.push val
      when 'stream first', 'stream' then @last.write val
      when 'value'
        key = @stack.pop()
        @last[key] = val
      else console.log 'unknown', kind

  on_value: (val,tags,kind)=>
    @process val, tags, kind

  on_array_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = []

  on_array_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @process val, tags, kind

  on_map_start: (count,tags,kind)=>
    if @last?
      @stack.push @last
    @last = {}

  on_map_stop: (count,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    @process val, tags, kind

  on_stream_start: (mt,tags,kind)=>
    if @last?
      @stack.push @last
    @last = new BufferStream

  on_stream_stop: (count,mt,tags,kind)=>
    [val, @last] = [@last, @stack.pop()]
    val = val.read()
    if mt == MT.UTF8_STRING
      val = val.toString 'utf8'
    @process val, tags, kind

  on_end: ()=>
    @emit 'end'

  listen: ()->
    @parser.on 'value', @on_value
    @parser.on 'array start', @on_array_start
    @parser.on 'array stop', @on_array_stop
    @parser.on 'map start', @on_map_start
    @parser.on 'map stop', @on_map_stop
    @parser.on 'stream start', @on_stream_start
    @parser.on 'stream stop', @on_stream_stop
    @parser.on 'end', @on_end
    @parser.on 'error', @on_error

  _write: (buf, offset, encoding)->
    @parser.write buf, offset, encoding

  @decode: (buf, cb)->
    if !cb?
      throw new Error "cb must be specified"
    d = new Decoder
      input: buf
    actual = []
    d.on 'complete', (v)->
      actual.push v

    d.on 'end', ()->
      cb(null, actual) if cb
    d.on 'error', cb
    d.start()

  tag_DATE_STRING: (val)->
    new Date(val)

  tag_DATE_EPOCH: (val)->
    new Date(val * 1000)

  tag_POS_BIGINT: (val)->
    utils.bufferToBignumber val

  tag_NEG_BIGINT: (val)->
    MINUS_ONE.minus(utils.bufferToBignumber val)

  tag_DECIMAL_FRAC: (val)->
    [e,m] = val
    # m*(10**e)
    TEN.pow(e).times(m)

  tag_BIGFLOAT: (val)->
    [e,m] = val
    # m*(2**e)
    TWO.pow(e).times(m)

  tag_URI: (val)->
    url.parse(val)

  tag_REGEXP: (val)->
    new RegExp val

module.exports = Decoder
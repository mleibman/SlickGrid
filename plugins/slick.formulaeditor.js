// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map
  if (!Array.prototype.map) {
    Array.prototype.map = function(callback, thisArg) {
      var T, A, k;
      if (this == null) {
        throw new TypeError(" this is null or not defined");
      }
      var O = Object(this);
      var len = O.length >>> 0;
      if ({}.toString.call(callback) != "[object Function]") {
        throw new TypeError(callback + " is not a function");
      }
      if (thisArg) {
        T = thisArg;
      }
      A = new Array(len);
      k = 0;
      while(k < len) {
        var kValue, mappedValue;
        if (k in O) {
          kValue = O[ k ];
          A[ k ] = mappedValue;
        }
        k++;
      }
      return A;
    };      
  }

if (!Array.prototype.reduce) {
  Array.prototype.reduce = function reduce(accumulator){
    if (this===null || this===undefined) throw new TypeError("Object is null or undefined");
    var i = 0, l = this.length >> 0, curr;

    if(typeof accumulator !== "function") // ES5 : "If IsCallable(callbackfn) is false, throw a TypeError exception."
      throw new TypeError("First argument is not callable");

    if(arguments.length < 2) {
      if (l === 0) throw new TypeError("Array length is 0 and no second argument");
      curr = this[0];
      i = 1; // start accumulating at the second element
    }
    else
      curr = arguments[1];

    while (i < l) {
      if(i in this) curr = accumulator.call(undefined, curr, this[i], i, this);
      ++i;
    }
    
    return curr;
  };
}

if (!Array.prototype.filter) {  
  Array.prototype.filter = function(fun /*, thisp */)  {  
    "use strict";  
    
    if (this == null)  
      throw new TypeError();  
    
    var t = Object(this);  
    var len = t.length >>> 0;  
    if (typeof fun != "function")  
      throw new TypeError();  
    
    var res = [];  
    var thisp = arguments[1];  
    for (var i = 0; i < len; i++)  
    {  
      if (i in t)  
      {  
        var val = t[i]; // in case fun mutates this  
        if (fun.call(thisp, val, i, t))  
          res.push(val);  
      }  
    }  
    
    return res;  
  };  
}  

(function($) {
  $.extend(true, window, {
    'Slick': {
      'Editors': {
        'Formula': FormulaEditor
      }
    }
  });

  var refManagers = {};

  function RefManager(grid) {
    this.grid = grid;
    this.uh = {};
    this.dh = {};
    refManagers[grid.containerId()] = this;
  }


  RefManager.prototype = {
    key: function(ref) {
      return ref.row + ',' + ref.col;
    },
    clear: function(ref) {
      var k = this.key(ref);
      for(var r in this.getDependentRefs(ref)) {
        delete this.uh[r];
      }
      this.dh[k] = {};            
    },
    //val depends on key
    set: function(refKey, refVal) {
      var k = this.key(refKey), v = this.key(refVal);
      this.uh[k] = this.uh[k] || {};
      this.dh[v] = this.dh[v] || {};
      if(!this.uh[k][v]) {
        this.uh[k][v] = 1;
      }
      if(!this.dh[v][k]) {
        this.dh[v][k] = 1;
      }
    },
    checkCircle: function(ref, dependentRef) {
      var k = this.key(ref), dk = this.key(dependentRef), children;
      if(k == dk) {
        return true;
      }
      children = this.dh[dk] || [];
      if(children[k]) {
        return true;
      } else {
        for(var r in children[k]) {
          if(this.checkCircle(ref, getRefFromString(r))) {
            return true;
          }
        }
      }
      return false;
    },
    getUpdateRefs: function(ref) {
      return this.getHashRefs(this.uh, ref);
    },
    getDependentRefs: function(ref) {
      return this.getHashRefs(this.dh, ref);
    },
    getHashRefs: function(hash, ref) {
      var k = this.key(ref), acc = [];
      hash[k] = hash[k] || {};
      for(var i in hash[k]) {
        acc.push(this.getRefFromString(i));
      }
      return acc;
    },
    getRefFromString: function(str) {
      var coords = str.split(',').map(parseInt10);
      return {row: coords[0], col: coords[1]};
    },
    refValue: function(ref) {
      return this.grid.getDataItem(ref.row)[ref.col];
    },
    getRowAndCol: function(cell) {
      return {row: parseInt(cell.split(/\D/)[1]),
              col: this.getColIndex(cell.split(/\d/)[0])};
    },
    getColIndex: function(col) {
      var c = 0, left = 'a'.charCodeAt(0);
      for(var i = 0; i < col.length; i += 1) {
        c += col.charCodeAt(i) - left;
      }
      return c;
    },
    refRefs: function(ref) {
      ref = ref.toLowerCase().replace('$', '');
      var splitted = ref.split(':'), refs;
      var from = splitted[0], to = splitted[1];
      from = this.getRowAndCol(from);
      if (to) {
        to = this.getRowAndCol(to);
        refs = [];
        if(from.col == to.col) {
          for(var r = 0; r <= to.row - from.row; r += 1) {
            refs.push({row: from.row + r, col: from.col});
          }
        } else {
          for(var c = from.col; c <= to.col; c += 1) {
            refs.push({row: from.row, col: c});
          }
          if(from.row !== to.row) {
            for(var r = from.row + 1; r < to.row; r += 1) {
              for (var c = 0; c <= to.col; c += 1) {
                refs.push({row: r, col: c})
              }
            }
            for(var c = 0; c <= to.col; c += 1) {
              refs.push({row: to.row, col: c});
            }
          }
        }
        return refs;
      } else {
        return [from];
      }
    },
    evaluateRef: function(ref) {
      var self = this;
      var values = this.refRefs(ref).map(function(r) {
        return self.refValue(r);
      }).filter(function(r) {
        return typeof r != "undefined";
      });
      return values.length == 1 ? values[0] : values;
    },
  };


  function traverseTree(tree, fn) {
    fn(tree);
    if(tree.left) {
      traverseTree(tree.left, fn);            
    }
    if(tree.right) {
      traverseTree(tree.right, fn);
    }
  }

  function parseInt10(str) {
    return parseInt(str, 10);
  }

  function getRefManager(grid) {
    var key = grid.containerId();
    refManagers[key] = refManagers[key] || new RefManager(grid);
    return refManagers[key];
  }

  function FormulaEditor(args) {
    var $input;
    var defaultValue;
    var scope = this;
    var grid;
    
    function updateRefs(ref) {
      var selector, rc, rr, refManager, refs;
      refManager = getRefManager(grid);
      refs = refManager.getUpdateRefs(ref);
      for(var i = 0; i < refs.length; i += 1) {
        selector = 'div[row=' + refs[i].row + 
          '] > div[class*="slick-cell l' + (refs[i].col+1) + 
          ' r' + (refs[i].col+1) + '"]';
        scope.applyValue(null, 
                         evaluate(                         
                           $(selector)
                             .data('formula')
                             .substring(1), refManager), refs[i]);
        grid.updateCell(refs[i].row, refs[i].col + 1);
      }

    }
    this.init = function (args) {
      grid = args.grid;
      _selector = new Slick.CellRangeSelector();
      _selector.onCellRangeSelected.subscribe(this.handleCellRangeSelected);
      grid.registerPlugin(_selector)
      $input = $("<INPUT type=text class='editor-text'/>")
        .appendTo(args.container)
        .bind("keydown.nav", function (e) {
          if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
            e.stopImmediatePropagation();
          }
        })
        .focus()
        .select();
    };
    this.handleCellRangeSelected = function (e, args) {
      scope.setValue(
        scope.getValue() +
          grid.getColumns()[args.range.fromCell].name +
          args.range.fromRow +
          ":" +
          grid.getColumns()[args.range.toCell].name +
          args.range.toRow
      );
    };
    this.destroy = function () {
      $input.remove();
      _selector.onCellRangeSelected.unsubscribe(this.handleCellRangeSelected);
      grid.unregisterPlugin(_selector);
    };

    this.focus = function () {
      $input.focus();
    };

    this.getValue = function () {
      return $input.val();
    };

    this.setValue = function (val) {
      $input.val(val);
    };
    this.loadValue = function (item) {
      defaultValue = $.data(args.container, 'formula') || item[args.column.field] || "";
      $input.val(defaultValue);
      $input[0].defaultValue = defaultValue;
      $input.select();
    };
    
    this.serializeValue = function () {
      var val = $input.val(), result, cell, refs, tree, ref, old;
      var refManager = getRefManager(grid);
      cell = grid.getActiveCell();
      ref = {row: cell.row, col: cell.cell - 1};
      old = $.data(args.container, 'formula') || '';
      if(old.charAt(0) == '=') {
        refManager.clear(ref);
      }
      $.data(args.container, 'formula', val);
      if(val.charAt(0) == '=') {
        tree = parse(val.substring(1));
        result = evaluate(val.substring(1), refManager);
        traverseTree(tree, function(node) {
          if(node.type == 'ref') {
            refs = refManager.refRefs(node.value);
            for(var i = 0; i < refs.length; i += 1) {
              if(!refManager.checkCircle(ref, refs[i])) {
                refManager.set(refs[i], ref);
              } else {
                result = 'circular reference';
              }
            }
          }
        });
        
      } else {
        result = val;
      }
      return result;
    };

    this.applyValue = function (item, state, ref) {
      var row, col;
      if(!(ref === undefined)) {
        row = ref.row;
        col = ref.col;
        item = grid.getDataItem(row);
      } else {
        row = item.num;
        col = args.column.field;
      }
      item[col] = state;
      updateRefs({row: row, col: col});
    };

    this.isValueChanged = function () {
      return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
    };

    this.validate = function () {
      if (args.column.validator) {
        var validationResults = args.column.validator($input.val());
        if (!validationResults.valid) {
          return validationResults;
        }
      }

      return {
        valid: true,
        msg: null
      };
    };

    this.init(args);
  }    

  function lex(str) {
    var pos = 0, length = str.length, tokens = [];
    return (function() {
      var type, name, startPos;
      while(!ended()) {
        ignoreSpaces();
        startPos = pos;
        if(isLetter(current()) || current() == '_') {
          type = 'name';
          value = parseName();
        } else if(isDigit(current())) {
          type = 'number';
          value = parseNumber();
        } else if(isOp(current())) {
          type = 'operator';
          value = current();
          step();
        } else if(current() == '(') {
          type = 'lparen';
          value = '(';
          step();
        } else if(current() == ')') {
          type = 'rparen';
          value = ')';
          step();         
        } else if(current() == ':') {
          type = 'colon';
          value = ':';
          step();
        } else if (current() == ',') {
          type = 'comma';
          value = ',';
          step();
        } else if (current() == '$') {
          type = 'dollar';
          value = '$';
          step();
        } else {
          type = 'generic';
          value = current();
          step();
        }
        tokens.push({type: type, value: value, 
                     pos: startPos});
        ignoreSpaces();

      }
      tokens.push({type: 'eof', value: 'eof', pos: length});
      return tokens;
    })();

    function current() {
      return str.charAt(pos);
    }

    function step() {
      pos += 1;
    }

    function ended() {
      return pos >= length;
    }

    function isOp(ch) {
      return '+-*/^'.indexOf(ch) > -1;
    }

    function isLetter(ch) {
      return (ch >= 'A' && ch <= 'Z') || 
        (ch >= 'a' && ch <= 'z');
    }

    function isDigit(ch) {
      return ch >= '0' && ch <= '9';
    }

    function isAlpha(ch) {
      return isLetter(ch) || isDigit(ch) || ch == '_';
    }

    function isWhiteSpace(ch) {
      return (ch === 'u0009') || (ch === ' ') || 
        (ch === 'u00A0');
    }

    function ignoreSpaces() {
      while(!ended() && isWhiteSpace(current())) {
        step();
      }
    }

    function parseDigitSequence() {
      var acc = '';
      while(!ended() && isDigit(current())) {
        acc += current();
        step();
      }    
      return acc;
    }

    function parseNumber() {
      var acc = parseDigitSequence();
      if(current() == '.') {
        step();
        acc += '.' + parseDigitSequence();        
      }
      return acc;
    }   

    function parseName() {
      var acc = '';
      while(!ended() && isAlpha(current())) {
        acc += current();
        step();
      }
      return acc;
    }
  }

  function parse(str) {
    var tokens = lex(str), pos = -1;
    var next = tokens[0]; 
    return (function() {
      return expr();
    })();
    

    function syntaxError(msg) {
      return {name: 'syntax error', message: msg};
    }

    function peek(n) {
      n = n || 0;
      return tokens[pos + n];
    }
    function consume() {
      pos += 1;
      next = tokens[pos + 1];
    }
    function expect(value) {
      if(!next.value == value) {
        throw syntaxError('expected ' + next.value);
      }
      consume();
    }
    function expr() {
      var t = term();
      while(next.value == '+' || next.value == '-') {
        op = next.value;
        consume();
        t = {type: 'binary', op:op, left: t,
             right: term()};
      }
      return t;
    }
    function term() {
      var t = factor();
      while(next.value == '*' || next.value == '/') {
        op = next.value;
        consume();
        t = {type: 'binary', op: op, left:  t,
             right:  factor()};
      }
      return t;
    }
    function factor() {
      var t = primary();
      if(next.value == '^') {
        consume();
        return {type: 'binary', op: '^', left: t,
                right: factor()};
      } else {
        return t;
      }
    }
    function primary() {
      var t;
      if(next.type == 'number') {
        t = {type: 'numeric', value: next.value};
        consume();
        return t;
      } else if(next.type == 'dollar' || next.type == 'name') {
        return name();
      } else if(next.type == 'lparen') {
        consume();
        t = expr();
        expect(')');
        return t;
      } else if(next.value == '-') {
        consume();
        return {type: 'unary', op: '-', 
                right: factor()};
      }
      else {
        throw syntaxError('invalid syntax near '
                          + next.value);
      }
    }
    function name() {
      if(next.value.charAt(0) == '_') {
        var t = {type: 'variable', value: next.value};
        consume();
        return t;
      } else if (peek(2).type == 'lparen') {
        return func();
      } else if(next.type == 'dollar' || next.type == 'name' ) {
        var value = cellRef();
        if(next.type == 'colon') {
          consume()
          value += ':' + cellRef();
        }
        return {type: 'ref', value: value};
      }
      else {
        throw syntaxError('invalid syntax near ' + next.value);
      }
    }
    function func() {
      var t = {type: 'func', value: next.value, args: []};
      consume();
      expect('(');
      if(next.type == 'rparen') {
        consume();
        return t;
      } else {
        t.args.push(expr());
        while(next.type == 'comma') {
          consume();
          t.args.push(expr());
        }
        expect(')');
        return t;
      }
    }
    function cellRef() {
      var value = '';
      if(next.type == 'dollar') {
        value += '$';
        consume();
      } 
      value += next.value;
      consume();
      if(next.type == 'dollar') {
        value += '$';
        consume();
        value += next.value
      }
      return value;
    }
  }
  var _ops = {
    '+' : function(a, b) {
      return parseFloat(a) + parseFloat(b);
    },
    '-' : function(a, b) {
      return a - b;
    },
    'unary-': function(a) {
      return -a;
    },
    '*' : function(a, b) {
      return a * b;
    },
    '/' : function(a, b) {
      return a / b;
    },
    '^' : Math.pow
  };

  var _vars = {
    _pi: 3.14159265,
    _e: 2.71828183,
    _phi: 1.61803399
  };    

  var _funcs = {
    abs : Math.abs,
    ceiling: Math.ceil,
    floor: Math.floor,
    mod: function(a, b) {
      return a - (b * Math.floor(a / b));
    },
    round: function(n, d) {
      d = d || 0;
      return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    },
    trunc: function(n, d) {
      d = d || 0;
      return Math.floor(n * Math.pow(10, d)) / Math.pow(10, d);
    },
    sqrt: Math.sqrt,
    max: function() {
      return Math.max.apply(null, getArrayParams(arguments));
    },
    min: function() {
      return Math.min.apply(null, getArrayParams(arguments));
    },
    sum: function() {
      return getArrayParams(arguments)
        .map(parseFloat)
        .reduce(function(a, b) {
          return a + b;
        });
    },
    product: function() {
      return getArrayParams(arguments)
        .reduce(function(a, b) {
          return a * b;
        });
    },
    average: function() {
      var args = getArrayParams(arguments);
      return _funcs.sum(args) / args.length;
    }
  };
  function getArgs(args) {
    return Array.prototype.slice.call(args);
  }
  function getArrayParams(args) {
    return args.length == 1 && $.isArray(args[0]) ?
      args[0] :
      getArgs(args);
  }
  function getVar(name) {
    name = name.toLowerCase();
    if(_vars[name]) {
      return _vars[name];
    } else {
      throw evaluationError('undefined variable ' + name);
    }
  }
  function getFunc(name) {
    name = name.toLowerCase();
    if(_funcs[name]) {
      return _funcs[name];
    } else {
      throw evaluationError('call to undefined function ' + name);
    }
  }
  function evaluationError(msg) {
    return {name: 'evaluation error', message: msg};
  }

  function evaluate(param, refManager) {        
    try {
      if (typeof param == 'string') {
        return ev(parse(param));
      }
      return ev(param);
    } catch(e) {
      return e.message;
    }

    function ev(expr) {
      if(expr.type == 'binary') {
        return _ops[expr.op](ev(expr.left), ev(expr.right));
      } else if(expr.type == 'unary') {
        return _ops['unary' + expr.op](ev(expr.right));
      } else if(expr.type == 'numeric') {
        return parseFloat(expr.value);
      } else if(expr.type == 'variable') {
        return getVar(expr.value);
      } else if(expr.type == 'func') {
        return getFunc(expr.value).apply(null, expr.args.map(ev));
      } else if(expr.type == 'ref') {
        return refManager.evaluateRef(expr.value);
      }
    }

  }
})(jQuery)

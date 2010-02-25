/**
 * @license
 * jQuery.Rule - Css Rules manipulation, the jQuery way.
 * Copyright (c) 2007-2008 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 02/27/2008
 * Compatible with jQuery 1.2.x, tested on FF 2, Opera 9, Safari 3, and IE 6, on Windows.
 * (version 1.0.1.1 adds support for jQuery 1.4.2 to version 1.0.1)
 *
 * @author Ariel Flesler
 * @version 1.0.1.1
 *
 * @id jQuery.rule
 * @param {Undefined|String|jQuery.Rule} arg1 The rules, can be a selector, or literal CSS rules. Many can be given, comma separated.
 * @param {Undefined|String|DOMElement|jQuery} arg2 The context stylesheets, all of them by default.
 * @return {jQuery.Rule} Returns a jQuery.Rule object.
 *
 * @example $.rule('p,div').filter(function(){ return this.style.display != 'block'; }).remove();
 *
 * @example $.rule('div{ padding:20px;background:#CCC}, p{ border:1px red solid; }').appendTo('style');
 *
 * @example $.rule('div{}').append('margin:40px').css('margin-left',0).appendTo('link:eq(1)');
 *
 * @example $.rule().not('div, p.magic').fadeOut('slow');
 *
 * @example var text = $.rule('#screen h2').add('h4').end().eq(4).text();
 */
;(function( $ ){

   /**
	* Notes
	*	Some styles and animations might fail, please report it.
	*	The plugin needs a style node to stay in the DOM all along to temporarily hold rules. DON'T TOUCH IT.
	*	Opera requires this style to have alternate in the rel to allow disabling it.
	*	Rules in IE don't have .parentStylesheet. We need to find it each time(slow).
	*	Animations need close attention. Programatically knowing which rule has precedence, would require a LOT of work.
	*	This plugin adds $.rule and also 4 methods to $.fn: ownerNode, sheet, cssRules and cssText
	*	Note that rules are not directly inside nodes, you need to do: $('style').sheet().cssRules().
	*/

	var storageNode = $('<style rel="alternate stylesheet" type="text/css" />').appendTo('head')[0],//we must append to get a stylesheet
		sheet = storageNode.sheet ? 'sheet' : 'styleSheet',
		storage = storageNode[sheet],//css rules must remain in a stylesheet for IE and FF
		rules = storage.rules ? 'rules' : 'cssRules',
		remove = storage.deleteRule ? 'deleteRule' : 'removeRule',
		owner = storage.ownerNode ? 'ownerNode' : 'owningElement',
		reRule = /^([^{]+)\{([^}]*)\}/m,
		reStyle = /([^:]+):([^;}]+)/;

	storage.disabled = true;//let's ignore your rules

	var $rule = $.rule = function( r, c ){
		if(!(this instanceof $rule))
			return new $rule( r, c );

		this.sheets = $rule.sheets(c);
		if( r && reRule.test(r) )
			r = $rule.clean( r );
		if( typeof r == 'object' && !r.exec )
			return this.setArray( r.get ? r.get() : r.splice ? r : [r] );
		this.setArray( this.sheets.cssRules().get() );
		return r ? this.filter( r ) : this;
	};

	$.extend( $rule, {
		sheets:function( c ){
			var o = c;
			if( typeof o != 'object' )
				o = $.makeArray(document.styleSheets);
			o = $(o).not(storage);//skip our stylesheet
			if( typeof c == 'string' )
				o = o.ownerNode().filter(c).sheet();
			return o;
		},
		rule:function( str ){
			if( str.selectorText )/* * */
				return [ '', str.selectorText, str.style.cssText ];
			return reRule.exec( str );
		},
		appendTo:function( r, ss, skip ){
			switch( typeof ss ){//find the desired stylesheet
				case 'string': ss = this.sheets(ss);
				case 'object':
					if( ss[0] ) ss = ss[0];
					if( ss[sheet] ) ss = ss[sheet];
					if( ss[rules] ) break;//only if the stylesheet is valid
				default:
					if( typeof r == 'object' ) return r;//let's not waist time, it is parsed
					ss = storage;
			}
			var p;
			if( !skip && (p = this.parent(r)) )//if this is an actual rule, and it's appended.
				r = this.remove( r, p );

			var rule = this.rule( r );
			if( ss.addRule )
				ss.addRule( rule[1], rule[2]||';' );//IE won't allow empty rules
			else if( ss.insertRule )
				ss.insertRule( rule[1] + '{'+ rule[2] +'}', ss[rules].length );

			return ss[rules][ ss[rules].length - 1 ];//return the added/parsed rule
		},
		remove:function( r, p ){
			p = p || this.parent(r);
			if( p != storage ){//let's save some unnecesary cycles.
				var i = p ? $.inArray( r, p[rules] ) : -1;
				if( i != -1 ){//if not stored before removal, IE will crash eventually, and some rules in FF get messed up
					r = this.appendTo( r, 0 /*storage*/, true );//is faster and shorter to imply storage
					p[remove](i);
				}
			}
			return r;
		},
		clean:function( r ){
			return $.map( r.split('}'), function( txt ){
				if( txt )
					return $rule.appendTo( txt + '}' /*, storage*/ );//parse the string, storage implied
			});
		},
		parent:function( r ){//CSS rules in IE don't have parentStyleSheet attribute
			if( typeof r == 'string' || !$.browser.msie )//if it's a string, just return undefined.
				return r.parentStyleSheet;

			var par;
			this.sheets().each(function(){
				if( $.inArray(r, this[rules]) != -1 ){
					par = this;
					return false;
				}
			});
			return par;
		},
		outerText:function( rule ){
			return !rule ? '' : [rule.selectorText+'{', '\t'+rule.style.cssText,'}'].join('\n').toLowerCase();
		},
		text:function( rule, txt ){
			if( txt !== undefined )
				rule.style.cssText = txt;
			return !rule ? '' : rule.style.cssText.toLowerCase();
		}
	});

	$rule.fn = $rule.prototype = {
		pushStack:function( rs, sh ){
			var ret = $rule( rs, sh || this.sheets );
			ret.prevObject = this;
			return ret;
		},
		end:function(){
			return this.prevObject || $rule(0,[]);
		},
		filter:function( s ){
			var o;
			if( !s ) s = /./;//just keep them all.
			if( s.split ){
				o = $.trim(s).toLowerCase().split(/\s*,\s*/);
				s = function(){
					return !!$.grep( this.selectorText.toLowerCase().split(/\s*,\s*/), function( sel ){
						return $.inArray( sel, o ) != -1;
					}).length;
				};
			}else if( s.exec ){//string regex, or actual regex
				o = s;
				s = function(){ return o.test(this.selectorText); };
			}
			return this.pushStack($.grep( this, function( e, i ){
				return s.call( e, i );
			}));
		},
		add:function( rs, c ){
			return this.pushStack( $.merge(this.get(), $rule(rs, c)) );
		},
		is:function( s ){
			return !!(s && this.filter( s ).length);
		},
		not:function( n, c ){
			n = $rule( n, c );
			return this.filter(function(){
				return $.inArray( this, n ) == -1;
			});
		},
		append:function( s ){
			var rules = this, rule;
			$.each( s.split(/\s*;\s*/),function(i,v){
				if(( rule = reStyle.exec( v ) ))
					rules.css( rule[1], rule[2] );
			});
			return this;
		},
		text:function( txt ){
			return !arguments.length ? $rule.text( this[0] )
				: this.each(function(){	$rule.text( this, txt ); });
		},
		outerText:function(){
			return $rule.outerText(this[0]);
		}
	};

	$.each({
		ownerNode:owner,//when having the stylesheet, get the node that contains it
		sheet:sheet, //get the stylesheet from the node
		cssRules:rules //get the rules from the stylesheet.
	},function( m, a ){
		var many = a == rules;//the rules need some more processing
		$.fn[m] = function(){
			return this.map(function(){
				return many ? $.makeArray(this[a]) : this[a];
			});
		};
	});

	$.fn.cssText = function(){
		return this.filter('link,style').eq(0).sheet().cssRules().map(function(){
			return $rule.outerText(this);
		}).get().join('\n');
	};

	$.each('remove,appendTo,parent'.split(','),function( k, f ){
		$rule.fn[f] = function(){
			var args = $.makeArray(arguments), that = this;
			args.unshift(0);
			return this.each(function( i ){
				args[0] = this;
				that[i] = $rule[f].apply( $rule, args ) || that[i];
			});
		};
	});

	$.each(('each,index,get,size,eq,slice,map,attr,andSelf,css,show,hide,toggle,'+
			'queue,dequeue,stop,animate,fadeIn,fadeOut,fadeTo').split(','),function( k, f ){
		$rule.fn[f] = $.fn[f];
	});

	$rule.fn.setArray = function setArray(elems) { // this function has been pulled in from jQuery 1.4.1, because it is an internal function and has been dropped as of 1.4.2
		// Resetting the length to 0, then using the native Array push
		// is a super-fast way to populate an object with array-like properties
		this.length = 0;
		Array.prototype.push.apply( this, elems );
		return this;
	}

	var curCSS = $.curCSS;
	$.curCSS = function( e, a ){//this hack is still quite exprimental
		return ('selectorText' in e ) ?
			e.style[a] || $.prop( e, a=='opacity'? 1 : 0,'curCSS', 0, a )//TODO: improve these defaults
		: curCSS.apply(this,arguments);
	};

	/**
	 * Time to hack jQuery.data for animations.
	 * Only IE really needs this, but to keep the behavior consistent, I'll hack it for all browsers.
	 * TODO: This kind of id doesn't seem to be good enough
	 * TODO: Avoid animating similar rules simultaneously
	 * TODO: Avoid rules' precedence from interfering on animations ?
	 */
	$rule.cache = {};
	var mediator = function( original ){
		return function( elm ){
			var id = elm.selectorText;
			if( id )
				arguments[0] = $rule.cache[id] = $rule.cache[id] || {};
			return original.apply( $, arguments );
		};
	};
	$.data = mediator( $.data );
	$.removeData = mediator( $.removeData );

	$(window).unload(function(){
		$(storage).cssRules().remove();//empty our rules bin
	});

})( jQuery );
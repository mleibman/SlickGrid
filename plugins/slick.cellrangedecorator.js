// Universal module definition
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else {
    // Browser globals
    root.Slick.CellRangeDecorator = factory(root.jQuery);
  }
}(this, function ($) { 

  /***
   * Displays an overlay on top of a given cell range.
   *
   * TODO:
   * Currently, it blocks mouse events to DOM nodes behind it.
   * Use FF and WebKit-specific "pointer-events" CSS style, or some kind of event forwarding.
   * Could also construct the borders separately using 4 individual DIVs.
   *
   * @param {Grid} grid
   * @param {Object} options
   */
  function CellRangeDecorator(grid, options) {
    var _elem;
    var _defaults = {
      selectionCss: {
        "zIndex": "9999",
        "border": "2px dashed red"
      }
    };

    options = $.extend(true, {}, _defaults, options);


    function show(range) {
      if (!_elem) {
        _elem = $("<div></div>", {css: options.selectionCss})
            .css("position", "absolute")
            .appendTo(grid.getCanvasNode());
      }

      var from = grid.getCellNodeBox(range.fromRow, range.fromCell);
      var to = grid.getCellNodeBox(range.toRow, range.toCell);

      _elem.css({
        top: from.top - 1,
        left: from.left - 1,
        height: to.bottom - from.top - 2,
        width: to.right - from.left - 2
      });

      return _elem;
    }

    function hide() {
      if (_elem) {
        _elem.remove();
        _elem = null;
      }
    }

    $.extend(this, {
      "show": show,
      "hide": hide
    });
  }
  return CellRangeDecorator;

})); 

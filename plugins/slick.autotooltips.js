if (typeof Handlebars === "undefined") {
  throw "AutoTooltips plugin requires Handlebars to be loaded";
}

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    factory(jQuery);
  }
}(function ($) {
  // Register namespace
  $.extend(true, window, {
    "Slick": {
      "AutoTooltips": AutoTooltips
    }
  });

  /**
   * AutoTooltips plugin to show/hide tooltips when columns are too narrow to fit content.
   * @constructor
   * @param {boolean} [options.enableForCells=true]        - Enable tooltip for grid cells
   * @param {boolean} [options.enableForHeaderCells=false] - Enable tooltip for header cells
   * @param {number}  [options.maxToolTipLength=null]      - The maximum length for a tooltip
   */
  function AutoTooltips(options) {
    var _grid;
    var _self = this;
    var _defaults = {
      enableForCells: true,
      enableForHeaderCells: false,
      maxToolTipLength: null,
      useToolTipForCells: false
    };

    /**
     * Initialize plugin.
     */
    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      if (options.enableForCells) _grid.onMouseEnter.subscribe(handleMouseEnter);
      if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.subscribe(handleHeaderMouseEnter);
    }

    /**
     * Destroy plugin.
     */
    function destroy() {
      if (options.enableForCells) _grid.onMouseEnter.unsubscribe(handleMouseEnter);
      if (options.enableForHeaderCells) _grid.onHeaderMouseEnter.unsubscribe(handleHeaderMouseEnter);
    }

    /**
     * Handle mouse entering grid cell to add/remove tooltip.
     * @param {jQuery.Event} e - The event
     */
    function handleMouseEnter(e) {
      var cell = _grid.getCellFromEvent(e);
      var $node = $(_grid.getCellNode(cell.row, cell.cell));

      if (cell) {
        if (options.useToolTipForCells && $node.attr('title'))
          return;

        var text = options.useToolTipForCells? useTooltipOfColumn(cell) : useContentOfCell($node);

        $node.attr("title", text);
      }
    }

    function useContentOfCell($node) {
      var text = "";
      if ($node.innerWidth() < $node[0].scrollWidth) {
        text = $.trim($node.text());
        if (options.maxToolTipLength && text.length > options.maxToolTipLength) {
          text = text.substr(0, options.maxToolTipLength - 3) + "...";
        }
      }

      return text;
    }

    /**
     * Use toolTip defined in Column and apply context
     * @param cell
     */
    function useTooltipOfColumn(cell) {
      var column = _grid.getColumns()[cell.cell];
      var row = _grid.getDataItem(cell.row);

      return column.toolTip? Handlebars.compile(column.toolTip)(row): null;
    }

    /**
     * Handle mouse entering header cell to add/remove tooltip.
     * @param {jQuery.Event} e     - The event
     * @param {object} args.column - The column definition
     */
    function handleHeaderMouseEnter(e, args) {
      var column = args.column,
        $node = $(e.target).closest(".slick-header-column");
      if (!column.toolTip) {
        $node.attr("title", ($node.innerWidth() < $node[0].scrollWidth) ? column.name : "");
      }
    }

    // Public API
    $.extend(this, {
      "init": init,
      "destroy": destroy
    });
  }
}));

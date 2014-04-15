(function ($) {
  /**
   *
   * @param {Array, Slick.TreeColumns} columns
   * @param grid
   * @param options
   * @returns {{getAllColumns: getAllColumns, getTreeColumns: "getTreeColumns", destroy: destroy}}
   * @constructor
   */
  function SlickColumnPicker(columns, grid, options) {
    var $menu;
    var treeColumns;

    var defaults = {
      fadeSpeed:250,
      forceFitColumnsText: "Force fit columns",
      syncColumnCellResizeText: "Synchronous resize",
      classIconLevel: '',
      formatter: function(column) {
        var columnShown = grid.getColumnIndex(column.id) >= 0;
        var menu = '<label>';
        menu += '<input id="'+column.id+'" type="checkbox" data-column-id="'+column.id+'" '+(columnShown? 'checked="checked"': '')+' >';
        menu += column.name;
        menu += '</label>';
        return menu;
      }
    };

    function init() {
      options = $.extend({}, defaults, options);

      treeColumns = new Slick.TreeColumns(columns);

      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.subscribe(updateColumnOrder);

      $menu = $("<span class='slick-columnpicker' style='display:none;position:absolute;z-index:20;' />").appendTo(document.body);

      $menu.bind("mouseleave", function (e) {
        $(this).fadeOut(options.fadeSpeed)
      });
      $menu.bind("click", updateColumn);
    }

    function isCheckbox(column) {
      return column.name.indexOf('checkbox') >= 0;
    }

    function destroy() {
      grid.onHeaderContextMenu.unsubscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.unsubscribe(updateColumnOrder);
      $menu.remove();
    }

    function iconLevel() {
      return '<i class="' + options.classIconLevel + '"></i>';
    }

    function createColumnsList(_columns, firstLevel) {
      var menu = '<ul>'

      _columns.forEach(function(column, i) {
        menu += '<li id="picker-'+column.id+'" '+(isCheckbox(column)? 'style="display: none;"': '')+'>';

        if (!firstLevel)
          menu += iconLevel();

        if (column.columns) {
          menu += column.name;
          menu += createColumnsList(column.columns, false);
        } else {
          menu += options.formatter(column);
        }

        menu += '</li>';
      });

      menu += '</ul>';
      return menu;
    }

    function handleHeaderContextMenu(e, args) {
      var $li, $input;
      e.preventDefault();
      $menu.empty();
      updateColumnOrder();

      $('<div class="tree" />')
        .append(createColumnsList(columns, true))
        .appendTo($menu);

      $li = $("<p />").appendTo($menu);
      $input = $("<input type='checkbox' />").data("option", "autoresize");
      $("<label />")
        .text(options.forceFitColumnsText)
        .prepend($input)
        .appendTo($li);
      if (grid.getOptions().forceFitColumns) {
        $input.attr("checked", "checked");
      }

      $li = $("<p />").appendTo($menu);
      $input = $("<input type='checkbox' />").data("option", "syncresize");
      $("<label />")
        .text(options.syncColumnCellResizeText)
        .prepend($input)
        .appendTo($li);

      if (grid.getOptions().syncColumnCellResize)
        $input.attr("checked", "checked");

      $menu
        .css("top", e.pageY - 10)
        .css("left", e.pageX - 10)
        .fadeIn(options.fadeSpeed);
    }

    function updateColumnOrder() {
      treeColumns.reOrder(grid);
    }

    function updateColumn(e) {
      var $target = $(e.target);
      if ($target.data("option") == "autoresize") {
        if (e.target.checked) {
          grid.setOptions({forceFitColumns:true});
          grid.autosizeColumns();
        } else {
          grid.setOptions({forceFitColumns:false});
        }
        return;
      }

      if ($target.data("option") == "syncresize") {
        if (e.target.checked) {
          grid.setOptions({syncColumnCellResize:true});
        } else {
          grid.setOptions({syncColumnCellResize:false});
        }
        return;
      }

      if ($target.is(":checkbox")) {

        var visibleColumns = [];
        $('.tree input', $menu).each(function () {
          var $input = $(this);
          if ($input.is(":checked"))
            visibleColumns.push($input.data('columnId'));
        });

        if (!visibleColumns.length) {
          $target.attr("checked", "checked");
          return;
        }

        var $visibleColumns = treeColumns
          .filter(function() {
            return this.columns || visibleColumns.indexOf(this.id) >= 0;
          });

        var showFooterRow = grid.getOptions().showFooterRow;

        grid.setFooterRowVisibility(true);
        grid.setColumns(
          $visibleColumns
        );
        grid.setFooterRowVisibility(showFooterRow);

        var columnId = $target.data('columnId');
        $('#picker-'+ columnId)
          .html(
            iconLevel() + options.formatter(treeColumns.getById(columnId))
          );
      }
    }

    function getAllColumns() {
      return treeColumns.visibleColumns();
    }

    init();

    return {
      "getAllColumns": getAllColumns,
      "getTreeColumns": function() {
        return treeColumns;
      },
      "destroy": destroy
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick:{ Controls:{ ColumnPicker:SlickColumnPicker }}});
})(jQuery);


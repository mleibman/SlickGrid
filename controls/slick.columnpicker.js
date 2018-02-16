  /***
   * A control to add a Column Picker (right+click on any column header to reveal the column picker)
   *
   * USAGE:
   *
   * Add the slick.columnpicker.(js|css) files and register it with the grid.
   *
   * Available options, by defining a columnPicker object:
   *
   *  var options = {
   *    enableCellNavigation: true,
   *    columnPicker: {
   *      columnTitle: "Columns",                 // default to empty string
   *
   *      // the last 2 checkboxes titles
   *      hideForceFitButton: false,              // show/hide checkbox near the end "Force Fit Columns" (default:false) 
   *      hideSyncResizeButton: false,            // show/hide checkbox near the end "Synchronous Resize" (default:false) 
   *      forceFitTitle: "Force fit columns",     // default to "Force fit columns"
   *      syncResizeTitle: "Synchronous resize",  // default to "Synchronous resize"
   *    }
   *  };
   *
   * @class Slick.Controls.ColumnPicker
   * @constructor
   */

'use strict';

(function ($) {
  function SlickColumnPicker(columns, grid, options) {
    var $list;
    var $menu;
    var columnCheckboxes;
    var onColumnsChanged = new Slick.Event();

    var defaults = {
      fadeSpeed: 250,

      // the last 2 checkboxes titles
      hideForceFitButton: false,
      hideSyncResizeButton: false, 
      forceFitTitle: "Force fit columns",
      syncResizeTitle: "Synchronous resize"
    };

    function init() {
      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.subscribe(updateColumnOrder);
      options = $.extend({}, defaults, options);

      $menu = $("<div class='slick-columnpicker' style='display:none' />").appendTo(document.body);
      var $close = $("<button type='button' class='close' data-dismiss='slick-columnpicker' aria-label='Close'><span class='close' aria-hidden='true'>&times;</span></button>").appendTo($menu);

      // user could pass a title on top of the columns list
      if(options.columnPickerTitle || (options.columnPicker && options.columnPicker.columnTitle)) {
        var columnTitle = options.columnPickerTitle || options.columnPicker.columnTitle;
        var $title = $("<div class='title'/>").append(columnTitle);
        $title.appendTo($menu);
      }

      $menu.on("click", updateColumn);
      $list = $("<span class='slick-columnpicker-list' />");

      // Hide the menu on outside click.
      $(document.body).on("mousedown", handleBodyMouseDown);

      // destroy the picker if user leaves the page
      $(window).on("beforeunload", destroy);
    }

    function destroy() {
      grid.onHeaderContextMenu.unsubscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.unsubscribe(updateColumnOrder);
      $(document.body).off("mousedown", handleBodyMouseDown);
      $("div.slick-columnpicker").hide(options.fadeSpeed);
      $menu.remove();
    }

    function handleBodyMouseDown(e) {
      if (($menu && $menu[0] != e.target && !$.contains($menu[0], e.target)) || e.target.className == "close") {
        $menu.hide(options.fadeSpeed);
      }
    }

    function handleHeaderContextMenu(e, args) {
      e.preventDefault();
      $list.empty();
      updateColumnOrder();
      columnCheckboxes = [];

      var $li, $input;
      for (var i = 0; i < columns.length; i++) {
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' />").data("column-id", columns[i].id);
        columnCheckboxes.push($input);

        if (grid.getColumnIndex(columns[i].id) != null) {
          $input.attr("checked", "checked");
        }

        $("<label />")
            .html(columns[i].name)
            .prepend($input)
            .appendTo($li);
      }

      if (options.columnPicker && (!options.columnPicker.hideForceFitButton || !options.columnPicker.hideSyncResizeButton)) {
        $("<hr/>").appendTo($list);
      }

      if (!(options.columnPicker && options.columnPicker.hideForceFitButton)) {
        var forceFitTitle = (options.columnPicker && options.columnPicker.forceFitTitle) || options.forceFitTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' />").data("option", "autoresize");
        $("<label />")
            .text(forceFitTitle)
            .prepend($input)
            .appendTo($li);
        if (grid.getOptions().forceFitColumns) {
          $input.attr("checked", "checked");
        }
      }

      if (!(options.columnPicker && options.columnPicker.hideSyncResizeButton)) {
        var syncResizeTitle = (options.columnPicker && options.columnPicker.syncResizeTitle) || options.syncResizeTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' />").data("option", "syncresize");
        $("<label />")
            .text(syncResizeTitle)
            .prepend($input)
            .appendTo($li);
        if (grid.getOptions().syncColumnCellResize) {
          $input.attr("checked", "checked");
        }
      }

      $menu
          .css("top", e.pageY - 10)
          .css("left", e.pageX - 10)
          .css("max-height", $(window).height() - e.pageY -10)
          .fadeIn(options.fadeSpeed);

      $list.appendTo($menu);
    }

    function updateColumnOrder() {
      // Because columns can be reordered, we have to update the `columns`
      // to reflect the new order, however we can't just take `grid.getColumns()`,
      // as it does not include columns currently hidden by the picker.
      // We create a new `columns` structure by leaving currently-hidden
      // columns in their original ordinal position and interleaving the results
      // of the current column sort.
      var current = grid.getColumns().slice(0);
      var ordered = new Array(columns.length);
      for (var i = 0; i < ordered.length; i++) {
        if ( grid.getColumnIndex(columns[i].id) === undefined ) {
          // If the column doesn't return a value from getColumnIndex,
          // it is hidden. Leave it in this position.
          ordered[i] = columns[i];
        } else {
          // Otherwise, grab the next visible column.
          ordered[i] = current.shift();
        }
      }
      columns = ordered;
    }

    function updateColumn(e) {
      if ($(e.target).data("option") == "autoresize") {
        if (e.target.checked) {
          grid.setOptions({forceFitColumns:true});
          grid.autosizeColumns();
        } else {
          grid.setOptions({forceFitColumns:false});
        }
        return;
      }

      if ($(e.target).data("option") == "syncresize") {
        if (e.target.checked) {
          grid.setOptions({syncColumnCellResize:true});
        } else {
          grid.setOptions({syncColumnCellResize:false});
        }
        return;
      }

      if ($(e.target).is(":checkbox")) {
        var visibleColumns = [];
        $.each(columnCheckboxes, function (i, e) {
          if ($(this).is(":checked")) {
            visibleColumns.push(columns[i]);
          }
        });

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        grid.setColumns(visibleColumns);
        onColumnsChanged.notify({columns: visibleColumns, grid: grid});
      }
    }

    function getAllColumns() {
      return columns;
    }

    init();

    return {
      "getAllColumns": getAllColumns,
      "destroy": destroy,
      "onColumnsChanged": onColumnsChanged
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick:{ Controls:{ ColumnPicker:SlickColumnPicker }}});
})(jQuery);

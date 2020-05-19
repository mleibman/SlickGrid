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
 *      headerColumnValueExtractor: "Extract the column label" // default to column.name
 *      syncResizeTitle: "Synchronous resize",  // default to "Synchronous resize"
 *    }
 *  };
 *
 * @class Slick.Controls.ColumnPicker
 * @constructor
 */

(function ($) {
  'use strict';
  function SlickColumnPicker(columns, grid, options) {
    var _grid = grid;
    var _options = options;
    var _gridUid = (grid && grid.getUID) ? grid.getUID() : '';
    var $columnTitleElm;
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
      syncResizeTitle: "Synchronous resize",
      headerColumnValueExtractor:
        function (columnDef) {
          return columnDef.name;
        }
    };

    function init(grid) {
      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.subscribe(updateColumnOrder);
      _options = $.extend({}, defaults, options);

      $menu = $("<div class='slick-columnpicker " + _gridUid + "' style='display:none' />").appendTo(document.body);
      $("<button type='button' class='close' data-dismiss='slick-columnpicker' aria-label='Close'><span class='close' aria-hidden='true'>&times;</span></button>").appendTo($menu);

      // user could pass a title on top of the columns list
      if (_options.columnPickerTitle || (_options.columnPicker && _options.columnPicker.columnTitle)) {
        var columnTitle = _options.columnPickerTitle || _options.columnPicker.columnTitle;
        $columnTitleElm = $("<div class='title'/>").append(columnTitle);
        $columnTitleElm.appendTo($menu);
      }

      $menu.on("click", updateColumn);
      $list = $("<span class='slick-columnpicker-list' />");

      // Hide the menu on outside click.
      $(document.body).on("mousedown", handleBodyMouseDown);

      // destroy the picker if user leaves the page
      $(window).on("beforeunload", destroy);
    }

    function destroy() {
      _grid.onHeaderContextMenu.unsubscribe(handleHeaderContextMenu);
      _grid.onColumnsReordered.unsubscribe(updateColumnOrder);
      $(document.body).off("mousedown", handleBodyMouseDown);
      $("div.slick-columnpicker").hide(_options && _options.columnPicker && _options.columnPicker.fadeSpeed);
      $menu.remove();
    }

    function handleBodyMouseDown(e) {
      if (($menu && $menu[0] != e.target && !$.contains($menu[0], e.target)) || e.target.className == "close") {
        $menu.hide(_options && _options.columnPicker && _options.columnPicker.fadeSpeed);
      }
    }

    function handleHeaderContextMenu(e) {
      e.preventDefault();
      $list.empty();
      updateColumnOrder();
      columnCheckboxes = [];

      var $li, $input, columnId;
      var columnLabel, excludeCssClass;
      for (var i = 0; i < columns.length; i++) {
        columnId = columns[i].id;
        excludeCssClass = columns[i].excludeFromColumnPicker ? "hidden" : "";
        $li = $('<li class="' + excludeCssClass + '" />').appendTo($list);
        $input = $("<input type='checkbox' id='" + _gridUid + "colpicker-" + columnId + "' />").data("column-id", columnId).appendTo($li);
        columnCheckboxes.push($input);

        if (_grid.getColumnIndex(columnId) != null) {
          $input.attr("checked", "checked");
        }

        if (_options && _options.columnPicker && _options.columnPicker.headerColumnValueExtractor) {
          columnLabel = _options.columnPicker.headerColumnValueExtractor(columns[i]);
        } else {
          columnLabel = defaults.headerColumnValueExtractor(columns[i]);
        }

        $("<label for='" + _gridUid + "colpicker-" + columnId + "' />")
          .html(columnLabel)
          .appendTo($li);
      }

      if (_options.columnPicker && (!_options.columnPicker.hideForceFitButton || !_options.columnPicker.hideSyncResizeButton)) {
        $("<hr/>").appendTo($list);
      }

      if (!(_options.columnPicker && _options.columnPicker.hideForceFitButton)) {
        var forceFitTitle = (_options.columnPicker && _options.columnPicker.forceFitTitle) || _options.forceFitTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' id='" + _gridUid + "colpicker-forcefit' />").data("option", "autoresize").appendTo($li);
        $("<label for='" + _gridUid + "colpicker-forcefit' />").text(forceFitTitle).appendTo($li);
        if (_grid.getOptions().forceFitColumns) {
          $input.attr("checked", "checked");
        }
      }

      if (!(_options.columnPicker && _options.columnPicker.hideSyncResizeButton)) {
        var syncResizeTitle = (_options.columnPicker && _options.columnPicker.syncResizeTitle) || _options.syncResizeTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' id='" + _gridUid + "colpicker-syncresize' />").data("option", "syncresize").appendTo($li);
        $("<label for='" + _gridUid + "colpicker-syncresize' />").text(syncResizeTitle).appendTo($li);
        if (_grid.getOptions().syncColumnCellResize) {
          $input.attr("checked", "checked");
        }
      }

      $menu
        .css("top", e.pageY - 10)
        .css("left", e.pageX - 10)
        .css("max-height", $(window).height() - e.pageY - 10)
        .fadeIn(_options && _options.columnPicker && _options.columnPicker.fadeSpeed);

      $list.appendTo($menu);
    }

    function updateColumnOrder() {
      // Because columns can be reordered, we have to update the `columns`
      // to reflect the new order, however we can't just take `grid.getColumns()`,
      // as it does not include columns currently hidden by the picker.
      // We create a new `columns` structure by leaving currently-hidden
      // columns in their original ordinal position and interleaving the results
      // of the current column sort.
      var current = _grid.getColumns().slice(0);
      var ordered = new Array(columns.length);
      for (var i = 0; i < ordered.length; i++) {
        if (_grid.getColumnIndex(columns[i].id) === undefined) {
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

    /** Update the Titles of each sections (command, customTitle, ...) */
    function updateAllTitles(gridMenuOptions) {
      if ($columnTitleElm && $columnTitleElm.text) {
        $columnTitleElm.text(gridMenuOptions.columnTitle);
      }
    }

    function updateColumn(e) {
      if ($(e.target).data("option") == "autoresize") {
        // when calling setOptions, it will resize with ALL Columns (even the hidden ones)
        // we can avoid this problem by keeping a reference to the visibleColumns before setOptions and then setColumns after 
        var previousVisibleColumns = getVisibleColumns();
        var isChecked = e.target.checked;
        _grid.setOptions({ forceFitColumns: isChecked });
        _grid.setColumns(previousVisibleColumns);
        return;
      }

      if ($(e.target).data("option") == "syncresize") {
        if (e.target.checked) {
          _grid.setOptions({ syncColumnCellResize: true });
        } else {
          _grid.setOptions({ syncColumnCellResize: false });
        }
        return;
      }

      if ($(e.target).is(":checkbox")) {
        var visibleColumns = [];
        $.each(columnCheckboxes, function (i) {
          if ($(this).is(":checked")) {
            visibleColumns.push(columns[i]);
          }
        });

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        _grid.setColumns(visibleColumns);
        onColumnsChanged.notify({ allColumns: columns, columns: visibleColumns, grid: _grid });
      }
    }

    function getAllColumns() {
      return columns;
    }

    /** visible columns, we can simply get them directly from the grid */
    function getVisibleColumns() {
      return _grid.getColumns();
    }

    init(_grid);

    return {
      "init": init,
      "getAllColumns": getAllColumns,
      "getVisibleColumns": getVisibleColumns,
      "destroy": destroy,
      "updateAllTitles": updateAllTitles,
      "onColumnsChanged": onColumnsChanged
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick: { Controls: { ColumnPicker: SlickColumnPicker } } });
})(jQuery);

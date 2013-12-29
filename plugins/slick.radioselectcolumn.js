(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "RadioSelectColumn": RadioSelectColumn
    }
  });

  function RadioSelectColumn(options) {
    var _grid,
      _self = this,
      _handler = new Slick.EventHandler(),
      _selectedRow = null,
      _defaults = {
        columnId: "_radio_selector",
        columnName: "",
        cssClass: null,
        toolTip: "",
        width: 30
      },
      _options = $.extend(true, {}, _defaults, options);

    function init(grid) {
      _grid = grid;
      _handler
        .subscribe(_grid.onSelectedRowsChanged, handleSelectedRowsChanged)
        .subscribe(_grid.onClick, handleClick)
        .subscribe(_grid.onKeyDown, handleKeyDown);
    }

    function destroy() {
      _handler.unsubscribeAll();
      _grid = null;
    }

    function handleSelectedRowsChanged(e, args) {
      var previousRow = _selectedRow;
      _selectedRow = (args.rows && args.rows.length) ? args.rows[0] : null;
      null === previousRow || _grid.invalidateRow(previousRow);
      null === _selectedRow || _grid.invalidateRow(_selectedRow);
      _grid.render();
    }

    function handleClick(e, args) {
      if (_grid.getColumns()[args.cell].id === _options.columnId) {
        // if editing, try to commit
        if (_grid.getEditorLock().isActive() && !_grid.getEditorLock().commitCurrentEdit()) {
          e.preventDefault();
        } else {
          _grid.setSelectedRows(args.row === _selectedRow ? [] : [args.row]); // deselect if currently selected
          e.stopPropagation();
        }
        _grid.setActiveCell(args.row, args.cell);
        e.stopImmediatePropagation();
      }
    }

    function handleKeyDown(e, args) {
      if (32 == e.which && _grid.getColumns()[args.cell].id === _options.columnId) {
        // if editing, try to commit
        if (!_grid.getEditorLock().isActive() || _grid.getEditorLock().commitCurrentEdit()) {
          _grid.setSelectedRows(args.row === _selectedRow ? [] : [args.row]); // deselect if currently selected
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }

    function getColumnDefinition() {
      return {
        id: _options.columnId,
        name: _options.columnName,
        toolTip: _options.toolTip,
        field: "radio_sel",
        width: _options.width,
        resizable: false,
        sortable: false,
        cssClass: _options.cssClass,
        formatter: radioSelectionFormatter
      };
    }
  
    function radioSelectionFormatter(row, cell, value, columnDef, dataContext) {
      return dataContext
        ? _selectedRow === row
          ? "<input type='radio' checked='checked'>"
          : "<input type='radio'>"
        : null;
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "getColumnDefinition": getColumnDefinition
    });
  }
})(jQuery);
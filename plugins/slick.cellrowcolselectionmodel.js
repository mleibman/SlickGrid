(function ($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "CellRowColSelectionModel": CellRowColSelectionModel
        }
    });


    function CellRowColSelectionModel(options) {
        var _grid;
        var _canvas;
        var _ranges = [];
        var _self = this;
        var _handler = new Slick.EventHandler();
        var _inHandler;
        var _selector = new Slick.CellRangeSelector({
            "selectionCss": {
                "border": "2px solid black"
            }
        });
        var _options;
        var _defaults = {
            selectActiveCell: true,
            selectActiveRow: true
        };


        function init(grid) {
            _options = $.extend(true, {}, _defaults, options);
            _grid = grid;
            _canvas = _grid.getCanvasNode();
            _handler.subscribe(_grid.onActiveCellChanged, wrapHandler(handleActiveCellChange));
            _handler.subscribe(_grid.onKeyDown, wrapHandler(handleKeyDown));
            _handler.subscribe(_grid.onClick, wrapHandler(handleClick));
            _handler.subscribe(_grid.onHeaderClick, wrapHandler(handleOnHeaderClick));
            _handler.subscribe(_selector.onCellRangeSelected, wrapHandler(handleCellRangeSelected));
            _handler.subscribe(_selector.onBeforeCellRangeSelected, wrapHandler(handleBeforeCellRangeSelected));

            grid.registerPlugin(_selector);
        }

        function destroy() {
            _handler.unsubscribeAll();
            _grid.unregisterPlugin(_selector);
        }

        function wrapHandler(handler) {
            return function () {
                if (!_inHandler) {
                    _inHandler = true;
                    handler.apply(this, arguments);
                    _inHandler = false;
                }
            };
        }

        function rangesToRows(ranges) {
            var rows = [];
            for (var i = 0; i < ranges.length; i++) {
                for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
                    rows.push(j);
                }
            }
            return rows;
        }

        function rowsToRanges(rows) {
            var ranges = [];
            var lastCell = _grid.getColumns().length - 1;
            for (var i = 0; i < rows.length; i++) {
                ranges.push(new Slick.Range(rows[i], 0, rows[i], lastCell));
            }
            return ranges;
        }

        function getRowsRange(from, to) {
            var i, rows = [];
            for (i = from; i <= to; i++) {
                rows.push(i);
            }
            for (i = to; i < from; i++) {
                rows.push(i);
            }
            return rows;
        }

        function getSelectedRows() {
            return rangesToRows(_ranges);
        }

        function setSelectedRows(rows) {
            setSelectedRanges(rowsToRanges(rows));
        }

        function removeInvalidRanges(ranges) {
            var result = [];
            for (var i = 0; i < ranges.length; i++) {
                var r = ranges[i];
                if (!r.fromCell) {
                    // we return here if r.fromCell is NaN
                    // this it the case if we are selecting a row
                    return ranges;
                } else {
                    // we are selecting a cell range
                    if (_grid.canCellBeSelected(r.fromRow, r.fromCell) && _grid.canCellBeSelected(r.toRow, r.toCell)) {
                        result.push(r);
                    }
                }
            }
            return result;
        }

        function setSelectedRanges(ranges) {
            _ranges = removeInvalidRanges(ranges);
            _self.onSelectedRangesChanged.notify(_ranges);
        }

        function getSelectedRanges() {
            return _ranges;
        }

        function handleBeforeCellRangeSelected(e, args) {
            if (_grid.getEditorLock().isActive()) {
                e.stopPropagation();
                return false;
            }
        }

        function handleCellRangeSelected(e, args) {
            setSelectedRanges([args.range]);
        }

        function handleActiveCellChange(e, data) {
            if (data.cell == 0) {
                // we are in row select mode
                if (_options.selectActiveRow) {
                    setSelectedRanges([new Slick.Range(data.row, 0, data.row, _grid.getColumns().length - 1)]);
                }
            } else {
                // we are in cell select mode
                if (_options.selectActiveCell) {
                    setSelectedRanges([new Slick.Range(data.row, data.cell)]);
                }
            }
        }

        function handleOnHeaderClick(e, data) {
            if (data.column) {
                if (typeof data.column.id != "undefined") {
                    var col = _grid.getColumnIndex(data.column.id);
                    setSelectedRanges([new Slick.Range(0, col, _grid.getDataLength() - 1, col)]);
                }
            }
        }

        function handleKeyDown(e) {
            var activeRow = _grid.getActiveCell();
            if (activeRow && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.which == 38 || e.which == 40)) {
                var selectedRows = getSelectedRows();
                selectedRows.sort(function (x, y) {
                    return x - y
                });

                if (!selectedRows.length) {
                    selectedRows = [activeRow.row];
                }

                var top = selectedRows[0];
                var bottom = selectedRows[selectedRows.length - 1];
                var active;

                if (e.which == 40) {
                    active = activeRow.row < bottom || top == bottom ? ++bottom : ++top;
                } else {
                    active = activeRow.row < bottom ? --bottom : --top;
                }

                if (active >= 0 && active < _grid.getDataLength()) {
                    _grid.scrollRowIntoView(active);
                    _ranges = rowsToRanges(getRowsRange(top, bottom));
                    setSelectedRanges(_ranges);
                }

                e.preventDefault();
                e.stopPropagation();
            }
        }

        function handleClick(e) {
            var cell = _grid.getCellFromEvent(e);
            if (!cell || !_grid.canCellBeActive(cell.row, cell.cell)) {
                return false;
            }

            var selection = rangesToRows(_ranges);
            var idx = $.inArray(cell.row, selection);

            if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                return false;
            }
            else if (_grid.getOptions().multiSelect) {
                if (idx === -1 && (e.ctrlKey || e.metaKey)) {
                    selection.push(cell.row);
                    _grid.setActiveCell(cell.row, cell.cell);
                } else if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
                    selection = $.grep(selection, function (o, i) {
                        return (o !== cell.row);
                    });
                    _grid.setActiveCell(cell.row, cell.cell);
                } else if (selection.length && e.shiftKey) {
                    var last = selection.pop();
                    var from = Math.min(cell.row, last);
                    var to = Math.max(cell.row, last);
                    selection = [];
                    for (var i = from; i <= to; i++) {
                        if (i !== last) {
                            selection.push(i);
                        }
                    }
                    selection.push(last);
                    _grid.setActiveCell(cell.row, cell.cell);
                }
            }

            _ranges = rowsToRanges(selection);
            setSelectedRanges(_ranges);
            e.stopImmediatePropagation();

            return true;
        }

        $.extend(this, {
            "getSelectedRanges": getSelectedRanges,
            "setSelectedRanges": setSelectedRanges,

            "getSelectedRanges": getSelectedRanges,
            "setSelectedRanges": setSelectedRanges,

            "init": init,
            "destroy": destroy,

            "onSelectedRangesChanged": new Slick.Event()
        });
    }
})(jQuery);

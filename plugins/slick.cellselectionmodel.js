(function($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "CellSelectionModel":   CellSelectionModel
        }
    });


    function CellSelectionModel() {
        var _grid;
        var _canvas;
        var _ranges = [];
        var _dragging;
        var _self = this;

        function returnFalse() {
            return false;
        }

        function init(grid) {
            _grid = grid;
            _canvas = _grid.getCanvasNode();
            _grid.onActiveCellChanged.subscribe(handleActiveCellChange);
            _grid.onDragInit.subscribe(handleDragInit);
            _grid.onDragStart.subscribe(handleDragStart);
            _grid.onDrag.subscribe(handleDrag);
            _grid.onDragEnd.subscribe(handleDragEnd);
        }

        function destroy() {
            _grid.onActiveCellChanged.unsubscribe(handleActiveCellChange);
            _grid.onDragInit.unsubscribe(handleDragInit);
            _grid.onDragStart.unsubscribe(handleDragStart);
            _grid.onDrag.unsubscribe(handleDrag);
            _grid.onDragEnd.unsubscribe(handleDragEnd);
        }

        function removeInvalidRanges(ranges) {
            var result = [];

            for (var i = 0; i < ranges.length; i++) {
                var r = ranges[i];
                if (_grid.canCellBeSelected(r.fromRow,r.fromCell) && _grid.canCellBeSelected(r.toRow,r.toCell)) {
                    result.push(r);
                }
            }

            return result;
        }

        function setSelectedRanges(ranges) {
            _ranges = removeInvalidRanges(ranges);
            _self.onSelectedRangesChanged.notify(_ranges);        }

        function getSelectedRanges() {
            return _ranges;
        }

        function fixUpRange(range) {
            var r1 = Math.min(range.start.row,range.end.row);
            var c1 = Math.min(range.start.cell,range.end.cell);
            var r2 = Math.max(range.start.row,range.end.row);
            var c2 = Math.max(range.start.cell,range.end.cell);
            return {
                start: {row:r1, cell:c1},
                end: {row:r2, cell:c2}
            };
        }

        function handleDragInit(e,dd) {
            var cell = _grid.getCellFromEvent(e);

            if (!_grid.getEditorLock().isActive()) {
                if (_grid.canCellBeSelected(cell.row,cell.cell)/* && e.ctrlKey*/) {
                    _dragging = true;
                    e.stopImmediatePropagation();
                }
            }
        }

        function handleDragStart(e,dd) {
            if (!_dragging) {
                return;
            }

            var start = _grid.getCellFromPoint(
                    dd.startX - $(_canvas).offset().left,
                    dd.startY - $(_canvas).offset().top);

            e.stopImmediatePropagation();

            dd.range = {start:start,end:{}};

            return $("<div class='slick-selection'></div>").appendTo(_canvas);
        }

        function handleDrag(e,dd) {
            if (!_dragging) {
                return;
            }

            e.stopImmediatePropagation();

            var end = _grid.getCellFromPoint(
                    e.pageX - $(_canvas).offset().left,
                    e.pageY - $(_canvas).offset().top);

            if (!_grid.canCellBeSelected(end.row,end.cell)) {
                return;
            }

            dd.range.end = end;
            var r = fixUpRange(dd.range);
            var from = _grid.getCellNodeBox(r.start.row,r.start.cell);
            var to = _grid.getCellNodeBox(r.end.row,r.end.cell);

            $(dd.proxy).css({
                top: from.top - 1,
                left: from.left - 1,
                height: to.bottom - from.top - 2,
                width: to.right - from.left - 2
            });
        }

        function handleDragEnd(e,dd) {
            if (!_dragging) {
                return;
            }

            _dragging = false;
            e.stopImmediatePropagation();
            $(dd.proxy).remove();

            setSelectedRanges([
                new Slick.Range(
                    dd.range.start.row,
                    dd.range.start.cell,
                    dd.range.end.row,
                    dd.range.end.cell
                    )
            ]);
        }

        function handleActiveCellChange(e, data) {
            setSelectedRanges([new Slick.Range(data.row,data.cell)]);
        }

        $.extend(this, {
            "getSelectedRanges":            getSelectedRanges,
            "setSelectedRanges":            setSelectedRanges,

            "init":                         init,
            "destroy":                      destroy,

            "onSelectedRangesChanged":      new Slick.Event()
        });
    }
})(jQuery);
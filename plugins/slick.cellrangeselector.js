(function($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "CellRangeSelector":   CellRangeSelector
        }
    });


    function CellRangeSelector(options) {
        var _grid;
        var _canvas;
        var _dragging;
        var _self = this;
        var _defaults = {
            selectionCss: {
                "border": "2px dashed blue"
            }
        };


        function init(grid) {
            options = $.extend(true, {}, _defaults, options);
            _grid = grid;
            _canvas = _grid.getCanvasNode();
            _grid.onDragStart.subscribe(handleDragStart);
            _grid.onDrag.subscribe(handleDrag);
            _grid.onDragEnd.subscribe(handleDragEnd);
        }

        function destroy() {
            _grid.onDragStart.unsubscribe(handleDragStart);
            _grid.onDrag.unsubscribe(handleDrag);
            _grid.onDragEnd.unsubscribe(handleDragEnd);
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

        function handleDragStart(e,dd) {
            var cell = _grid.getCellFromEvent(e);
            if (_self.onBeforeCellRangeSelected.notify(cell) !== false) {
                if (_grid.canCellBeSelected(cell.row,cell.cell)) {
                    _dragging = true;
                    e.stopImmediatePropagation();
                }
            }
            if (!_dragging) {
                return;
            }

            var start = _grid.getCellFromPoint(
                    dd.startX - $(_canvas).offset().left,
                    dd.startY - $(_canvas).offset().top);

            dd.range = {start:start,end:{}};

            // TODO:  use a decorator
            return $("<div></div>", {css: options.selectionCss})
                .css("position", "absolute")
                .appendTo(_canvas);
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

            _self.onCellRangeSelected.notify({
                range:  new Slick.Range(
                            dd.range.start.row,
                            dd.range.start.cell,
                            dd.range.end.row,
                            dd.range.end.cell
                            )
            });
        }

        $.extend(this, {
            "init":                         init,
            "destroy":                      destroy,

            "onBeforeCellRangeSelected":    new Slick.Event(),
            "onCellRangeSelected":          new Slick.Event()
        });
    }
})(jQuery);
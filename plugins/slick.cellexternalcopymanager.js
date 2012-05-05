(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "CellExternalCopyManager": CellExternalCopyManager
    }
  });


  function CellExternalCopyManager() {
    var _grid;
    var _self = this;
    var _copiedRanges;

    function init(grid) {
      _grid = grid;
      _grid.onKeyDown.subscribe(handleKeyDown);
    }

    function destroy() {
      _grid.onKeyDown.unsubscribe(handleKeyDown);
    }

    function handleKeyDown(e, args) {
      var ranges;
      if (!_grid.getEditorLock().isActive()) {
        if (e.which == $.ui.keyCode.ESCAPE) {
          if (_copiedRanges) {
            e.preventDefault();
            clearCopySelection();
            _self.onCopyCancelled.notify({ranges: _copiedRanges});
            _copiedRanges = null;
          }
        }

        if (e.which == 67 && (e.ctrlKey || e.metaKey)) {    // CTRL + C
          ranges = _grid.getSelectionModel().getSelectedRanges();
          if (ranges.length != 0) {
            _copiedRanges = ranges;
            markCopySelection(ranges);
            _self.onCopyCells.notify({ranges: ranges});
            
            var columns = _grid.getColumns();
            var clipTextArr = [];
            
            for (var rg = 0; rg < ranges.length; rg++){
                var range = ranges[rg];
                var clipTextRows = [];
                for (var i=range.fromRow; i< range.toRow+1 ; i++){
                    var clipTextCells = [];
                    var dt = _grid.getDataItem(i);
                    
                    for (var j=range.fromCell; j< range.toCell+1 ; j++){
                        clipTextCells.push(dt[columns[j].id]);
                    }
                    clipTextRows.push(clipTextCells.join("\t"));
                }
                clipTextArr.push(clipTextRows.join("\n"));
            }
            var clipText = clipTextArr.join("\n");
            var ta = document.createElement('textarea');
            ta.style.position = 'absolute';
            ta.style.left = '-1000px';
            ta.style.top = '-1000px';
            ta.innerHTML = clipText;
            document.body.appendChild(ta);
            document.designMode = 'off';
            ta.focus();
            $(ta).select();
            
            setTimeout(function(){
                document.body.removeChild(ta);
            }, 100);
            
            return false;
          }
        }

        if (e.which == 86 && (e.ctrlKey || e.metaKey)) {    // CTRL + V
            var ta = document.createElement('textarea');
            ta.style.position = 'absolute';
            ta.style.left = '-1000px';
            ta.style.top = '-1000px';
            document.body.appendChild(ta);
            document.designMode = 'off';
            ta.focus();
            
            setTimeout(function(){
                var columns = _grid.getColumns();
                var clipText = ta.value;
                var clipRows = clipText.split(String.fromCharCode(10));
                var clippeds = [];
                
                document.body.removeChild(ta);

                
                for (var i=0; i<clipRows.length; i++) {
                    clippeds[i] = clipRows[i].split(String.fromCharCode(9));
                }
                
                var activeCell = _grid.getActiveCell();
                var activeRow = activeCell.row;
                var activeCell = activeCell.cell;
                var desty = activeRow;
                var destx = activeCell;

                for (var y = 0; y < clippeds.length; y++){
                    for (var x = 0; x < clippeds[y].length; x++){
                        var desty = activeRow + y;
                        var destx = activeCell + x;

                        var nd = _grid.getCellNode(desty, destx);
                        var dt = _grid.getDataItem(desty);
                        dt[columns[destx].id] = clippeds[y][x];
                        _grid.updateCell(desty, destx);
                    }
                }
            }, 100);
            
            return false;
        }
      }
    }

    function markCopySelection(ranges) {
      var columns = _grid.getColumns();
      var hash = {};
      for (var i = 0; i < ranges.length; i++) {
        for (var j = ranges[i].fromRow; j <= ranges[i].toRow; j++) {
          hash[j] = {};
          for (var k = ranges[i].fromCell; k <= ranges[i].toCell; k++) {
            hash[j][columns[k].id] = "copied";
          }
        }
      }
      _grid.setCellCssStyles("copy-manager", hash);
    }

    function clearCopySelection() {
      _grid.removeCellCssStyles("copy-manager");
    }

    $.extend(this, {
      "init": init,
      "destroy": destroy,
      "clearCopySelection": clearCopySelection,

      "onCopyCells": new Slick.Event(),
      "onCopyCancelled": new Slick.Event(),
      "onPasteCells": new Slick.Event()
    });
  }
})(jQuery);
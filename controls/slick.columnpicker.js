(function ($) {
  function SlickColumnPicker(columns, grid, options) {
    var $menu;
    var columnCheckboxes;
    var onColumnsChanged = new Slick.Event();

    var defaults = {
      fadeSpeed:250,
      showForceFitCheckbox: true,
      showSyncResizeCheckbox: true
    };

    var columnDefaults = {
      showInColumnPicker: true
    };

    function init() {
      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      options = $.extend({}, defaults, options);

      $menu = $("<span class='slick-columnpicker' style='display:none;position:absolute;z-index:20;' />").appendTo(document.body);

      $menu.bind("mouseleave", function (e) {
        $(this).fadeOut(options.fadeSpeed)
      });
      $menu.bind("click", updateColumn);

    }

    function handleHeaderContextMenu(e, args) {
      e.preventDefault();
      $menu.empty();
      columnCheckboxes = [];

      var $li, $input;
      for (var i = 0; i < columns.length; i++) {
        if (columns[i].showInColumnPicker !== false) {
          $li = $("<li />").appendTo($menu);
          $input = $("<input type='checkbox' />").data("column-index", i);
          columnCheckboxes.push($input);

          if (grid.getColumnIndex(columns[i].id) != null) {
            $input.attr("checked", "checked");
          }

          $("<label />")
            .text(columns[i].name)
            .prepend($input)
            .appendTo($li);
        }
      }

      if (options.showForceFitCheckbox ||
          options.showSyncResizeCheckbox) {
        $("<hr/>").appendTo($menu);
      }

      if (options.showForceFitCheckbox) {
        $li = $("<li />").appendTo($menu);
        $input = $("<input type='checkbox' />").data("option", "autoresize");
        $("<label />")
          .text("Force fit columns")
          .prepend($input)
          .appendTo($li);
        if (grid.getOptions().forceFitColumns) {
          $input.attr("checked", "checked");
        }
      }

      if (options.showSyncResizeCheckbox) {
        $li = $("<li />").appendTo($menu);
        $input = $("<input type='checkbox' />").data("option", "syncresize");
        $("<label />")
          .text("Synchronous resize")
          .prepend($input)
          .appendTo($li);
        if (grid.getOptions().syncColumnCellResize) {
          $input.attr("checked", "checked");
        }
      }

      $menu
          .css("top", e.pageY - 10)
          .css("left", e.pageX - 10)
          .fadeIn(options.fadeSpeed);
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
        var checkboxIndex = 0;
        for (var i = 0; i < columns.length; i++) {
          var shown = (columns[i].showInColumnPicker !== false);
          if ((!shown && grid.getColumnIndex(columns[i].id) != null) ||
              (shown && ($(columnCheckboxes[checkboxIndex++]).is(":checked")))) {
            visibleColumns.push(columns[i]);
          }
        }

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        grid.setColumns(visibleColumns);
        onColumnsChanged.notify({"columns": visibleColumns});
      }
    }

    init();

    return {
      "onColumnsChanged": onColumnsChanged
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick:{ Controls:{ ColumnPicker:SlickColumnPicker }}});
})(jQuery);

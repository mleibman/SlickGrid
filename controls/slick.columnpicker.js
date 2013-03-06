 (function ($) {
  function SlickColumnPicker(columns, grid, options) {
    var $menu;
    var columnCheckboxes;
    var onVisibleColumnsChanged = new Slick.Event();

    var defaults = {
      fadeSpeed:250,
      columnPickerForceFitCheckbox: true,
      columnPickerSyncResizeCheckbox: true,
    };

    var columnDefaults = {
      columnPickerFixed: false
    };

    function init() {
      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      options = $.extend({}, defaults, options);
      for (var i = 0; i < columns.length; i++) {
        columns[i] = $.extend({}, columnDefaults, columns[i]);
      }

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
        if (!columns[i].columnPickerFixed ) {
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

      if (grid.getOptions().columnPickerForceFitCheckbox ||
          grid.getOptions().columnPickerSyncResizeCheckbox) {
        $("<hr/>").appendTo($menu);
      }

      if (grid.getOptions().columnPickerForceFitCheckbox) {
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

      if (grid.getOptions().columnPickerSyncResizeCheckbox) {
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
          if (columns[i].columnPickerFixed ||
              ($(columnCheckboxes[checkboxIndex++]).is(":checked"))) {
            visibleColumns.push(columns[i]);
          }
        }

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        grid.setColumns(visibleColumns);
        onVisibleColumnsChanged.notify({"columns": visibleColumns});
      }
    }

    init();

    return {
      "onVisibleColumnsChanged": onVisibleColumnsChanged
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick:{ Controls:{ ColumnPicker:SlickColumnPicker }}});
})(jQuery);

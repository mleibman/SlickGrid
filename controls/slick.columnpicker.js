(function ($) {
  function SlickColumnPicker(columns, grid, options) {
    var $menu;
    
    var uid = "columnpicker_" + Math.round(1000000 * Math.random());
    var autoresizeId = uid + "_autoresize";
    var syncresizeId = uid + "_syncresize";

    var defaults = {
      fadeSpeed:250
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

      var $li, $input;
      for (var i = 0; i < columns.length; i++) {
        $li = $("<li />").appendTo($menu);

        $input = $("<input type='checkbox' />")
            .attr("id", uid + i)
            .data("id", columns[i].id)
            .appendTo($li);

        if (grid.getColumnIndex(columns[i].id) != null) {
          $input.attr("checked", "checked");
        }

        $("<label for='" + uid + i + "' />")
            .text(columns[i].name)
            .appendTo($li);
      }

      $("<hr/>").appendTo($menu);
      $li = $("<li />").appendTo($menu);
      $input = $("<input type='checkbox' id='" + autoresizeId + "' />").appendTo($li);
      $("<label for='" + autoresizeId + "'>Force Fit Columns</label>").appendTo($li);
      if (grid.getOptions().forceFitColumns) {
        $input.attr("checked", "checked");
      }

      $li = $("<li />").appendTo($menu);
      $input = $("<input type='checkbox' id='" + syncresizeId + "' />").appendTo($li);
      $("<label for='" + syncresizeId + "'>Synchronous Resizing</label>").appendTo($li);
      if (grid.getOptions().syncColumnCellResize) {
        $input.attr("checked", "checked");
      }

      $menu
          .css("top", e.pageY - 10)
          .css("left", e.pageX - 10)
          .fadeIn(options.fadeSpeed);
    }

    function updateColumn(e) {
      if (e.target.id == 'autoresize') {
        if (e.target.checked) {
          grid.setOptions({forceFitColumns:true});
          grid.autosizeColumns();
        } else {
          grid.setOptions({forceFitColumns:false});
        }
        return;
      }

      if (e.target.id == 'syncresize') {
        if (e.target.checked) {
          grid.setOptions({syncColumnCellResize:true});
        } else {
          grid.setOptions({syncColumnCellResize:false});
        }
        return;
      }

      if ($(e.target).is(":checkbox")) {
        if ($menu.find(":checkbox:checked").length == 0) {
          $(e.target).attr("checked", "checked");
          return;
        }

        var visibleColumns = [];
        $menu.find(":checkbox[id^=columnpicker]").each(function (i, e) {
          if ($(this).is(":checked")) {
            visibleColumns.push(columns[i]);
          }
        });
        grid.setColumns(visibleColumns);
      }
    }

    init();
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick:{ Controls:{ ColumnPicker:SlickColumnPicker }}});
})(jQuery);

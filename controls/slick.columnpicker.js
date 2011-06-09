(function($) {
    function SlickColumnPicker(columns,grid,options)
    {
        var $menu;

        var defaults = {
            fadeSpeed: 250,
            excludedColumns: []
        };

        function init() {
            grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
            options = $.extend({}, defaults, options);

            $menu = $("<span class='slick-columnpicker' style='display:none;position:absolute;z-index:20;' />").appendTo(document.body);

            $menu.bind("mouseleave", function(e) { $(this).fadeOut(options.fadeSpeed) });
            $menu.bind("click", updateColumn);

        }

        function excludeColumnCheck(column) {
            var exclude = false; //assume it's not excluded
            for (var i in options.excludedColumns){
                if (options.excludedColumns.propertyIsEnumerable(i)){
                    if (options.excludedColumns[i].id == column.id){
                        exclude = true;
                    }
                }
            }
            return exclude;
        }

        function columnsShownInMenu() {
            var shown_columns = [];
            for (var i in columns){
                if (columns.propertyIsEnumerable(i)){
                    if(!excludeColumnCheck(columns[i])){
                        shown_columns.push(columns[i]);
                    }
                }
            }
            return shown_columns;
        }

        function handleHeaderContextMenu(e, args)
        {
            e.preventDefault();
            $menu.empty();
            var $li, $input;
            var columns_shown_in_menu = columnsShownInMenu();
            for (var i=0; i<columns_shown_in_menu.length; i++) {
                $li = $("<li />").appendTo($menu);

                $input = $("<input type='checkbox' />")
                        .attr("id", "columnpicker_" + i)
                        .data("id", columns_shown_in_menu[i].id)
                        .appendTo($li);

                if (grid.getColumnIndex(columns_shown_in_menu[i].id) != null)
                    $input.attr("checked","checked");

                $("<label for='columnpicker_" + i + "' />")
                        .text(columns_shown_in_menu[i].name)
                        .appendTo($li);
            }

            $("<hr/>").appendTo($menu);
            $li = $("<li />").appendTo($menu);
            $input = $("<input type='checkbox' id='autoresize' />").appendTo($li);
            $("<label for='autoresize'>Force Fit Columns</label>").appendTo($li);
            if (grid.getOptions().forceFitColumns)
                $input.attr("checked", "checked");

            $li = $("<li />").appendTo($menu);
            $input = $("<input type='checkbox' id='syncresize' />").appendTo($li);
            $("<label for='syncresize'>Synchronous Resizing</label>").appendTo($li);
            if (grid.getOptions().syncColumnCellResize)
                $input.attr("checked", "checked");

            $menu
                    .css("top", e.pageY - 10)
                    .css("left", e.pageX - 10)
                    .fadeIn(options.fadeSpeed);
        }

        function updateColumn(e)
        {
            if (e.target.id == 'autoresize') {
                if (e.target.checked) {
                    grid.setOptions({forceFitColumns: true});
                    grid.autosizeColumns();
                } else {
                    grid.setOptions({forceFitColumns: false});
                }
                return;
            }

            if (e.target.id == 'syncresize') {
                if (e.target.checked) {
                    grid.setOptions({syncColumnCellResize: true});
                } else {
                    grid.setOptions({syncColumnCellResize: false});
                }
                return;
            }

            if ($(e.target).is(":checkbox")) {
                if ($menu.find(":checkbox:checked").length == 0) {
                    $(e.target).attr("checked","checked");
                    return;
                }

                var visibleColumns = [];
                $menu.find(":checkbox[id^=columnpicker]").each(function(i,e) {
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
    $.extend(true, window, { Slick: { Controls: { ColumnPicker: SlickColumnPicker }}});
})(jQuery);
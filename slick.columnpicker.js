(function() {
	function SlickColumnPicker(columns,grid)
	{
		var $menu;

		function init() {
			grid.onHeaderContextMenu = displayContextMenu;

			$menu = $("<span class='slick-columnpicker' style='display:none;position:absolute;z-index:20;' />").appendTo(document.body);

			$menu.bind("mouseleave", function(e) { $(this).fadeOut() });
			$menu.bind("click", updateColumn);

		}

		function displayContextMenu(e)
		{
			$menu.empty();

			for (var i=0; i<columns.length; i++) {
				var $li = $("<li />").appendTo($menu);

				var $input = $("<input type='checkbox' />")
                        .attr("id", "columnpicker_" + i)
                        .data("id", columns[i].id)
                        .appendTo($li);

				if (!columns[i].hidden)
					$input.attr("checked","checked");

				$("<label for='columnpicker_" + i + "' />")
					.text(columns[i].name)
					.appendTo($li);
			}

			$("<hr/><li><a id='autoresize'>Autosize</a></li>").appendTo($menu);

			$menu
				.css("top", e.pageY - 10)
				.css("left", e.pageX - 10)
				.fadeIn();
		}

		function updateColumn(e)
		{
			if ($(e.target).is("a")) {
				grid.autosizeColumns();
				$menu.fadeOut();
				return;
			}

			if ($(e.target).is(":checkbox")) {
				if ($menu.find(":checkbox:checked").length == 0) {
					$(e.target).attr("checked","checked");
					return;
				}

				var id =$(e.target).data("id");
				for (var i=0; i<columns.length; i++) {
					if (columns[i].id == id) {
						columns[i].hidden = !$(e.target).is(":checked");
						grid.setColumnVisibility(columns[i], $(e.target).is(":checked"));
						return;
					}
				}
			}
		}


		init();
	}

	// Slick.Controls.ColumnPicker
	$.extend(true, window, { Slick: { Controls: { ColumnPicker: SlickColumnPicker }}});
})();
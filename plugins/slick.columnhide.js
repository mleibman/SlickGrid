( function($) {

	$.extend(true, window, {
		"Slick" : {
			"ColumnHider" : SlickColumnHide
		}
	});
	function SlickColumnHide(columns, grid, options) {
		var $menu;
		var visibledColumns = [];
		var defaults = {
			fadeSpeed : 200
		};

		function init() {
			//grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
			options = $.extend( {}, defaults, options);
			setColumnsProperty();
			$menu = $(
					"<div class='slick-columncongeal' style='display:none;position:absolute;z-index:20;' />")
					.appendTo(document.body);

			$menu.bind("mouseleave", function(e) {
				$(this).fadeOut(options.fadeSpeed)
			});
			$menu.bind("click", updateColumn);
			$.extend(grid,{
				"onColumnVisibleChange":new Slick.Event()
			});
		}

		function setColumnsProperty() {
			var column;
			for ( var i = 0; i < columns.length; i++) {
				column = columns[i];
				column.showProperty = true;
			}
		}

	
		function handleHeaderContextMenu(e, args) {
			e.preventDefault();
			$menu.empty();

			var $li, $input;
			for ( var i = 0; i < columns.length; i++) {
				$li = $("<li />").appendTo($menu);

				$input = $("<input type='checkbox' />").attr("id",
						"columnhider_" + i).data("id", columns[i].id).appendTo(
						$li);

				if (grid.getColumnIndex(columns[i].id) != null)
					$input.attr("checked", "checked");

				$("<label for='columnhider_" + i + "' />")
						.text(columns[i].name).appendTo($li);
			}

			$menu.css("top", e.pageY - 10).css("left", e.pageX - 10).fadeIn(
					options.fadeSpeed);
		}

		
		function hideColumns(hidecolumns, flag){
			
			visibledColumns = [];
			hidecolumns = hidecolumns || [];
			var columnid;
			for ( var j = 0; j < columns.length; j++) {
				columnid = columns[j].id;
				for ( var i = 0; i < hidecolumns.length; i++) {
					if (columnid == hidecolumns[i]) {
						columns[j].showProperty = (flag == true ? false : true);
					}
				}
				visibledColumns[j] = columns[j];
			}
			
			var k = 0;
			for ( var i = 0; i < columns.length; i++) {
				if (!columns[i].showProperty) {
					visibledColumns.splice(i - k, 1);
					k++;
				}
			}
			grid.setColumns(visibledColumns);			
			grid.onColumnVisibleChange.notify({"columns":hidecolumns,"visible":!flag},null,grid);
		}

		
		function updateColumn(e) {
			if ($(e.target).is(":checkbox")) {
				if ($menu.find(":checkbox:checked").length == 0) {
					$(e.target).attr("checked", "checked");
					return;
				}

				var visibleColumns = [];
				$menu.find(":checkbox[id^=columnhider]").each( function(i, e) {
					if ($(this).is(":checked")) {
						visibleColumns.push(columns[i]);
					}
				});
				grid.setColumns(visibleColumns);
			}
		}
		function destroy() {
			delete _grid.onColumnVisibleChange;
		}
		//init();

		$.extend(this, {
			"init" : init,
			"hideColumns" : hideColumns
		});
	}

})(jQuery);

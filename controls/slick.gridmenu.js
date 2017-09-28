  /***
   * A control to add a Grid Menu (hambuger menu on top-right of the grid)
   *
   * USAGE:
   *
   * Add the slick.gridmenu.(js|css) files and register it with the grid.
   *
   * To specify a menu in a column header, extend the column definition like so:
   * var gridMenuControl = new Slick.Controls.GridMenu(columns, grid, options);
   *
   *  var options = {
   *    enableCellNavigation: true,
   *    gridMenu: {
   *      customTitle: "Custom Menus",
   *      columnTitle: "Columns",
   *      iconImage: "../images/drag-handle.png",   // this is the Grid Menu icon (hamburger icon)
   *      iconCssClass: "fa fa-bars",               // you can provide iconImage OR iconCssClass
   *      menuWidth: 18,                            // width that will be use to resize the column header container (18 by default)
   *      resizeOnShowHeaderRow: true,              // true by default
   *      resizeOnShowTopPanel: true,               // true by default
   *      customItems: [
   *        {
   *          // custom menu item options
   *        },
   *        {
   *          // custom menu item options
   *        }
   *      ]
   *    }
   *  };
   *
   *
   * Available grid options, by defining a gridMenu object:
   *    customTitle:            an optional title for the custom menu list
   *    columnTitle:            an optional title for the column list
   *    resizeOnShowHeaderRow:  do we want to resize the header row (minus the hamburger icon width)? true by default
   *    resizeOnShowTopPanel:   do we want to resize the top panel (minus the hamburger icon width)? true by default
   *    customItems:            list of custom menu items
   *
   * Available custom menu item options:
   *    title:        Menu item text.
   *    disabled:     Whether the item is disabled.
   *    tooltip:      Item tooltip.
   *    command:      A command identifier to be passed to the onCommand event handlers.
   *    iconCssClass: A CSS class to be added to the menu item icon.
   *    iconImage:    A url to the icon image.
   *
   *
   * The plugin exposes the following events:
   *    onBeforeMenuShow:   Fired before the menu is shown.  You can customize the menu or dismiss it by returning false.
   *      * ONLY works with a jQuery event (as per slick.core code), so we cannot notify when it's a button event (when grid menu is attached to an external button, not the hamburger menu)
   *        Event args:
   *            grid:     Reference to the grid.
   *            column:   Column definition.
   *            menu:     Menu options.  Note that you can change the menu items here.
   *
   *    onCommand:    Fired on menu item click for buttons with 'command' specified.
   *        Event args:
   *            grid:     Reference to the grid.
   *            column:   Column definition.
   *            command:  Button command identified.
   *            button:   Button options.  Note that you can change the button options in your
   *                      event handler, and the column header will be automatically updated to
   *                      reflect them.  This is useful if you want to implement something like a
   *                      toggle button.
   *
   *
   * @param options {Object} Options:
   *    buttonCssClass:   an extra CSS class to add to the menu button
   *    buttonImage:      a url to the menu button image (default '../images/down.gif')
   * @class Slick.Controls.GridMenu
   * @constructor
   */

  (function ($) {
    // register namespace
    $.extend(true, window, {
      "Slick": {
        "Controls": {
          "GridMenu": SlickGridMenu
        }
      }
    });

    function SlickGridMenu(columns, grid, options) {
      var _grid = grid;
      var _options = options;
      var _self = this;
      var $list;
      var $menu;
      var columnCheckboxes;

      var defaults = {
        fadeSpeed: 250
      };

      function init(grid) {
        var gridMenuWidth = (_options.gridMenu && _options.gridMenu.menuWidth) || 18;
        $header = $('.slick-header');
        $header.width($header.width() - gridMenuWidth);

        // if header row is enabled, we need to resize it's width also
        var enableResizeHeaderRow = (_options.gridMenu && _options.gridMenu.resizeOnShowHeaderRow) ? _options.gridMenu.resizeOnShowHeaderRow : _options.showHeaderRow;
        if(_options.showHeaderRow && enableResizeHeaderRow) {
          $headerrow = $('.slick-headerrow');
          $headerrow.width($headerrow.width() - gridMenuWidth);
        }

        // if top panel is enabled, we need to resize width also
        var enableResizeTopPanel = (_options.gridMenu && _options.gridMenu.resizeOnShowTopPanel) ? _options.gridMenu.resizeOnShowTopPanel : _options.showTopPanel;
        if(_options.showTopPanel && enableResizeTopPanel) {
          $toppanel = $('.slick-top-panel');
          $toppanel.width($toppanel.width() - gridMenuWidth);
        }

        $button = $('<button class="slick-gridmenu-button"/>');
        if (_options.gridMenu && _options.gridMenu.iconCssClass) {
          $button.addClass(_options.gridMenu.iconCssClass);
        } else {
          var iconImage = (_options.gridMenu && _options.gridMenu.iconImage) ? _options.gridMenu.iconImage :"../images/drag-handle.png";
          $btnImage = $('<img src="' + iconImage + '"/>');
          $btnImage.appendTo($button);
        }
        $button.insertBefore($header);

        $menu = $('<div class="slick-gridmenu" style="display: none" />').appendTo(document.body);
        $close = $('<button type="button" class="close" data-dismiss="slick-gridmenu" aria-label="Close"><span class="close" aria-hidden="true">&times;</span></button>').appendTo($menu);

        $customMenu = $('<div class="slick-gridmenu-custom" />');
        $customMenu.appendTo($menu);

        // user could pass a title on top of the custom section
        if(_options.gridMenu && _options.gridMenu.customTitle) {
          $title = $('<div class="title"/>').append(_options.gridMenu.customTitle);
          $title.appendTo($customMenu);
        }

        populateCustomMenus(_options, $customMenu);
        populateColumnPicker();

        // Hide the menu on outside click.
        $(document.body).on("mousedown", handleBodyMouseDown);

        // destroy the picker if user leaves the page
        $(window).on("beforeunload", destroy);

        // add on click handler for the Grid Menu itself
        $button.on("click", showGridMenu);
      }

      function destroy() {
        _grid.onColumnsReordered.unsubscribe(updateColumnOrder);
        $(document.body).off("mousedown", handleBodyMouseDown);
        $("div.slick-gridmenu").hide(_options.fadeSpeed);
        $menu.remove();
      }

      function populateCustomMenus(options, $customMenu) {
        // Construct the custom menu items.
        if(!options.gridMenu || !options.gridMenu.customItems) {
          return;
        }
        for (var i = 0, ln = options.gridMenu.customItems.length; i < ln; i++) {
          var item = options.gridMenu.customItems[i];

          var $li = $("<div class='slick-gridmenu-item'></div>")
            .data("command", item.command || '')
            .data("item", item)
            .on("click", handleMenuItemClick)
            .appendTo($customMenu);

          if (item.disabled) {
            $li.addClass("slick-gridmenu-item-disabled");
          }

          if (item.tooltip) {
            $li.attr("title", item.tooltip);
          }

          var $icon = $("<div class='slick-gridmenu-icon'></div>")
            .appendTo($li);

          if (item.iconCssClass) {
            $icon.addClass(item.iconCssClass);
          }

          if (item.iconImage) {
            $icon.css("background-image", "url(" + item.iconImage + ")");
          }

          $content = $("<span class='slick-gridmenu-content'></span>")
            .text(item.title)
            .appendTo($li);
        }
      }

      /** Build the column picker, the code comes almost untouched from the file "slick.columnpicker.js" */
      function populateColumnPicker() {
        _grid.onColumnsReordered.subscribe(updateColumnOrder);
        _options = $.extend({}, defaults, _options);

        // user could pass a title on top of the columns list
        if(_options.gridMenu && _options.gridMenu.columnTitle) {
          $title = $('<div class="title"/>').append(_options.gridMenu.columnTitle);
          $title.appendTo($menu);
        }

        $menu.on("click", updateColumn);
        $list = $('<span class="slick-gridmenu-list" />');
      }

      function showGridMenu(e) {
        e.preventDefault();
        $list.empty();

        updateColumnOrder();
        columnCheckboxes = [];

        // notify of the onBeforeMenuShow only works when it's a jQuery event (as per slick.core code)
        // this mean that we cannot notify when the grid menu is attach to a button event
        if(typeof e.isPropagationStopped === "function") {
          if (_self.onBeforeMenuShow.notify({
            "grid": _grid,
            "menu": $menu
          }, e, _self) == false) {
            return;
          }
        }

        var $li, $input;
        for (var i = 0; i < columns.length; i++) {
          $li = $("<li />").appendTo($list);
          $input = $("<input type='checkbox' />").data("column-id", columns[i].id);
          columnCheckboxes.push($input);

          if (_grid.getColumnIndex(columns[i].id) != null) {
            $input.attr("checked", "checked");
          }

          $("<label />")
              .html(columns[i].name)
              .prepend($input)
              .appendTo($li);
        }

        $("<hr/>").appendTo($list);
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' />").data("option", "autoresize");
        $("<label />")
            .text("Force fit columns")
            .prepend($input)
            .appendTo($li);
        if (_grid.getOptions().forceFitColumns) {
          $input.attr("checked", "checked");
        }

        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' />").data("option", "syncresize");
        $("<label />")
            .text("Synchronous resize")
            .prepend($input)
            .appendTo($li);
        if (_grid.getOptions().syncColumnCellResize) {
          $input.attr("checked", "checked");
        }

        var gridMenuWidth = $menu.width();

        $menu
            .css("top", e.pageY + 10)
            .css("left", e.pageX - $menu.width())
            .css("max-height", $(window).height() - e.pageY -10)
            .fadeIn(_options.fadeSpeed);

        $list.appendTo($menu);
      }

      function handleBodyMouseDown(e) {
        if (($menu && $menu[0] != e.target && !$.contains($menu[0], e.target)) || e.target.className == "close") {
          hideMenu();
        }
      }

      function handleMenuItemClick(e) {
        var command = $(this).data("command");
        var item = $(this).data("item");

        if (item.disabled) {
          return;
        }

        hideMenu();

        if (command != null && command != '') {
          _self.onCommand.notify({
              "grid": _grid,
              "command": command,
              "item": item
            }, e, _self);
        }

        // Stop propagation so that it doesn't register as a header click event.
        e.preventDefault();
        e.stopPropagation();
      }

      function hideMenu() {
        if ($menu) {
          $menu.hide(_options.fadeSpeed);
        }
      }

      function updateColumnOrder() {
        // Because columns can be reordered, we have to update the `columns`
        // to reflect the new order, however we can't just take `grid.getColumns()`,
        // as it does not include columns currently hidden by the picker.
        // We create a new `columns` structure by leaving currently-hidden
        // columns in their original ordinal position and interleaving the results
        // of the current column sort.
        var current = _grid.getColumns().slice(0);
        var ordered = new Array(columns.length);
        for (var i = 0; i < ordered.length; i++) {
          if ( _grid.getColumnIndex(columns[i].id) === undefined ) {
            // If the column doesn't return a value from getColumnIndex,
            // it is hidden. Leave it in this position.
            ordered[i] = columns[i];
          } else {
            // Otherwise, grab the next visible column.
            ordered[i] = current.shift();
          }
        }
        columns = ordered;
      }

      function updateColumn(e) {
        if ($(e.target).data("option") == "autoresize") {
          if (e.target.checked) {
            _grid.setOptions({forceFitColumns:true});
            _grid.autosizeColumns();
          } else {
            _grid.setOptions({forceFitColumns:false});
          }
          return;
        }

        if ($(e.target).data("option") == "syncresize") {
          if (e.target.checked) {
            _grid.setOptions({syncColumnCellResize:true});
          } else {
            _grid.setOptions({syncColumnCellResize:false});
          }
          return;
        }

        if ($(e.target).is(":checkbox")) {
          var visibleColumns = [];
          $.each(columnCheckboxes, function (i, e) {
            if ($(this).is(":checked")) {
              visibleColumns.push(columns[i]);
            }
          });

          if (!visibleColumns.length) {
            $(e.target).attr("checked", "checked");
            return;
          }

          _grid.setColumns(visibleColumns);
        }
      }

      init(_grid);

      function getAllColumns() {
        return columns;
      }

      $.extend(this, {
        "init": init,
        "getAllColumns": getAllColumns,
        "destroy": destroy,
        "showGridMenu": showGridMenu,
        "onBeforeMenuShow": new Slick.Event(),
        "onCommand": new Slick.Event()
      });
    }
  })(jQuery);
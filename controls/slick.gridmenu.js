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
   * Available grid options, by defining a gridMenu object:
   *
   *  var options = {
   *    enableCellNavigation: true,
   *    gridMenu: {
   *      customTitle: "Custom Menus",                // default to empty string
   *      columnTitle: "Columns",                     // default to empty string
   *      iconImage: "../images/drag-handle.png",     // this is the Grid Menu icon (hamburger icon)
   *      iconCssClass: "fa fa-bars",                 // you can provide iconImage OR iconCssClass
   *      leaveOpen: false,                           // do we want to leave the Grid Menu open after a command execution? (false by default)
   *      menuWidth: 18,                              // width that will be use to resize the column header container (18 by default)
   *      resizeOnShowHeaderRow: true,                // true by default
   *
   *      // the last 2 checkboxes titles
   *      hideForceFitButton: false,                  // show/hide checkbox near the end "Force Fit Columns"
   *      hideSyncResizeButton: false,                // show/hide checkbox near the end "Synchronous Resize"
   *      forceFitTitle: "Force fit columns",         // default to "Force fit columns"
   *      syncResizeTitle: "Synchronous resize",      // default to "Synchronous resize"
   *
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
   *    onMenuClose:      Fired when the menu is closing.
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

  'use strict';

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
      var _isMenuOpen = false;
      var _options = options;
      var _self = this;
      var $list;
      var $menu;
      var columnCheckboxes;
      var _defaults = {
        hideForceFitButton: false,
        hideSyncResizeButton: false, 
        fadeSpeed: 250,
        forceFitTitle: "Force fit columns",
        menuWidth: 18,
        resizeOnShowHeaderRow: false,
        syncResizeTitle: "Synchronous resize"
      };

      function init(grid) {
        var gridMenuWidth = (_options.gridMenu && _options.gridMenu.menuWidth) || _defaults.menuWidth;
        var $header = $('.slick-header');
        $header.attr('style', 'width: calc(100% - ' + gridMenuWidth +'px)');

        // if header row is enabled, we need to resize it's width also
        var enableResizeHeaderRow = (_options.gridMenu && _options.gridMenu.resizeOnShowHeaderRow != undefined) ? _options.gridMenu.resizeOnShowHeaderRow : _defaults.resizeOnShowHeaderRow;
        if(enableResizeHeaderRow) {
          var $headerrow = $('.slick-headerrow');
          $headerrow.attr('style', 'width: calc(100% - ' + gridMenuWidth +'px)');
        }

        var $button = $('<button class="slick-gridmenu-button"/>');
        if (_options.gridMenu && _options.gridMenu.iconCssClass) {
          $button.addClass(_options.gridMenu.iconCssClass);
        } else {
          var iconImage = (_options.gridMenu && _options.gridMenu.iconImage) ? _options.gridMenu.iconImage :"../images/drag-handle.png";
          var $btnImage = $('<img src="' + iconImage + '"/>');
          $btnImage.appendTo($button);
        }
        $button.insertBefore($header);

        $menu = $('<div class="slick-gridmenu" style="display: none" />').appendTo(document.body);
        var $close = $('<button type="button" class="close" data-dismiss="slick-gridmenu" aria-label="Close"><span class="close" aria-hidden="true">&times;</span></button>').appendTo($menu);

        var $customMenu = $('<div class="slick-gridmenu-custom" />');
        $customMenu.appendTo($menu);

        // user could pass a title on top of the custom section
        if(_options.gridMenu && _options.gridMenu.customTitle) {
          var $title = $('<div class="title"/>').append(_options.gridMenu.customTitle);
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
        _self.onBeforeMenuShow.unsubscribe();
        _self.onMenuClose.unsubscribe();
        _self.onCommand.unsubscribe();
        _self.onColumnsChanged.unsubscribe();
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

          var $content = $("<span class='slick-gridmenu-content'></span>")
            .text(item.title)
            .appendTo($li);
        }
      }

      /** Build the column picker, the code comes almost untouched from the file "slick.columnpicker.js" */
      function populateColumnPicker() {
        _grid.onColumnsReordered.subscribe(updateColumnOrder);
        _options = $.extend({}, _defaults, _options);

        // user could pass a title on top of the columns list
        if(_options.gridMenu && _options.gridMenu.columnTitle) {
          var $title = $('<div class="title"/>').append(_options.gridMenu.columnTitle);
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

        if (_options.gridMenu && (!_options.gridMenu.hideForceFitButton || !_options.gridMenu.hideSyncResizeButton)) {
          $("<hr/>").appendTo($list);
        }

        if (!(_options.gridMenu && _options.gridMenu.hideForceFitButton)) {
          var forceFitTitle = (_options.gridMenu && _options.gridMenu.forceFitTitle) || _defaults.forceFitTitle;
          $li = $("<li />").appendTo($list);
          $input = $("<input type='checkbox' />").data("option", "autoresize");
          $("<label />")
              .text(forceFitTitle)
              .prepend($input)
              .appendTo($li);
          if (_grid.getOptions().forceFitColumns) {
            $input.attr("checked", "checked");
          }
        }

        if (!(_options.gridMenu && _options.gridMenu.hideSyncResizeButton)) {
          var syncResizeTitle = (_options.gridMenu && _options.gridMenu.syncResizeTitle) || _defaults.syncResizeTitle;
          $li = $("<li />").appendTo($list);
          $input = $("<input type='checkbox' />").data("option", "syncresize");
          $("<label />")
              .text(syncResizeTitle)
              .prepend($input)
              .appendTo($li);
          if (_grid.getOptions().syncColumnCellResize) {
            $input.attr("checked", "checked");
          }
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
        if (($menu && $menu[0] != e.target && !$.contains($menu[0], e.target) && _isMenuOpen) || e.target.className == "close") {
          hideMenu(e);
        } else {
          _isMenuOpen = true;
        }
      }

      function handleMenuItemClick(e) {
        var command = $(this).data("command");
        var item = $(this).data("item");

        if (item.disabled) {
          return;
        }

        // does the user want to leave open the Grid Menu after executing a command?
        var leaveOpen = (_options.gridMenu && _options.gridMenu.leaveOpen) ? true : false;
        if(!leaveOpen) {
          hideMenu(e);
        }

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

      function hideMenu(e) {
        if ($menu) {
          $menu.hide(_options.fadeSpeed);
          _isMenuOpen = false;

          if (_self.onMenuClose.notify({
            "grid": _grid,
            "menu": $menu
          }, e, _self) == false) {
            return;
          }
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
          _self.onColumnsChanged.notify({
              "grid": _grid,
              "columns": visibleColumns
            }, e, _self);
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
        "onMenuClose": new Slick.Event(),
        "onCommand": new Slick.Event(),
        "onColumnsChanged": new Slick.Event()
      });
    }
  })(jQuery);
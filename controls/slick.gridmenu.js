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
 *      resizeOnShowHeaderRow: false,               // false by default
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
 * Available menu options:
 *     hideForceFitButton:        Hide the "Force fit columns" button (defaults to false)
 *     hideSyncResizeButton:      Hide the "Synchronous resize" button (defaults to false)
 *     forceFitTitle:             Text of the title "Force fit columns"
 *     menuWidth:                 Grid menu button width (defaults to 18)
 *     resizeOnShowHeaderRow:     Do we want to resize on the show header row event
 *     syncResizeTitle:           Text of the title "Synchronous resize"
 *     menuUsabilityOverride:     Callback method that user can override the default behavior of enabling/disabling the menu from being usable (must be combined with a custom formatter)
 *
 * Available custom menu item options:
 *    action:                     Optionally define a callback function that gets executed when item is chosen (and/or use the onCommand event)
 *    title:                      Menu item text.
 *    divider:                    Whether the current item is a divider, not an actual command.
 *    disabled:                   Whether the item is disabled.
 *    tooltip:                    Item tooltip.
 *    command:                    A command identifier to be passed to the onCommand event handlers.
 *    cssClass:                   A CSS class to be added to the menu item container.
 *    iconCssClass:               A CSS class to be added to the menu item icon.
 *    iconImage:                  A url to the icon image.
 *    textCssClass:               A CSS class to be added to the menu item text.
 *    itemVisibilityOverride:     Callback method that user can override the default behavior of showing/hiding an item from the list
 *    itemUsabilityOverride:      Callback method that user can override the default behavior of enabling/disabling an item from the list
 *
 *
 * The plugin exposes the following events:
 *
 *    onAfterMenuShow:   Fired after the menu is shown.  You can customize the menu or dismiss it by returning false.
 *      * ONLY works with a jQuery event (as per slick.core code), so we cannot notify when it's a button event (when grid menu is attached to an external button, not the hamburger menu)
 *        Event args:
 *            grid:     Reference to the grid.
 *            column:   Column definition.
 *            menu:     Menu options.  Note that you can change the menu items here.
 * 
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
    var _gridOptions;
    var _gridUid = (grid && grid.getUID) ? grid.getUID() : '';
    var _isMenuOpen = false;
    var _options = options;
    var _self = this;
    var $customTitleElm;
    var $columnTitleElm;
    var $customMenu;
    var $list;
    var $button;
    var $menu;
    var columnCheckboxes;
    var _defaults = {
      hideForceFitButton: false,
      hideSyncResizeButton: false,
      forceFitTitle: "Force fit columns",
      menuWidth: 18,
      resizeOnShowHeaderRow: false,
      syncResizeTitle: "Synchronous resize"
    };

    function init(grid) {
      _gridOptions = grid.getOptions();
      createGridMenu();

      // subscribe to the grid, when it's destroyed, we should also destroy the Grid Menu
      grid.onBeforeDestroy.subscribe(destroy);
    }

    function setOptions(newOptions) {
      options = $.extend({}, options, newOptions);
    }

    function createGridMenu() {
      var gridMenuWidth = (_options.gridMenu && _options.gridMenu.menuWidth) || _defaults.menuWidth;
      var $header;
      if (_gridOptions && _gridOptions.hasOwnProperty('frozenColumn') && _gridOptions.frozenColumn >= 0) {
        $header = $('.' + _gridUid + ' .slick-header-right');
      } else {
        $header = $('.' + _gridUid + ' .slick-header-left');
      }
      $header.attr('style', 'width: calc(100% - ' + gridMenuWidth + 'px)');

      // if header row is enabled, we need to resize it's width also
      var enableResizeHeaderRow = (_options.gridMenu && _options.gridMenu.resizeOnShowHeaderRow != undefined) ? _options.gridMenu.resizeOnShowHeaderRow : _defaults.resizeOnShowHeaderRow;
      if (enableResizeHeaderRow && _options.showHeaderRow) {
        var $headerrow = $('.' + _gridUid + '.slick-headerrow');
        $headerrow.attr('style', 'width: calc(100% - ' + gridMenuWidth + 'px)');
      }

      $button = $('<button class="slick-gridmenu-button"/>');
      if (_options.gridMenu && _options.gridMenu.iconCssClass) {
        $button.addClass(_options.gridMenu.iconCssClass);
      } else {
        var iconImage = (_options.gridMenu && _options.gridMenu.iconImage) ? _options.gridMenu.iconImage : "../images/drag-handle.png";
        var $btnImage = $('<img src="' + iconImage + '"/>');
        $btnImage.appendTo($button);
      }
      $button.insertBefore($header);

      $menu = $('<div class="slick-gridmenu ' + _gridUid + '" style="display: none" />').appendTo(document.body);
      $('<button type="button" class="close" data-dismiss="slick-gridmenu" aria-label="Close"><span class="close" aria-hidden="true">&times;</span></button>').appendTo($menu);

      $customMenu = $('<div class="slick-gridmenu-custom" />');
      $customMenu.appendTo($menu);

      populateCustomMenus(_options, $customMenu);
      populateColumnPicker();

      // Hide the menu on outside click.
      $(document.body).on("mousedown." + _gridUid, handleBodyMouseDown);

      // destroy the picker if user leaves the page
      $(window).on("beforeunload", destroy);

      // add on click handler for the Grid Menu itself
      $button.on("click." + _gridUid, showGridMenu);
    }

    function destroy() {
      _self.onAfterMenuShow.unsubscribe();
      _self.onBeforeMenuShow.unsubscribe();
      _self.onMenuClose.unsubscribe();
      _self.onCommand.unsubscribe();
      _self.onColumnsChanged.unsubscribe();
      _grid.onColumnsReordered.unsubscribe(updateColumnOrder);
      _grid.onBeforeDestroy.unsubscribe();
      $(document.body).off("mousedown." + _gridUid, handleBodyMouseDown);
      $("div.slick-gridmenu." + _gridUid).hide();
      $menu.remove();
      $button.remove();
    }

    function populateCustomMenus(options, $customMenu) {
      // Construct the custom menu items.
      if (!options.gridMenu || !options.gridMenu.customItems) {
        return;
      }

      // user could pass a title on top of the custom section
      if (_options.gridMenu && _options.gridMenu.customTitle) {
        $customTitleElm = $('<div class="title"/>').append(_options.gridMenu.customTitle);
        $customTitleElm.appendTo($customMenu);
      }

      for (var i = 0, ln = options.gridMenu.customItems.length; i < ln; i++) {
        var item = options.gridMenu.customItems[i];
        var callbackArgs = {
          "grid": _grid,
          "menu": $menu,
          "columns": columns,
          "visibleColumns": getVisibleColumns()
        };

        // run each override functions to know if the item is visible and usable
        var isItemVisible = runOverrideFunctionWhenExists(item.itemVisibilityOverride, callbackArgs);
        var isItemUsable = runOverrideFunctionWhenExists(item.itemUsabilityOverride, callbackArgs);

        // if the result is not visible then there's no need to go further
        if (!isItemVisible) {
          continue;
        }

        // when the override is defined, we need to use its result to update the disabled property
        // so that "handleMenuItemCommandClick" has the correct flag and won't trigger a command clicked event
        if (Object.prototype.hasOwnProperty.call(item, "itemUsabilityOverride")) {
          item.disabled = isItemUsable ? false : true;
        }

        var $li = $("<div class='slick-gridmenu-item'></div>")
          .data("command", item.command || '')
          .data("item", item)
          .on("click", handleMenuItemClick)
          .appendTo($customMenu);

        if (item.divider || item === "divider") {
          $li.addClass("slick-gridmenu-item-divider");
          continue;
        }
        if (item.disabled) {
          $li.addClass("slick-gridmenu-item-disabled");
        }

        if (item.cssClass) {
          $li.addClass(item.cssClass);
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

        var $text = $("<span class='slick-gridmenu-content'></span>")
          .text(item.title)
          .appendTo($li);

        if (item.textCssClass) {
          $text.addClass(item.textCssClass);
        }
      }
    }

    /** Build the column picker, the code comes almost untouched from the file "slick.columnpicker.js" */
    function populateColumnPicker() {
      _grid.onColumnsReordered.subscribe(updateColumnOrder);
      _options = $.extend({}, _defaults, _options);

      // user could pass a title on top of the columns list
      if (_options.gridMenu && _options.gridMenu.columnTitle) {
        $columnTitleElm = $('<div class="title"/>').append(_options.gridMenu.columnTitle);
        $columnTitleElm.appendTo($menu);
      }

      $menu.on("click", updateColumn);
      $list = $('<span class="slick-gridmenu-list" />');
    }

    function showGridMenu(e) {
      e.preventDefault();

      // empty both the picker list & the command list
      $list.empty();
      $customMenu.empty();

      populateCustomMenus(_options, $customMenu);
      updateColumnOrder();
      columnCheckboxes = [];

      var callbackArgs = {
        "grid": _grid,
        "menu": $menu,
        "allColumns": columns,
        "visibleColumns": getVisibleColumns()
      };

      // run the override function (when defined), if the result is false it won't go further
      if (!runOverrideFunctionWhenExists(_options.gridMenu.menuUsabilityOverride, callbackArgs)) {
        return;
      }

      // notify of the onBeforeMenuShow only works when it's a jQuery event (as per slick.core code)
      // this mean that we cannot notify when the grid menu is attach to a button event
      if (typeof e.isPropagationStopped === "function") {
        if (_self.onBeforeMenuShow.notify(callbackArgs, e, _self) == false) {
          return;
        }
      }

      var $li, $input, columnId, excludeCssClass;
      for (var i = 0; i < columns.length; i++) {
        columnId = columns[i].id;
        excludeCssClass = columns[i].excludeFromGridMenu ? "hidden" : "";
        $li = $('<li class="' + excludeCssClass + '" />').appendTo($list);

        $input = $("<input type='checkbox' id='gridmenu-colpicker-" + columnId + "' />").data("column-id", columns[i].id).appendTo($li);
        columnCheckboxes.push($input);

        if (_grid.getColumnIndex(columns[i].id) != null) {
          $input.attr("checked", "checked");
        }

        $("<label for='gridmenu-colpicker-" + columnId + "' />")
          .html(columns[i].name)
          .appendTo($li);
      }

      if (_options.gridMenu && (!_options.gridMenu.hideForceFitButton || !_options.gridMenu.hideSyncResizeButton)) {
        $("<hr/>").appendTo($list);
      }

      if (!(_options.gridMenu && _options.gridMenu.hideForceFitButton)) {
        var forceFitTitle = (_options.gridMenu && _options.gridMenu.forceFitTitle) || _defaults.forceFitTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' id='gridmenu-colpicker-forcefit' />").data("option", "autoresize").appendTo($li);
        $("<label for='gridmenu-colpicker-forcefit' />").text(forceFitTitle).appendTo($li);

        if (_grid.getOptions().forceFitColumns) {
          $input.attr("checked", "checked");
        }
      }

      if (!(_options.gridMenu && _options.gridMenu.hideSyncResizeButton)) {
        var syncResizeTitle = (_options.gridMenu && _options.gridMenu.syncResizeTitle) || _defaults.syncResizeTitle;
        $li = $("<li />").appendTo($list);
        $input = $("<input type='checkbox' id='gridmenu-colpicker-syncresize' />").data("option", "syncresize").appendTo($li);
        $("<label for='gridmenu-colpicker-syncresize' />").text(syncResizeTitle).appendTo($li);

        if (_grid.getOptions().syncColumnCellResize) {
          $input.attr("checked", "checked");
        }
      }

      $menu
        .css("top", e.pageY + 10)
        .css("left", e.pageX - $menu.width())
        .css("max-height", $(window).height() - e.pageY - 10)
        .show();

      $list.appendTo($menu);
      _isMenuOpen = true;

      if (typeof e.isPropagationStopped === "function") {
        if (_self.onAfterMenuShow.notify(callbackArgs, e, _self) == false) {
          return;
        }
      }
    }

    function handleBodyMouseDown(e) {
      if (($menu && $menu[0] != e.target && !$.contains($menu[0], e.target) && _isMenuOpen) || e.target.className == "close") {
        hideMenu(e);
      }
    }

    function handleMenuItemClick(e) {
      var command = $(this).data("command");
      var item = $(this).data("item");

      if (item.disabled || item.divider || item === "divider") {
        return;
      }

      // does the user want to leave open the Grid Menu after executing a command?
      var leaveOpen = (_options.gridMenu && _options.gridMenu.leaveOpen) ? true : false;
      if (!leaveOpen) {
        hideMenu(e);
      }

      if (command != null && command != '') {
        var callbackArgs = {
          "grid": _grid,
          "command": command,
          "item": item,
          "allColumns": columns,
          "visibleColumns": getVisibleColumns()
        };
        _self.onCommand.notify(callbackArgs, e, _self);

        // execute action callback when defined
        if (typeof item.action === "function") {
          item.action.call(this, e, callbackArgs);
        }
      }

      // Stop propagation so that it doesn't register as a header click event.
      e.preventDefault();
      e.stopPropagation();
    }

    function hideMenu(e) {
      if ($menu) {
        $menu.hide();
        _isMenuOpen = false;

        var callbackArgs = {
          "grid": _grid,
          "menu": $menu,
          "allColumns": columns,
          "visibleColumns": getVisibleColumns()
        };
        if (_self.onMenuClose.notify(callbackArgs, e, _self) == false) {
          return;
        }
      }
    }

    /** Update the Titles of each sections (command, customTitle, ...) */
    function updateAllTitles(gridMenuOptions) {
      if ($customTitleElm && $customTitleElm.text) {
        $customTitleElm.text(gridMenuOptions.customTitle);
      }
      if ($columnTitleElm && $columnTitleElm.text) {
        $columnTitleElm.text(gridMenuOptions.columnTitle);
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
        if (_grid.getColumnIndex(columns[i].id) === undefined) {
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
          _grid.setOptions({ forceFitColumns: true });
          _grid.autosizeColumns();
        } else {
          _grid.setOptions({ forceFitColumns: false });
        }
        return;
      }

      if ($(e.target).data("option") == "syncresize") {
        if (e.target.checked) {
          _grid.setOptions({ syncColumnCellResize: true });
        } else {
          _grid.setOptions({ syncColumnCellResize: false });
        }
        return;
      }

      if ($(e.target).is(":checkbox")) {
        var visibleColumns = [];
        $.each(columnCheckboxes, function (i) {
          if ($(this).is(":checked")) {
            visibleColumns.push(columns[i]);
          }
        });

        if (!visibleColumns.length) {
          $(e.target).attr("checked", "checked");
          return;
        }

        var callbackArgs = {
          "grid": _grid,
          "allColumns": columns,
          "columns": visibleColumns
        };
        _grid.setColumns(visibleColumns);
        _self.onColumnsChanged.notify(callbackArgs, e, _self);
      }
    }

    init(_grid);

    function getAllColumns() {
      return columns;
    }

    /** visible columns, we can simply get them directly from the grid */
    function getVisibleColumns() {
      return _grid.getColumns();
    }

    /**
     * Method that user can pass to override the default behavior.
     * In order word, user can choose or an item is (usable/visible/enable) by providing his own logic.
     * @param overrideFn: override function callback
     * @param args: multiple arguments provided to the override (cell, row, columnDef, dataContext, grid)
     */
    function runOverrideFunctionWhenExists(overrideFn, args) {
      if (typeof overrideFn === 'function') {
        return overrideFn.call(this, args);
      }
      return true;
    }

    $.extend(this, {
      "init": init,
      "getAllColumns": getAllColumns,
      "getVisibleColumns": getVisibleColumns,
      "destroy": destroy,
      "showGridMenu": showGridMenu,
      "setOptions": setOptions,
      "updateAllTitles": updateAllTitles,

      "onAfterMenuShow": new Slick.Event(),
      "onBeforeMenuShow": new Slick.Event(),
      "onMenuClose": new Slick.Event(),
      "onCommand": new Slick.Event(),
      "onColumnsChanged": new Slick.Event()
    });
  }
})(jQuery);
/*
    SlickGridTable is a wrapper that simplifies the setup process for creating a simple table.

    SlickGrid is an excellent, customizeable tool.  However, initial setup and configuration can be a 
    bit cumbersome.  SlickGridTable helps make the process easier.

    Required scripts:
          jquery.event.drag-2.2.js
          jquery-ui-1.8.16.custom.min.js
          slick.core.js
          slick.grid.js
          slick.checkboxselectcolumn.js
          slick.rowselectionmodel.js
          slick.dataview.js

    Required styles:
        slick.grid.css
        slick-default-theme.css
        jquery-ui-1.8.16.custom.css
*/
var SlickGridTable = (function () {
    var defaults = {
        containerId: "slickGridContainer",
        itemKeyProperty: "Id",
        includeCheckbox: false,
        checkboxBoundProperty: null,
        configs: {
            explicitInitialization: true,
            enableCellNavigation: true,
            enableColumnReorder: false,
            multiColumnSort: true,
            editable: true,
            asyncEditorLoading: false,
            autoEdit: false,
            headerRowHeight: 40,
            showHeaderRow: true,
            forceFitColumns: true,
        },
        defaultSort: {
            property: null,
            isAsc: true
        }
    };
    var columnDefaults = {
      resizable: false,
      sortable: true,
      selectable: false
    };

    var SlickGridTable = function (columns, options) {
        this.setupHandlers();

        this.options = $.extend(true, {}, defaults, options);

        if (!this.options.defaultSort.property) {
            this.options.defaultSort.property = this.options.itemKeyProperty;
        }

        this.columnFilters = [];

        this.columns = [];
        for (var idx = 0; idx < columns.length; idx++) {
            this.columns.push($.extend(true, {}, columnDefaults, columns[idx]));
        }

        var checkboxSelector;
        var checkboxClass = "slick-cell-checkboxsel";
        if (this.options.includeCheckbox) {
            //Configure Checkboxes
            checkboxSelector = new Slick.CheckboxSelectColumn({
                cssClass: checkboxClass 
            });

            this.columns.unshift(checkboxSelector.getColumnDefinition());
        }

        this.dataView = new Slick.Data.DataView();
        this.grid = new Slick.Grid("#" + this.options.containerId, this.dataView, this.columns, this.options.configs);
        this.grid.setSortColumn(this.options.defaultSort.property, this.options.defaultSort.isAsc);

        if (this.options.includeCheckbox) {
            this.grid.setSelectionModel(new Slick.RowSelectionModel({ selectActiveRow: false }));
            this.grid.registerPlugin(checkboxSelector);
            var onSelectedItemsChanged = this.dataView.syncGridSelection(this.grid, true, true);

            if (this.options.checkboxBoundProperty) {
                onSelectedItemsChanged.subscribe(this.onSelectedItemsChangedHandler);
            }
        }

        this.grid.onSort.subscribe(this.onSortHandler);
        this.dataView.onRowCountChanged.subscribe(this.onRowCountChangedHandler);
        this.dataView.onRowsChanged.subscribe(this.onRowsChangedHandler);

        $(this.grid.getHeaderRow()).delegate(":input", "change keyup", this.onFilterKeyUpHandler);

        this.grid.init();
    };

    SlickGridTable.prototype.setupHandlers = function () {
        this.onRowCountChangedHandler = $.proxy(this.updateRowCount, this);
        this.onRowsChangedHandler = $.proxy(this.refreshRows, this);
        this.onSortHandler = $.proxy(this.sortRows, this);
        this.onFilterKeyUpHandler = $.proxy(this.applyFilter, this);
        this.onFilterHandler = $.proxy(this.isFilterMatch, this);
        this.onSelectedItemsChangedHandler = $.proxy(this.updateSelectedProperty, this);
    };

    SlickGridTable.prototype.getData = function(url, inputData) {
        this.deferred = $.Deferred();
        var self = this;
        $.post(url, inputData, function(data) {
            self.dataView.beginUpdate();
            self.dataView.setItems(data, self.options.itemKeyProperty);
            self.dataView.setFilter(self.onFilterHandler); //TODO: Can this be moved?
            self.dataView.endUpdate();

            $(self.columns).each(function(index, column) {
                if (column.name != "<input type='checkbox'>") {
                    var headerContainer = $(".slick-headerrow-column.r" + index);
                    self.populateFilters(headerContainer, column);
                }
            });
        });

        return this.deferred.promise();
    };
	
    SlickGridTable.prototype.onDataLoadComplete = function(data) {
        this.deferred.resolve(data);
    };

    SlickGridTable.prototype.onDataLoadFailure = function(jqXHR, textError, exception) {
        this.deferred.reject('Error' + exception);
    };

    SlickGridTable.prototype.sortRows = function (e, args) {
        var cols = args.sortCols;
        this.dataView.sort(function(dataRow1, dataRow2) {
            for (var i = 0, l = cols.length; i < l; i++) {
                var field = cols[i].sortCol.field;
                var sign = cols[i].sortAsc ? 1 : -1;
                var value1 = dataRow1[field], value2 = dataRow2[field];
                var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
                if (result != 0) {
                    return result;
                }
            }
            return 0;
        });

        this.grid.invalidate();
        this.grid.render();
    };

    SlickGridTable.prototype.isFilterMatch = function (item) {
    	for (var columnId in this.columnFilters) {
            if (this.columnFilters[columnId] !== "") {
                var column = this.grid.getColumns()[this.grid.getColumnIndex(columnId)];
                if (column && item[column.field] != this.columnFilters[columnId]) {
                    return false;
                }
            }
        }
        return true;
    };

    SlickGridTable.prototype.applyFilter = function (e) {
        var target = $(e.currentTarget);
        var columnId = target.data("columnId");
        if (columnId != null) {
            this.columnFilters[columnId] = $.trim(target.val());
            this.dataView.refresh();
        }
    };

    SlickGridTable.prototype.updateRowCount = function (e, args) {
        this.grid.updateRowCount();
        this.grid.render();
    };

    SlickGridTable.prototype.refreshRows = function(e, args) {
        this.grid.invalidateRows(args.rows);
        this.grid.render();
    };

    SlickGridTable.prototype.populateFilters = function (containerDiv, column) {
        var propertyName = column.id;
        var colWidth = column.width;

        var filterOptions = [];
        //Iterate through each item in the row
        $.each(this.dataView.getItems(), function(index, row) {
            var value = row[propertyName];
            if (value !== undefined && value != "" && $.inArray(value, filterOptions) == -1) {
                filterOptions.push(value);
            }
        });

        var output = [];
        filterOptions.sort();
        filterOptions.unshift("");
        $.each(filterOptions, function(index, value) {
            output.push('<option value="' + value + '">' + value + '</option>');
        });

        var selectTag = $("<select>").data("columnId", propertyName).val(this.columnFilters[propertyName]);
        selectTag.css("width", colWidth * .93);
        selectTag.html(output.join(""));
        selectTag.appendTo(containerDiv);
    };

    SlickGridTable.prototype.updateSelectedProperty = function (e, args) {
        $(this.dataView.getItems()).each($.proxy(function(idx, item) {
            item[this.options.checkboxBoundProperty] = false;
        }, this));

        $(args.ids).each($.proxy(function (idx, itemId) {
            var item = this.dataView.getItemById(itemId);
            item[this.options.checkboxBoundProperty] = true;
        }, this));
    };

    return SlickGridTable;
})();

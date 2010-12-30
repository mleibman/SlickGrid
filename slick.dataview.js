(function($) {
    $.extend(true, window, {
        Slick: {
            Data: {
                DataView: DataView,
                Aggregators: {
                    Avg: AvgAggregator,
                    Min: MinAggregator,
                    Max: MaxAggregator
                }
            }
        }
    });


    /***
     * A sample Model implementation.
     * Provides a filtered view of the underlying data.
     *
     * Relies on the data item having an "id" property uniquely identifying it.
     */
    function DataView() {
        var self = this;

        // private
        var idProperty = "id";  // property holding a unique row id
        var items = [];			// data by index
        var rows = [];			// data by row
        var idxById = {};		// indexes by id
        var rowsById = null;	// rows by id; lazy-calculated
        var filter = null;		// filter function
        var updated = null; 	// updated item ids
        var suspend = false;	// suspends the recalculation
        var sortComparer;
        var groupingGetter;
        var groupingFormatter;
        var groupingComparer;
        var collapsedGroups = {};
        var aggregators;
        var aggregateCollapsed = false;

        var pagesize = 0;
        var pagenum = 0;
        var totalRows = 0;

        // events
        var onRowCountChanged = new Slick.Event();
        var onRowsChanged = new Slick.Event();
        var onPagingInfoChanged = new Slick.Event();


        function beginUpdate() {
            suspend = true;
        }

        function endUpdate() {
            suspend = false;
            refresh();
        }

        function refreshIdxById() {
            idxById = {};
            for (var i = 0,l = items.length; i < l; i++) {
                var id = items[i][idProperty];
                if (id == undefined || idxById[id] != undefined)
                    throw "Each data element must implement a unique 'id' property";
                idxById[id] = i;
            }
        }

        function getItems() {
            return items;
        }

        function setItems(data, objectIdProperty) {
            if (objectIdProperty !== undefined) idProperty = objectIdProperty;
            items = data;
            refreshIdxById();
            refresh();
        }

        function setPagingOptions(args) {
            if (args.pageSize != undefined)
                pagesize = args.pageSize;

            if (args.pageNum != undefined)
                pagenum = Math.min(args.pageNum, Math.ceil(totalRows / pagesize));

            onPagingInfoChanged.notify(getPagingInfo(), null, self);

            refresh();
        }

        function getPagingInfo() {
            return {pageSize:pagesize, pageNum:pagenum, totalRows:totalRows};
        }

        function getCombinedComparer(groupingCmp, cmp) {
            if (!groupingCmp) {
                return cmp;
            }
            else {
                return function combinedComparer(a ,b) {
                    return groupingCmp(groupingGetter(a), groupingGetter(b)) || (cmp && cmp(a, b)) || 0;
                }
            }
        }

        function sort(comparer) {
            sortComparer = comparer;
            var combinedComparer = getCombinedComparer(groupingComparer, comparer);
            if (combinedComparer) {
                items.sort(combinedComparer);
                refreshIdxById();
                refresh();
            }
        }

        function reSort() {
            if (groupingGetter || sortComparer) {
                sort(sortComparer);
            }
        }

        function setFilter(filterFn) {
            filter = filterFn;
            refresh();
        }

        function groupBy(valueGetter, valueFormatter, sortComparer) {
            groupingGetter = valueGetter;
            groupingFormatter = valueFormatter;
            groupingComparer = sortComparer;
            collapsedGroups = {};
            reSort();
            refresh();
        }

        function setAggregators(groupAggregators, includeCollapsed) {
            aggregators = groupAggregators;
            aggregateCollapsed = includeCollapsed !== undefined ? includeCollapsed : aggregateCollapsed;
            refresh();
        }

        function getItemByIdx(i) {
            return items[i];
        }

        function getIdxById(id) {
            return idxById[id];
        }

        // calculate the lookup table on first call
        function getRowById(id) {
            if (!rowsById) {
                rowsById = {};
                for (var i = 0, l = rows.length; i < l; ++i) {
                    rowsById[rows[i][idProperty]] = i;
                }
            }

            return rowsById[id];
        }

        function getItemById(id) {
            return items[idxById[id]];
        }

        function updateItem(id, item) {
            if (idxById[id] === undefined || id !== item[idProperty])
                throw "Invalid or non-matching id";
            items[idxById[id]] = item;
            if (!updated) updated = {};
            updated[id] = true;
            refresh();
        }

        function insertItem(insertBefore, item) {
            items.splice(insertBefore, 0, item);
            refreshIdxById();  // TODO:  optimize
            refresh();
        }

        function addItem(item) {
            items.push(item);
            refreshIdxById();  // TODO:  optimize
            refresh();
        }

        function deleteItem(id) {
            if (idxById[id] === undefined)
                throw "Invalid id";
            items.splice(idxById[id], 1);
            refreshIdxById();  // TODO:  optimize
            refresh();
        }

        function getLength() {
            return rows.length;
        }

        function getItem(i) {
            return rows[i];
        }

        function collapseGroup(groupingValue) {
            collapsedGroups[groupingValue] = true;
            refresh();
        }

        function expandGroup(groupingValue) {
            delete collapsedGroups[groupingValue];
            refresh();
        }

        function getGroupingValue(item) {
            if (typeof groupingGetter === "function") {
                return groupingGetter(item);
            }
            else {
                return item[groupingGetter];
            }
        }

        function getGroups(rows) {
            var group;
            var val;
            var groups = [];

            for (var i = 0, l = rows.length; i < l; i++) {
                val = getGroupingValue(rows[i]);
                if (!group || group.value !== val) {
                    if (group) {
                        group.end = i - 1;
                        group.count = group.end - group.start + 1;
                        group.title = groupingFormatter ? groupingFormatter(group) : group.value;
                    }

                    group = new Slick.Group();
                    group.value = val;
                    group.start = i;
                    group.collapsed = (val in collapsedGroups);
                    groups.push(group);
                }
            }
            if (group) {
                group.end = rows.length - 1;
                group.count = group.end - group.start + 1;
                group.title = groupingFormatter ? groupingFormatter(group) : group.value;
            }

            return groups;
        }


        function flattenGroupedRows(groups, rows) {
            var groupedRows = [], gl = 0, idx, totals;
            for (var i = 0, l = groups.length; i < l; i++) {
                var g = groups[i];
                groupedRows[gl++] = g;

                if (aggregators) {
                    idx = aggregators.length;
                    while (idx--) {
                        aggregators[idx].init();
                    }
                }

                for (var j = g.start; j <= g.end; j++) {
                    if (aggregators) {
                        idx = aggregators.length;
                        while (idx--) {
                            aggregators[idx].accumulate(rows[j]);
                        }
                    }
                    if (!g.collapsed) {
                        groupedRows[gl++] = rows[j];
                    }
                }

                if (aggregators && (!g.collapsed || aggregateCollapsed)) {
                    totals = new Slick.GroupTotals();
                    idx = aggregators.length;
                    while (idx--) {
                        aggregators[idx].storeResult(totals);
                    }
                    groupedRows[gl++] = totals;
                }
            }
            return groupedRows;
        }

        function recalc(_items, _rows, _filter, _updated) {
            var diff = [];

            rowsById = null;

            // go over all items remapping them to rows on the fly
            // while keeping track of the differences and updating indexes
            var pageStartRow = pagesize * pagenum;
            var pageEndRow = pageStartRow + pagesize;
            var item,id;
            var newRows = [];
            var il = _items.length;
            var rl = _rows.length;
            var itemIdx = 0, rowIdx = 0;

            // filter the data and get the current page if paging
            if (_filter) {
                for (var i = 0; i < il; ++i) {
                    item = _items[i];
                    if (_filter(item)) {
                        if (!pagesize || (itemIdx >= pageStartRow && itemIdx < pageEndRow)) {
                            newRows[rowIdx] = item;
                            rowIdx++;
                        }
                        itemIdx++;
                    }
                }
            }
            else {
                newRows = _items.concat();
                itemIdx = il;
            }

            if (groupingGetter != null) {
                var groups = getGroups(newRows);
                if (groups.length) {
                    newRows = flattenGroupedRows(groups, newRows);
                }
            }

            for (var i = 0, nrl = newRows.length, r; i < nrl; i++) {
                item = newRows[i];
                r = _rows[i];

                if (i >= rl ||
                    (groupingGetter &&
                        (item instanceof Slick.Group !== r instanceof Slick.Group ||
                        (item instanceof Slick.Group && !item.equals(r)))) ||
                    (aggregators &&
                        // no good way to compare totals since they are arbitrary DTOs
                        // deep object comparison is pretty expensive
                        // always considering them 'dirty' seems easier for the time being
                        (item instanceof Slick.GroupTotals || r instanceof Slick.GroupTotals)) ||
                    item[idProperty] != r[idProperty] ||
                    (_updated && _updated[item[idProperty]])) {
                    diff[diff.length] = i;
                }
            }

            rows = newRows;
            totalRows = itemIdx;

            return diff;
        }

        function refresh() {
            if (suspend) return;

            var countBefore = rows.length;
            var totalRowsBefore = totalRows;

            var diff = recalc(items, rows, filter, updated); // pass as direct refs to avoid closure perf hit

            // if the current page is no longer valid, go to last page and recalc
            // we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
            if (pagesize && totalRows < pagenum * pagesize) {
                pagenum = Math.floor(totalRows / pagesize);
                diff = recalc(items, rows, filter, updated);
            }

            updated = null;

            if (totalRowsBefore != totalRows) onPagingInfoChanged.notify(getPagingInfo(), null, self);
            if (countBefore != rows.length) onRowCountChanged.notify({previous:countBefore, current:rows.length}, null, self);
            if (diff.length > 0) onRowsChanged.notify({rows:diff}, null, self);
        }


        return {
            // methods
            "beginUpdate":      beginUpdate,
            "endUpdate":        endUpdate,
            "setPagingOptions": setPagingOptions,
            "getPagingInfo":    getPagingInfo,
            "getItems":         getItems,
            "setItems":         setItems,
            "setFilter":        setFilter,
            "sort":             sort,
            "reSort":           reSort,
            "groupBy":          groupBy,
            "setAggregators":   setAggregators,
            "collapseGroup":    collapseGroup,
            "expandGroup":      expandGroup,
            "getIdxById":       getIdxById,
            "getRowById":       getRowById,
            "getItemById":      getItemById,
            "getItemByIdx":     getItemByIdx,
            "refresh":          refresh,
            "updateItem":       updateItem,
            "insertItem":       insertItem,
            "addItem":          addItem,
            "deleteItem":       deleteItem,

            "getLength":        getLength,
            "getItem":          getItem,

            // events
            "onRowCountChanged":    onRowCountChanged,
            "onRowsChanged":        onRowsChanged,
            "onPagingInfoChanged":  onPagingInfoChanged
        };
    }




    function AvgAggregator(field) {
        this.init = function() {
            this.count = 0;
            this.nonNullCount = 0;
            this.sum = 0;
        };

        this.accumulate = function(item) {
            var val = item[field];
            this.count++;
            if (val != null && val != NaN) {
                this.nonNullCount++;
                this.sum += parseFloat(val);
            }
        };

        this.storeResult = function(groupTotals) {
            if (!groupTotals.avg) {
                groupTotals.avg = {};
            }
            if (this.nonNullCount != 0) {
                groupTotals.avg[field] = this.sum / this.nonNullCount;
            }
        };
    }


    function MinAggregator(field) {
        this.init = function() {
            this.min = null;
        };

        this.accumulate = function(item) {
            var val = item[field];
            if (val != null && val != NaN) {
                if (this.min == null ||val < this.min) {
                    this.min = val;
                }
            }
        };

        this.storeResult = function(groupTotals) {
            if (!groupTotals.min) {
                groupTotals.min = {};
            }
            groupTotals.min[field] = this.min;
        }
    }

    function MaxAggregator(field) {
        this.init = function() {
            this.max = null;
        };

        this.accumulate = function(item) {
            var val = item[field];
            if (val != null && val != NaN) {
                if (this.max == null ||val > this.max) {
                    this.max = val;
                }
            }
        };

        this.storeResult = function(groupTotals) {
            if (!groupTotals.max) {
                groupTotals.max = {};
            }
            groupTotals.max[field] = this.max;
        }
    }

    // TODO:  add more built-in aggregators
    // TODO:  merge common aggregators in one to prevent needles iterating

})(jQuery);
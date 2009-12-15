/***
 * A simple observer pattern implementation.
 */
function EventHelper() {
	this.handlers = [];
	
	this.subscribe = function(fn) {
		this.handlers.push(fn);
	}
	
	this.notify = function(args) {
		for (var i = 0; i < this.handlers.length; i++) {
			this.handlers[i].call(this, args);
		}
	}
	
	return this;
}
	


/***
 * A sample Model implementation.
 * Provides a filtered view of the underlying data.
 * 
 * Relies on the data item having an "id" property uniquely identifying it.
 */
function DataView() {
	var self = this;
	
	// private
	var items = [];			// data by index
	var rows = [];			// data by row
	var idxById = {};		// indexes by id
	var filter = null;		// filter function
	var updated = null; 	// updated item ids
	var suspend = false;	// suspends the recalculation
	
	var pagesize = 0;
	var pagenum = 0;
	var totalRows = 0;
	
	// events
	var onRowCountChanged = new EventHelper();
	var onRowsChanged = new EventHelper();
	var onPagingInfoChanged = new EventHelper();
	
	
	function beginUpdate() {
		suspend = true;
	}
	
	function endUpdate() {
		suspend = false;
		refresh();
	}
	
	function setItems(data) {
		items = data.concat();
		for (var i=0,l=items.length; i<l; i++) {
			var id = items[i].id;
			if (id == undefined || idxById[id] != undefined)
				throw "Each data element must implement a unique 'id' property";
			idxById[id] = i;			
		}
		refresh();
	}
	
	function setPagingOptions(args) {
		if (args.pageSize != undefined)
			pagesize = args.pageSize;
			
		if (args.pageNum != undefined)
			pagenum = Math.min(args.pageNum, Math.ceil(totalRows/pagesize));

		onPagingInfoChanged.notify(getPagingInfo());

		refresh();
	}
	
	function getPagingInfo() {
		return {pageSize:pagesize, pageNum:pagenum, totalRows:totalRows};
	}
	
	function sort(comparer) {
		items.sort(comparer);
		refresh();
	}
	
	function setFilter(filterFn) {
		filter = filterFn;
		refresh();
	}
	
	function getIdxById(id) {
		return idxById[id];
	}
	
	// slow implementation in favor of fast refresh()
	function getRowById(id) {
		for (var i=0,l=rows.length; i<l; ++i) {
			if (rows[i].id == id) return i;
		}
	}
	
	function getItemById(id) {
		return items[idxById[id]];
	}
	
	function updateItem(id,item) {
		items[idxById[id]] = item;
		if (!updated) updated = {};
		updated[id] = true;
		refresh();
	}
	
	function insertItem(insertBefore,item) {
		items.splice(insertBefore,0,item);
		refresh();
	}
	
	function addItem(item) {
		items.push(item);
		refresh();
	}
	
	function deleteItem(id) {
		items.splice(idxById[id],1);
		refresh();
	}
	
	function reduce() {
		console.log("reduce")
		console.time("reduce")
		var _rows = rows, _filter = filter;
		
		// go over all items remapping them to _rows on the fly 
		// while keeping track of the differences and updating indexes
		var rl = _rows.length;
		var countBefore = _rows.length;
		var totalRowsBefore = totalRows;		
		var currentPageIndex = 0;
		var diff = [];

		if (rl == 0) return [];
		
		for (var i = 0; i < rl; ++i) {
			var item = _rows[i];
			if (_filter(item)) {
				if (i != currentPageIndex) {
					diff[diff.length] = currentPageIndex;
					_rows[currentPageIndex] = item;
				}
				++currentPageIndex;
			}
		}
		
		if (rl > currentPageIndex)
			_rows.splice(currentPageIndex, rl - currentPageIndex);

		// TODO:  add matching _rows that were excluded because they didn't fit in the page
		
		if (!pagesize && currentPageIndex < pagesize) {
			for (var i=idxById[_rows[currentPageIndex-1].id], il=_items.length; i<il; ++i) {
				var item = _items[i];
				
				if (_filter(item)) {
					if (currentRowIndex >= pagesize * pagenum && currentRowIndex < pagesize * (pagenum + 1)) {
						diff[diff.length] = currentPageIndex;
						
						rows[currentPageIndex] = item;
						currentPageIndex++;
					}
					
					currentRowIndex++;
				}
			}
		}

		totalRows = currentPageIndex;
		
		
		if (totalRowsBefore != totalRows) onPagingInfoChanged.notify(getPagingInfo());
		if (countBefore != _rows.length) onRowCountChanged.notify({previous:countBefore, current:_rows.length});
		if (diff.length > 0 || countBefore != _rows.length) onRowsChanged.notify(diff);
		
		console.timeEnd("reduce")
	}
	
	function expand() {
		console.log("expand")
		console.time("expand")
		// TODO:  implement
		
		// fall back to a full refresh for now
		refresh();
		
		console.timeEnd("expand")
	}
	
	function recalc(_items,_rows,_filter,_updated) {
		var diff = [];
		var items=_items, rows=_rows, filter=_filter, updated=_updated; // cache as local vars
		
		// go over all items remapping them to rows on the fly 
		// while keeping track of the differences and updating indexes
		var rl = rows.length;
		var currentRowIndex = 0;
		var currentPageIndex = 0;
		var item,id;
	
		for (var i = 0, il = items.length; i < il; ++i) {
			item = items[i];
			id = item.id;
			
			if (!filter || filter(item)) {
				if (!pagesize || (currentRowIndex >= pagesize * pagenum && currentRowIndex < pagesize * (pagenum + 1))) {
					if (currentPageIndex >= rl || id != rows[currentPageIndex].id || (updated && updated[id]))
						diff[diff.length] = currentPageIndex;
					
					rows[currentPageIndex] = item;
					currentPageIndex++;
				}
				
				currentRowIndex++;
			}
		}
		
		if (rl > currentPageIndex)
			rows.splice(currentPageIndex, rl - currentPageIndex);
		
		totalRows = currentRowIndex;
		updated = null;
		
		return diff;
	}
	
	function refresh() {
		if (suspend) return;
		
		var countBefore = rows.length;
		var totalRowsBefore = totalRows;
		
		var diff = recalc(items,rows,filter,updated); // pass as direct refs to avoid closure perf hit
		
		// if the current page is no longer valid, go to last page and recalc
		// we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
		if (pagesize && totalRows < pagenum*pagesize) {
			pagenum = Math.floor(totalRows/pagesize);
			diff = recalc(items,rows,filter,updated);
		}
		
		if (totalRowsBefore != totalRows) onPagingInfoChanged.notify(getPagingInfo());
		if (countBefore != rows.length) onRowCountChanged.notify({previous:countBefore, current:rows.length});
		if (diff.length > 0 || countBefore != rows.length) onRowsChanged.notify(diff);
	}
	

	
	return {
		// properties
		"rows":			rows,			// note: neither the array or the data in it should be modified directly
		
		// methods
		"beginUpdate":	beginUpdate,	
		"endUpdate":	endUpdate,
		"setPagingOptions":	setPagingOptions,
		"getPagingInfo": getPagingInfo,
		"setItems":		setItems,
		"setFilter":	setFilter,
		"sort":			sort,
		"getIdxById":	getIdxById,
		"getRowById":	getRowById,
		"getItemById":	getItemById,
		"refresh":		refresh,
		"reduce":		reduce,
		"expand":		expand,
		"updateItem":	updateItem,
		"insertItem":	insertItem,
		"addItem":		addItem,
		"deleteItem":	deleteItem,
		
		// events
		"onRowCountChanged":	onRowCountChanged,
		"onRowsChanged":		onRowsChanged,
		"onPagingInfoChanged":	onPagingInfoChanged
	};
}

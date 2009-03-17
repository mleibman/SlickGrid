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
	var rowsByIdx = {};		// rows by index
	var filter = null;		// filter function
	var updated = []; 		// updated item ids
	
	// events
	var onRowCountChanged = new EventHelper();
	var onRowsChanged = new EventHelper();
	
	
	
	function setItems(data) {
		items = data.concat();
		refresh();
	}
	
	function sort(comparer) {
		items.sort(comparer);
		refresh();
	}
	
	function setFilter(filterFn) {
		filter = filterFn;
		refresh();
	}
	
	function getItemById(id) {
		return items[idxById[id]];
	}
	
	function getDiff(arrayA, arrayB) {
		var diff = [];
		
		for (var i = 0; i < Math.min(arrayA.length, arrayB.length); i++) {
			if (arrayA[i].id != arrayB[i].id) {
				diff.push(i);
			}
		}
		
		if (arrayA.length > arrayB.length) {
			for (var i = arrayB.length; i < arrayA.length; i++) {
				diff.push(i);
			}
		}
		
		if (arrayB.length > arrayA.length) {
			for (var i = arrayA.length; i < arrayB.length; i++) {
				diff.push(i);
			}
		}
		
		return diff;
	}
	
	function recalc() {
		var tmp = [];
		
		for (var idx = 0; idx < items.length; idx++) {
			var item = items[idx];
			if (!filter || filter(item)) tmp.push(item);
		}
		
		// replace contents without changing the reference
		rows.splice(0, rows.length);
		for (var i=0; i<tmp.length; i++)
			rows.push(tmp[i]);
		
		idxById = {};
		rowsByIdx = {};
		
		for (var i=0; i<items.length; i++)
		{
			idxById[items[i].id] = i;
		}
		
		for (var i = 0; i < rows.length; i++) {
			rowsByIdx[idxById[rows[i].id]] = i;
		}
	}
	
	function refresh() {
		var countBefore = rows.length;
		var rowsBefore = rows.concat();
		
		recalc();
		
		var diff = getDiff(rowsBefore, rows);
		
		for (var i = 0; i < updated.length; i++) {
			var row = rowsByIdx[idxById[updated[i]]];
			if (row != undefined) diff.push(row);
		}
		
		diff = $.unique(diff);
		
		if (countBefore != rows.length) onRowCountChanged.notify(null);
		if (diff.length > 0) onRowsChanged.notify(diff);
		
		updated = [];
	}
	

	
	return {
		"rows":			rows,
		"setItems":		setItems,
		"setFilter":	setFilter,
		"sort":			sort,
		"getItemById":	getItemById,
		"refresh":		refresh,
		"onRowCountChanged":	onRowCountChanged,
		"onRowsChanged":		onRowsChanged
	};
}

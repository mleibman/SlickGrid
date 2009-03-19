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
	var updated = null; 	// updated item ids
	
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

	function recalc() {
		var diff = [];
		idxById = {};
		rowsByIdx = {};
		
		// go over all items remapping them to rows on the fly while keeping track of the differences
		var il = items.length;
		var rl = rows.length;
		var l = 0;
		var i = 0;
		while (i < il) {
			var item = items[i];

			idxById[item.id] = i;

			if (!filter || filter(item)) {				
				if (l >= rl || item.id != rows[l].id || (updated && updated[item.id])) {
					diff.push(l);
					rows[l] = item;
				}

				rowsByIdx[i] = l;
				
				l++;
			}
			
			i++;
		}

		// remove unmapped portion
		rows.splice(l,rows.length-l);
		
		updated = null;
		
		return diff;
	}
	
	function refresh() {
		var countBefore = rows.length;
		
		var diff = recalc();
		
		if (countBefore != rows.length) onRowCountChanged.notify({previous:countBefore, current:rows.length});
		if (diff.length > 0 || countBefore != rows.length) onRowsChanged.notify(diff);
	}
	

	
	return {
		"rows":			rows,			// note: neither the array or the data in it should really be modified directly
		"setItems":		setItems,
		"setFilter":	setFilter,
		"sort":			sort,
		"getItemById":	getItemById,
		"refresh":		refresh,
		"updateItem":	updateItem,
		"insertItem":	insertItem,
		"addItem":		addItem,
		"deleteItem":	deleteItem,
		"onRowCountChanged":	onRowCountChanged,
		"onRowsChanged":		onRowsChanged
	};
}

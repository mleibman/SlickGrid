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
	var rowsByIdx = [];		// rows by index
	var filter = null;		// filter function
	var updated = null; 	// updated item ids
	var suspend = false;	// suspends the recalculation
	
	// events
	var onRowCountChanged = new EventHelper();
	var onRowsChanged = new EventHelper();
	
	
	function beginUpdate() {
		suspend = true;
	}
	
	function endUpdate() {
		suspend = false;
		refresh();
	}
	
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
		
		// go over all items remapping them to rows on the fly 
		// while keeping track of the differences and updating indexes
		var rl = rows.length;
		var l = 0;
		var item,id;

		for (var i=0, il=items.length; i<il; i++) {
			item = items[i];
			id = item.id;

			idxById[id] = i;

			if (!filter || filter(item)) {				
				if (l >= rl || id != rows[l].id || (updated && updated[id])) {
					diff.push(l);
					rows[l] = item;
					rowsByIdx[i] = l;
				}

				l++;
			}
		}

		// remove unmapped portion
		if (rl > l) {
			rows.splice(l, rl - l);
			rowsByIdx.splice(l, rl - l);
		}
		
		updated = null;
		
		return diff;
	}
	
	function refresh() {
		if (suspend) return;
		
		var countBefore = rows.length;
		var diff = recalc();
		
		if (countBefore != rows.length) onRowCountChanged.notify({previous:countBefore, current:rows.length});
		if (diff.length > 0 || countBefore != rows.length) onRowsChanged.notify(diff);
	}
	

	
	return {
		"rows":			rows,			// note: neither the array or the data in it should really be modified directly
		"beginUpdate":	beginUpdate,	
		"endUpdate":	endUpdate,
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

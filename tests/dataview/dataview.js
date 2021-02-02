(function($) {

module("basic");

function assertEmpty(dv) {
    same(0, dv.getLength(), ".rows is initialized to an empty array");
    same(dv.getItems().length, 0, "getItems().length");
    same(undefined, dv.getIdxById("id"), "getIdxById should return undefined if not found");
    same(undefined, dv.getRowById("id"), "getRowById should return undefined if not found");
    same(undefined, dv.getItemById("id"), "getItemById should return undefined if not found");
    same(undefined, dv.getItemByIdx(0), "getItemByIdx should return undefined if not found");
}

function assertConsistency(dv,idProperty) {
    idProperty = idProperty || "id";
    var items = dv.getItems(),
        filteredOut = 0,
        row,
        id;

    for (var i=0; i<items.length; i++) {
        id = items[i][idProperty];
        same(dv.getItemByIdx(i), items[i], "getItemByIdx");
        same(dv.getItemById(id), items[i], "getItemById");
        same(dv.getIdxById(id), i, "getIdxById");

        row = dv.getRowById(id);
        if (row === undefined)
            filteredOut++;
        else
            same(dv.getItem(row), items[i], "getRowById");
    }

    same(items.length-dv.getLength(), filteredOut, "filtered rows");
}

test("initial setup", function() {
    var dv = new Slick.Data.DataView();
    assertEmpty(dv);
});

test("initial setup, refresh", function() {
    var dv = new Slick.Data.DataView();
    dv.refresh();
    assertEmpty(dv);
});


module("setItems");

test("empty", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([]);
    assertEmpty(dv);
});

test("basic", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0},{id:1}]);
    same(2, dv.getLength(), "rows.length");
    same(dv.getItems().length, 2, "getItems().length");
    assertConsistency(dv);
});

test("alternative idProperty", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0},{uid:1}], "uid");
    assertConsistency(dv,"uid");
});

test("requires an id on objects", function() {
    var dv = new Slick.Data.DataView();
    try {
        dv.setItems([1,2,3]);
        ok(false, "exception expected")
    }
    catch (ex) {}
});

test("requires a unique id on objects", function() {
    var dv = new Slick.Data.DataView();
    try {
        dv.setItems([{id:0},{id:0}]);
        ok(false, "exception expected")
    }
    catch (ex) {}
});

test("requires a unique id on objects (alternative idProperty)", function() {
    var dv = new Slick.Data.DataView();
    try {
        dv.setItems([{uid:0},{uid:0}], "uid");
        ok(false, "exception expected")
    }
    catch (ex) {}
});

test("events fired on setItems", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.setItems([{id:0},{id:1}]);
    dv.refresh();
    same(3, count, "3 events should have been called");
});

test("no events on setItems([])", function() {
    var dv = new Slick.Data.DataView();
    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.setItems([]);
    dv.refresh();
});

test("no events on setItems followed by refresh", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0},{id:1}]);
    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.refresh();
});

test("no refresh while suspended", function() {
    var dv = new Slick.Data.DataView();
    dv.beginUpdate();
    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.setItems([{id:0},{id:1}]);
    dv.setFilter(function(o) { return true });
    dv.refresh();
    same(dv.getLength(), 0, "rows aren't updated until resumed");
});

test("refresh fires after resume", function() {
    var dv = new Slick.Data.DataView();
    dv.beginUpdate();
    dv.setItems([{id:0},{id:1}]);
    same(dv.getItems().length, 2, "items updated immediately");
    dv.setFilter(function(o) { return true; });
    dv.refresh();

    var count = 0;
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItems().length, 2, "items are the same");
    same(dv.getLength(), 2, "rows updated");
});

module("sort");

test("happy path", function() {
    var count = 0;
    var items = [{id:2,val:2},{id:1,val:1},{id:0,val:0}];
    var dv = new Slick.Data.DataView();
    dv.setItems(items);
    dv.onRowsChanged.subscribe(function() {
        ok(true, "onRowsChanged called");
        count++;
    });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.sort(function(x,y) { return x.val-y.val }, true);
    equal(count, 1, "events fired");
    same(dv.getItems(), items, "original array should get sorted");
    same(items, [{id:0,val:0},{id:1,val:1},{id:2,val:2}], "sort order");
    assertConsistency(dv);
});

test("asc by default", function() {
    var items = [{id:2,val:2},{id:1,val:1},{id:0,val:0}];
    var dv = new Slick.Data.DataView();
    dv.setItems(items);
    dv.sort(function(x,y) { return x.val-y.val });
    same(items, [{id:0,val:0},{id:1,val:1},{id:2,val:2}], "sort order");
});

test("desc", function() {
    var items = [{id:0,val:0},{id:2,val:2},{id:1,val:1}];
    var dv = new Slick.Data.DataView();
    dv.setItems(items);
    dv.sort(function(x,y) { return -1*(x.val-y.val) });
    same(items, [{id:2,val:2},{id:1,val:1},{id:0,val:0}], "sort order");
});

test("sort is stable", function() {
    var items = [{id:0,val:0},{id:2,val:2},{id:3,val:2},{id:1,val:1}];
    var dv = new Slick.Data.DataView();
    dv.setItems(items);

    dv.sort(function(x,y) { return x.val-y.val });
    same(items, [{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:2}], "sort order");

    dv.sort(function(x,y) { return x.val-y.val });
    same(items, [{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:2}], "sorting on the same column again doesn't change the order");

    dv.sort(function(x,y) { return -1*(x.val-y.val) });
    same(items, [{id:2,val:2},{id:3,val:2},{id:1,val:1},{id:0,val:0}], "sort order");
});


module("filtering");

test("applied immediately", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 1, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 1, "totalRows arg");
        count++;
    });
    dv.setFilter(function(o) { return o.val === 1; });
    equal(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 1, "rows are filtered");
    assertConsistency(dv);
});

test("re-applied on refresh", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilterArgs(0);
    dv.setFilter(function(o, args) { return o.val >= args; });
    same(dv.getLength(), 3, "nothing is filtered out");
    assertConsistency(dv);

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 1, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 1, "totalRows arg");
        count++;
    });
    dv.setFilterArgs(2);
    dv.refresh();
    equal(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 1, "rows are filtered");
    assertConsistency(dv);
});

test("re-applied on sort", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) { return o.val === 1; });
    same(dv.getLength(), 1, "one row is remaining");

    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.sort(function(x,y) { return x.val-y.val; }, false);
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 1, "rows are filtered");
    assertConsistency(dv);
});

test("all", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 0, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 0, "totalRows arg");
        count++;
    });
    dv.setFilter(function(o) { return false; });
    equal(count, 2, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 0, "rows are filtered");
    assertConsistency(dv);
});

test("all then none", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilterArgs(false);
    dv.setFilter(function(o, args) { return args; });
    same(dv.getLength(), 0, "all rows are filtered out");

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.setFilterArgs(true);
    dv.refresh();
    equal(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 3, "all rows are back");
    assertConsistency(dv);
});

test("inlining replaces absolute returns", function() {
    var dv = new Slick.Data.DataView({ inlineFilters: true });
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) {
        if (o.val === 1) { return true; }
        else if (o.val === 4) { return true }
        return false});
    same(dv.getLength(), 1, "one row is remaining");

    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 1, "rows are filtered");
    assertConsistency(dv);
});

test("inlining replaces evaluated returns", function() {
    var dv = new Slick.Data.DataView({ inlineFilters: true });
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) {
        if (o.val === 0) { return o.id === 2; }
        else if (o.val === 1) { return o.id === 2 }
        return o.val === 2});
    same(dv.getLength(), 1, "one row is remaining");

    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.getLength(), 1, "rows are filtered");
    assertConsistency(dv);
});

module("updateItem");

test("basic", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });

    dv.updateItem(1,{id:1,val:1337});
    equal(count, 1, "events fired");
    same(dv.getItem(1), {id:1,val:1337}, "item updated");
    assertConsistency(dv);
});

test("updating an item not passing the filter", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:1337}]);
    dv.setFilter(function(o) { return o["val"] !== 1337; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(false, "onRowsChanged called");
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    dv.updateItem(3,{id:3,val:1337});
    same(dv.getItems()[3], {id:3,val:1337}, "item updated");
    assertConsistency(dv);
});

test("updating an item to pass the filter", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:1337}]);
    dv.setFilter(function(o) { return o["val"] !== 1337; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.updateItem(3,{id:3,val:3});
    equal(count, 3, "events fired");
    same(dv.getItems()[3], {id:3,val:3}, "item updated");
    assertConsistency(dv);
});

test("updating an item to not pass the filter", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:3}]);
    dv.setFilter(function(o) { return o["val"] !== 1337; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 4, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.updateItem(3,{id:3,val:1337});
    equal(count, 3, "events fired");
    same(dv.getItems()[3], {id:3,val:1337}, "item updated");
    assertConsistency(dv);
});

test("with bulk suspend", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    dv.beginUpdate(true);
    debugger;
    dv.updateItem(1,{id:1,val:1337});
    equal(count, 0, "events fired");
    same(dv.getItem(1), {id:1,val:1}, "item updated");
    dv.endUpdate();
    same(dv.getItem(1), {id:1,val:1337}, "item updated");
    equal(count, 1, "events fired");
    assertConsistency(dv);
});

module("updateItems");

test("basic", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:3},{id:4,val:4}]);

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    var newItems = [{id:1,val:1337},{id:2,val:4711}];
    dv.updateItems([1,2], newItems);
    equal(count, 1, "events fired");
    same(dv.getItem(1), newItems[0], "item updated");
    same(dv.getItem(2), newItems[1], "item updated");
    assertConsistency(dv);
});

test("length mismatch", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:3},{id:4,val:4}]);
    try {
        dv.updateItems([1], [{id:1,val:1337},{id:1,val:4711}]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("updating an item not passing the filter", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:1337},{id:4,val:4711},{id:5,val:5}]);
    dv.setFilter(function(o) { return o["val"] !== 1337 && o["val"] !== 4711; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(false, "onRowsChanged called");
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711}];
    dv.updateItems([3,4], newItems);
    same(dv.getItems()[3], newItems[0], "item updated");
    same(dv.getItems()[4], newItems[1], "item updated");
    assertConsistency(dv);
});

test("updating an item to pass the filter", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:1337},{id:4,val:4711},{id:5,val:5}]);
    dv.setFilter(function(o) { return o["val"] !== 1337 && o["val"] !== 4711; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 4, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 6, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:3},{id:4,val:4}];
    dv.updateItems([3,4],newItems);
    equal(count, 3, "events fired");
    same(dv.getItems()[3], newItems[0], "item updated");
    same(dv.getItems()[4], newItems[1], "item updated");
    assertConsistency(dv);
});

test("updating an item to not pass the filter", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:3},{id:4,val:4},{id:5,val:5}]);
    dv.setFilter(function(o) { return o["val"] !== 1337 && o["val"] !== 4711; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 6, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 4, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711}];
    dv.updateItems([3,4],newItems);
    equal(count, 3, "events fired");
    same(dv.getItems()[3], newItems[0], "item updated");
    same(dv.getItems()[4], newItems[1], "item updated");
    assertConsistency(dv);
});

test("with bulk suspend", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:3},{id:4,val:4}]);

    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    dv.beginUpdate(true);
    var newItems = [{id:1,val:1337},{id:2,val:4711}];
    dv.updateItems([1,2], newItems);
    equal(count, 0, "events fired");
    same(dv.getItem(1), {id:1,val:1}, "item updated");
    same(dv.getItem(2), {id:2,val:2}, "item updated");
    dv.endUpdate();
    equal(count, 1, "events fired");
    same(dv.getItem(1), newItems[0], "item updated");
    same(dv.getItem(2), newItems[1], "item updated");
    assertConsistency(dv);
});


module("addItem");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.addItem({val:1337});
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,val:0},{uid:1,val:1},{uid:2,val:2}], "uid");
    try {
        dv.addItem({id:3,val:1337});
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("basic", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.addItem({id:3,val:1337});
    equal(count, 3, "events fired");
    same(dv.getItems()[3], {id:3,val:1337}, "item updated");
    same(dv.getItem(3), {id:3,val:1337}, "item updated");
    assertConsistency(dv);
});

test("add an item not passing the filter", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) { return o["val"] !== 1337; });
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(false, "onRowsChanged called");
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(false, "onRowCountChanged called");
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(false, "onPagingInfoChanged called");
    });
    dv.addItem({id:3,val:1337});
    same(dv.getItems()[3], {id:3,val:1337}, "item updated");
    assertConsistency(dv);
});


test("with bulk suspend", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.addItem({id:3,val:1337});
    equal(count, 0, "events fired");
    same(dv.getItems()[3], {id:3,val:1337}, "item updated");
    same(dv.getItem(3), undefined, "item updated");
    same(dv.getIdxById(3), undefined, "index updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(3), {id:3,val:1337}, "item updated");
    same(dv.getIdxById(3), 3, "index updated");
    assertConsistency(dv);
});


module("addItems");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.addItems([{id:3,val:3}, {val:1337}]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,val:0},{uid:1,val:1},{uid:2,val:2}], "uid");
    try {
        dv.addItems([{uid:3,val:3},{id:3,val:1337}]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("basic", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.addItems(newItems);
    equal(count, 3, "events fired");
    same(dv.getItems()[3], newItems[0], "item updated");
    same(dv.getItems()[4], newItems[1], "item updated");
    same(dv.getItems()[5], newItems[2], "item updated");
    same(dv.getItem(3), newItems[0], "item updated");
    same(dv.getItem(4), newItems[1], "item updated");
    same(dv.getItem(5), newItems[2], "item updated");
    assertConsistency(dv);
});

test("with bulk suspend", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.addItems(newItems);
    equal(count, 0, "events fired");
    same(dv.getItems()[3], newItems[0], "item updated");
    same(dv.getItems()[4], newItems[1], "item updated");
    same(dv.getItems()[5], newItems[2], "item updated");
    same(dv.getItem(3), undefined, "item updated");
    same(dv.getItem(4), undefined, "item updated");
    same(dv.getItem(5), undefined, "item updated");
    same(dv.getIdxById(3), undefined, "index updated");
    same(dv.getIdxById(4), undefined, "index updated");
    same(dv.getIdxById(5), undefined, "index updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(3), newItems[0], "item updated");
    same(dv.getItem(4), newItems[1], "item updated");
    same(dv.getItem(5), newItems[2], "item updated");
    same(dv.getIdxById(3), 3, "index updated");
    same(dv.getIdxById(4), 4, "index updated");
    same(dv.getIdxById(5), 5, "index updated");
    assertConsistency(dv);
});

module("insertItem");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.insertItem(0,{val:1337});
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,val:0},{uid:1,val:1},{uid:2,val:2}], "uid");
    try {
        dv.insertItem(0,{id:3,val:1337});
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("insert at the beginning", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.insertItem(0, {id:3,val:1337});
    equal(count, 3, "events fired");
    same(dv.getItem(0), {id:3,val:1337}, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

test("insert at the beginning bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.insertItem(0, {id:3,val:1337});
    equal(count, 0, "events fired");
    same(dv.getItem(0), {id:0,val:0}, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(0), {id:3,val:1337}, "item updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

test("insert in the middle", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2,3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.insertItem(2,{id:3,val:1337});
    equal(count, 3, "events fired");
    same(dv.getItem(2), {id:3,val:1337}, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

test("insert in the middle with bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2,3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.insertItem(2,{id:3,val:1337});
    equal(count, 0, "events fired");
    same(dv.getItem(2), {id:2,val:2}, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(2), {id:3,val:1337}, "item updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

test("insert at the end", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.insertItem(3,{id:3,val:1337});
    equal(count, 3, "events fired");
    same(dv.getItem(3), {id:3,val:1337}, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

test("insert at the end bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 4, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 4, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.insertItem(3,{id:3,val:1337});
    equal(count, 0, "events fired");
    same(dv.getItem(3), undefined, "item updated");
    equal(dv.getItems().length, 4, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(3), {id:3,val:1337}, "item updated");
    equal(dv.getLength(), 4, "rows updated");
    assertConsistency(dv);
});

module("insertItems");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.insertItems(0,[{id:3,val:1337},{val:4711}]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,val:0},{uid:1,val:1},{uid:2,val:2}], "uid");
    try {
        dv.insertItems(0,[{uid:3,val:1337},{id:4,val:4711}]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("insert at the beginning", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(0, newItems);
    equal(count, 3, "events fired");
    same(dv.getItem(0), newItems[0], "item updated");
    same(dv.getItem(1), newItems[1], "item updated");
    same(dv.getItem(2), newItems[2], "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 6, "rows updated");
    assertConsistency(dv);
});

test("insert at the beginning bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(0, newItems);
    equal(count, 0, "events fired");
    same(dv.getItem(0), {id:0,val:0}, "item updated");
    same(dv.getItem(1), {id:1,val:1}, "item updated");
    same(dv.getItem(2), {id:2,val:2}, "item updated");
    same(dv.getItem(4), undefined, "item updated");
    same(dv.getItem(5), undefined, "item updated");
    same(dv.getItem(6), undefined, "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(0), newItems[0], "item updated");
    same(dv.getItem(1), newItems[1], "item updated");
    same(dv.getItem(2), newItems[2], "item updated");
    same(dv.getItem(3), {id:0,val:0}, "item updated");
    same(dv.getItem(4), {id:1,val:1}, "item updated");
    same(dv.getItem(5), {id:2,val:2}, "item updated");
    equal(dv.getLength(), 6, "rows updated");

    assertConsistency(dv);
});

test("insert in the middle", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2,3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(2, newItems);
    equal(count, 3, "events fired");
    same(dv.getItem(2), newItems[0], "item updated");
    same(dv.getItem(3), newItems[1], "item updated");
    same(dv.getItem(4), newItems[2], "item updated");
    same(dv.getItem(5), {id:2,val:2}, "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 6, "rows updated");
    assertConsistency(dv);
});

test("insert in the middle bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2,3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(2, newItems);
    equal(count, 0, "events fired");
    same(dv.getItem(2), {id:2,val:2}, "item updated");
    same(dv.getItem(3), undefined, "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(2), newItems[0], "item updated");
    same(dv.getItem(3), newItems[1], "item updated");
    same(dv.getItem(4), newItems[2], "item updated");
    same(dv.getItem(5), {id:2,val:2}, "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 6, "rows updated");
    assertConsistency(dv);
});

test("insert at the end", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(3, newItems);
    equal(count, 3, "events fired");
    same(dv.getItem(3), newItems[0], "item updated");
    same(dv.getItem(4), newItems[1], "item updated");
    same(dv.getItem(5), newItems[2], "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 6, "rows updated");
    assertConsistency(dv);
});

test("insert at the end bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4,5], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 6, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 6, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    var newItems = [{id:3,val:1337},{id:4,val:4711},{id:5,val:8080}];
    dv.insertItems(3, newItems);
    equal(count, 0, "events fired");
    same(dv.getItem(3), undefined, "item updated");
    same(dv.getItem(4), undefined, "item updated");
    same(dv.getItem(5), undefined, "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    same(dv.getItem(3), newItems[0], "item updated");
    same(dv.getItem(4), newItems[1], "item updated");
    same(dv.getItem(5), newItems[2], "item updated");
    equal(dv.getItems().length, 6, "items updated");
    equal(dv.getLength(), 6, "rows updated");
    assertConsistency(dv);
});

module("deleteItem");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.deleteItem(-1);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(undefined);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(null);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(3);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,id:-1,val:0},{uid:1,id:3,val:1},{uid:2,id:null,val:2}], "uid");
    try {
        dv.deleteItem(-1);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(undefined);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(null);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItem(3);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("delete at the beginning", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.deleteItem(05);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    assertConsistency(dv);
});

test("delete at the beginning bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItem(05);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(0), {id:05,val:0}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    same(dv.getItem(0), {id:15,val:1}, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1, 2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.deleteItem(15);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1, 2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItem(15);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(1), {id:15,val:1}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    same(dv.getItem(1), {id:25,val:2}, "rows updated");
    assertConsistency(dv);
});

test("delete at the end", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.deleteItem(25);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    assertConsistency(dv);
});

test("delete at the end bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 3, "previous arg");
        equal(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItem(25);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(2), {id: 25, val: 2}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 2, "items updated");
    equal(dv.getLength(), 2, "rows updated");
    same(dv.getItem(2), undefined, "rows updated");
    assertConsistency(dv);
});

module("deleteItems");

test("must have id", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    try {
        dv.deleteItems([0, -1]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([undefined]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([null]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([3]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("must have id (custom)", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{uid:0,id:-1,val:0},{uid:1,id:3,val:1},{uid:2,id:null,val:2}], "uid");
    try {
        dv.deleteItems([0, -1]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([undefined]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([null]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
    try {
        dv.deleteItems([3]);
        ok(false, "exception thrown");
    }
    catch (ex) {}
});

test("delete at the beginning", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.deleteItems([05,15]);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    assertConsistency(dv);
});

test("delete at the beginning bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [0,1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItems([05,15]);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 5, "items updated");
    equal(dv.getLength(), 5, "rows updated");
    same(dv.getItem(0), {id:05,val:0}, "rows updated");
    same(dv.getItem(1), {id:15,val:1}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(0), {id:25,val:2}, "rows updated");
    same(dv.getItem(1), {id:35,val:3}, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItems([15,25]);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 5, "items updated");
    equal(dv.getLength(), 5, "rows updated");
    same(dv.getItem(1), {id:15,val:1}, "rows updated");
    same(dv.getItem(2), {id:25,val:2}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(1), {id:35,val:3}, "rows updated");
    same(dv.getItem(2), {id:45,val:4}, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.deleteItems([15,25]);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItems([15,25]);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 5, "items updated");
    equal(dv.getLength(), 5, "rows updated");
    same(dv.getItem(3), {id:35,val:3}, "rows updated");
    same(dv.getItem(4), {id:45,val:4}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(3), undefined, "rows updated");
    same(dv.getItem(4), undefined, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle mixed", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.deleteItems([15,35]);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    assertConsistency(dv);
});

test("delete in the middle mixed bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [1,2,3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItems([15,35]);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 5, "items updated");
    equal(dv.getLength(), 5, "rows updated");
    same(dv.getItem(1), {id:15,val:1}, "rows updated");
    same(dv.getItem(3), {id:35,val:3}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(1), {id:25,val:2}, "rows updated");
    same(dv.getItem(3), undefined, "rows updated");
    assertConsistency(dv);
});

test("delete at the end", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.deleteItems([35,45]);
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    assertConsistency(dv);
});

test("delete at the end bulk", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:05,val:0},{id:15,val:1},{id:25,val:2},{id:35,val:3},{id:45,val:4}]);
    dv.onRowsChanged.subscribe(function(e,args) {
        ok(true, "onRowsChanged called");
        same(args.rows, [3,4], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(e,args) {
        ok(true, "onRowCountChanged called");
        equal(args.previous, 5, "previous arg");
        equal(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(e,args) {
        ok(true, "onPagingInfoChanged called");
        equal(args.pageSize, 0, "pageSize arg");
        equal(args.pageNum, 0, "pageNum arg");
        equal(args.totalRows, 3, "totalRows arg");
        count++;
    });
    dv.beginUpdate(true);
    dv.deleteItems([35,45]);
    equal(count, 0, "events fired");
    equal(dv.getItems().length, 5, "items updated");
    equal(dv.getLength(), 5, "rows updated");
    same(dv.getItem(3), {id:35,val:3}, "rows updated");
    same(dv.getItem(4), {id:45,val:4}, "rows updated");
    dv.endUpdate();
    equal(count, 3, "events fired");
    equal(dv.getItems().length, 3, "items updated");
    equal(dv.getLength(), 3, "rows updated");
    same(dv.getItem(3), undefined, "rows updated");
    same(dv.getItem(4), undefined, "rows updated");
    assertConsistency(dv);
});

// TODO: paging
// TODO: combination


})(jQuery);
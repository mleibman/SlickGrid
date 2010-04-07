
module("basic");

function assertEmpty(dv) {
    ok(dv.rows !== null, ".rows is not null");
    ok(dv.rows !== undefined, ".rows is not undefined");
    same(0, dv.rows.length, ".rows is initialized to an empty array");
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
            same(dv.rows[row], items[i], "getRowById");
    }

    same(items.length-dv.rows.length, filteredOut, "filtered rows");
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
    same(2, dv.rows.length, "rows.length");
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
    dv.onRowsChanged.subscribe(function() {
        ok(true, "onRowsChanged called");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
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
    same(dv.rows.length, 0, "rows aren't updated until resumed");
});

test("refresh fires after resume", function() {
    var dv = new Slick.Data.DataView();
    dv.beginUpdate();
    dv.setItems([{id:0},{id:1}]);
    same(dv.getItems().length, 2, "items updated immediately");
    dv.setFilter(function(o) { return true });
    dv.refresh();

    var count = 0;
    dv.onRowsChanged.subscribe(function(args) {
        ok(true, "onRowsChanged called");
        same(args, [0,1], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 2, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 2, "totalRows arg");
        count++;
    });
    dv.endUpdate();
    same(count, 3, "events fired");
    same(dv.getItems().length, 2, "items are the same");
    same(dv.rows.length, 2, "rows updated");
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
    same(count, 1, "events fired");
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
    dv.sort(function(x,y) { return x.val-y.val }, false);
    same(items, [{id:2,val:2},{id:1,val:1},{id:0,val:0}], "sort order");
});

test("sort is stable", function() {
    var items = [{id:0,val:0},{id:2,val:2},{id:3,val:2},{id:1,val:1}];
    var dv = new Slick.Data.DataView();
    dv.setItems(items);

    dv.sort(function(x,y) { return x.val-y.val });
    same(items, [{id:0,val:0},{id:1,val:1},{id:2,val:2},{id:3,val:2}], "sort order");

    dv.sort(function(x,y) { return x.val-y.val }, false);
    same(items, [{id:2,val:2},{id:3,val:2},{id:1,val:1},{id:0,val:0}], "sort order");

});


module("filtering");

test("applied immediately", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(args) {
        ok(true, "onRowsChanged called");
        same(args, [0], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 1, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 1, "totalRows arg");
        count++;
    });
    dv.setFilter(function(o) { return o.val === 1 });
    same(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.rows.length, 1, "rows are filtered");
    assertConsistency(dv);
});

test("re-applied on refresh", function() {
    var count = 0;
    var filterVal = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) { return o.val >= filterVal });
    same(dv.rows.length, 3, "nothing is filtered out");
    assertConsistency(dv);

    dv.onRowsChanged.subscribe(function(args) {
        ok(true, "onRowsChanged called");
        same(args, [0], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 1, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 1, "totalRows arg");
        count++;
    });
    filterVal = 2;
    dv.refresh();
    same(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.rows.length, 1, "rows are filtered");
    assertConsistency(dv);
});

test("re-applied on sort", function() {
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) { return o.val === 1 });
    same(dv.rows.length, 1, "one row is remaining");

    dv.onRowsChanged.subscribe(function() { ok(false, "onRowsChanged called") });
    dv.onRowCountChanged.subscribe(function() { ok(false, "onRowCountChanged called") });
    dv.onPagingInfoChanged.subscribe(function() { ok(false, "onPagingInfoChanged called") });
    dv.sort(function(x,y) { return x.val-y.val }, false);
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.rows.length, 1, "rows are filtered");
    assertConsistency(dv);
});

test("all", function() {
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.onRowsChanged.subscribe(function(args) {
        ok(true, "onRowsChanged called");
        same(args, [], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 3, "previous arg");
        same(args.current, 0, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 0, "totalRows arg");
        count++;
    });
    dv.setFilter(function(o) { return false });
    same(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.rows.length, 0, "rows are filtered");
    assertConsistency(dv);
});

test("all then none", function() {
    var filterResult = false;
    var count = 0;
    var dv = new Slick.Data.DataView();
    dv.setItems([{id:0,val:0},{id:1,val:1},{id:2,val:2}]);
    dv.setFilter(function(o) { return filterResult });
    same(dv.rows.length, 0, "all rows are filtered out");

    dv.onRowsChanged.subscribe(function(args) {
        ok(true, "onRowsChanged called");
        same(args, [0,1,2], "args");
        count++;
    });
    dv.onRowCountChanged.subscribe(function(args) {
        ok(true, "onRowCountChanged called");
        same(args.previous, 0, "previous arg");
        same(args.current, 3, "current arg");
        count++;
    });
    dv.onPagingInfoChanged.subscribe(function(args) {
        ok(true, "onPagingInfoChanged called");
        same(args.pageSize, 0, "pageSize arg");
        same(args.pageNum, 0, "pageNum arg");
        same(args.totalRows, 3, "totalRows arg");
        count++;
    });
    filterResult = true;
    dv.refresh();
    same(count, 3, "events fired");
    same(dv.getItems().length, 3, "original data is still there");
    same(dv.rows.length, 3, "all rows are back");
    assertConsistency(dv);
});

// TODO: paging
// TODO: fast sort
// TODO: events on refresh on boundary conditions
// TODO: add/insert/update/delete
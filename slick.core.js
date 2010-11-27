(function($) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "Event":        Event,
            "EventData":    EventData,
            "Range":        Range,
            "EditorLock":   EditorLock,
            "GlobalEditorLock": new EditorLock()
        }
    });


    function EventData() {
        var isPropagationStopped = false;
        var isImmediatePropagationStopped = false;

        this.stopPropagation = function() {
            isPropagationStopped = true;
        };

        this.isPropagationStopped = function() {
            return isPropagationStopped;
        };

        this.stopImmediatePropagation = function() {
            isImmediatePropagationStopped = true;
        };

        this.isImmediatePropagationStopped = function() {
            return isImmediatePropagationStopped;
        }
    }

    function Event() {
        var handlers = [];

        this.subscribe = function(fn) {
            handlers.push(fn);
        };

        this.unsubscribe = function(fn) {
            for (var i = handlers.length - 1; i >= 0; i--) {
                if (handlers[i] === fn) {
                    handlers.splice(i, 1);
                }
            }
        };

        this.notify = function(arg1, arg2) {
            var e;
            var data;
            var returnValue;
            if (arguments.length === 2) {
                e = arg1;
                data = arg2;
            }
            else {
                e = new EventData();
                data = arg1;
            }

            for (var i = 0; i < handlers.length && !(e.isPropagationStopped() || e.isImmediatePropagationStopped()); i++) {
                returnValue = handlers[i].call(this, e, data);
            }

            return returnValue;
        };
    }

    function Range(fromRow, fromCell, toRow, toCell) {
        if (toRow === undefined && toCell === undefined) {
            toRow = fromRow;
            toCell = fromCell;
        }

        this.fromRow = Math.min(fromRow, toRow);
        this.fromCell = Math.min(fromCell, toCell);
        this.toRow = Math.max(fromRow, toRow);
        this.toCell = Math.max(fromCell, toCell);

        this.isSingleRow = function() {
            return this.fromRow == this.toRow;
        };

        this.isSingleCell = function() {
            return this.fromRow == this.toRow && this.fromCell == this.toCell;
        };

        this.contains = function(row, cell) {
            return row >= this.fromRow && row <= this.toRow &&
                   cell >= this.fromCell && cell <= this.toCell;
        }

        this.toString = function() {
            if (this.isSingleCell()) {
                return "(" + this.fromRow + ":" + this.fromCell + ")";
            }
            else {
                return "(" + this.fromRow + ":" + this.fromCell + " - " + this.toRow + ":" + this.toCell + ")";
            }
        }
    }

    function EditorLock() {
        /// <summary>
        /// Track currently active edit controller and ensure
        /// that onle a single controller can be active at a time.
        /// Edit controller is an object that is responsible for
        /// gory details of looking after editor in the browser,
        /// and allowing EditorLock clients to either accept
        /// or cancel editor changes without knowing any of the
        /// implementation details. SlickGrid instance is used
        /// as edit controller for cell editors.
        /// </summary>

        var currentEditController = null;

        this.isActive = function isActive(editController) {
            /// <summary>
            /// Return true if the specified editController
            /// is currently active in this lock instance
            /// (i.e. if that controller acquired edit lock).
            /// If invoked without parameters ("editorLock.isActive()"),
            /// return true if any editController is currently
            /// active in this lock instance.
            /// </summary>
            return (editController ? currentEditController === editController : currentEditController !== null);
        };

        this.activate = function activate(editController) {
            /// <summary>
            /// Set the specified editController as the active
            /// controller in this lock instance (acquire edit lock).
            /// If another editController is already active,
            /// an error will be thrown (i.e. before calling
            /// this method isActive() must be false,
            /// afterwards isActive() will be true).
            /// </summary>
            if (editController === currentEditController) { // already activated?
                return;
            }
            if (currentEditController !== null) {
                throw "SlickGrid.EditorLock.activate: an editController is still active, can't activate another editController";
            }
            if (!editController.commitCurrentEdit) {
                throw "SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()";
            }
            if (!editController.cancelCurrentEdit) {
                throw "SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()";
            }
            currentEditController = editController;
        };

        this.deactivate = function deactivate(editController) {
            /// <summary>
            /// Unset the specified editController as the active
            /// controller in this lock instance (release edit lock).
            /// If the specified editController is not the editController
            /// that is currently active in this lock instance,
            /// an error will be thrown.
            /// </summary>
            if (currentEditController !== editController) {
                throw "SlickGrid.EditorLock.deactivate: specified editController is not the currently active one";
            }
            currentEditController = null;
        };

        this.commitCurrentEdit = function commitCurrentEdit() {
            /// <summary>
            /// Invoke the "commitCurrentEdit" method on the
            /// editController that is active in this lock
            /// instance and return the return value of that method
            /// (if no controller is active, return true).
            /// "commitCurrentEdit" is expected to return true
            /// to indicate successful commit, false otherwise.
            /// </summary>
            return (currentEditController ? currentEditController.commitCurrentEdit() : true);
        };

        this.cancelCurrentEdit = function cancelCurrentEdit() {
            /// <summary>
            /// Invoke the "cancelCurrentEdit" method on the
            /// editController that is active in this lock
            /// instance (if no controller is active, do nothing).
            /// Returns true if the edit was succesfully cancelled.
            /// </summary>
            return (currentEditController ? currentEditController.cancelCurrentEdit() : true);
        };
    }
})(jQuery);



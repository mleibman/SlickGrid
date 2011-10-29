(function($) {
	/***
	 * A simple, sample AJAX data store implementation.
	 *
	 * This can be used as is for a basic JSONP-compatible backend that accepts paging parameters.
	 */
	function RemoteModel(options) {
		// private
		var data = {length:0};
		var req = null;
		var h_req = null;

		var defaults = {
		  pagesize: 50,
		  url: '',
		  method: 'jsonp',
		  response_item: ''
		};
		var opts = $.extend(defaults, options);

		// Events
		var onDataLoading = new Slick.Event();
		var onDataLoaded = new Slick.Event();

		var request_params = {
			jsonp: {
				callbackParameter: "callback",
				cache: true,
			},
			ajax: {
				dataType: 'json',
			},
			'*': {
				success: onSuccess,
				error: function() {
					onError(fromPage, toPage)
				}
			}
		}

		function init() {}

		function isDataLoaded(from, to) {
			for(var i=from; i<=to; i++) {
				if(data[i] == undefined || data[i] == null) {
					return false;
				}
			}
			return true;
		}

		function clear() {
			for(var key in data) {
				delete data[key];
			}
			data.length = 0;
		}

		function ensureData(from, to) {
			if(req) {
				req.abort();
				for(var i=req.fromPage; i<=req.toPage; i++) {
				  data[i * opts.pagesize] = undefined;
				}
			}

			if(from < 0) {
			  from = 0;
			}

			var fromPage = Math.floor(from / opts.pagesize);
			var toPage = Math.floor(to / opts.pagesize);

			while(data[fromPage * opts.pagesize] !== undefined && fromPage < toPage) {
				fromPage++;
		  	}

			while(data[toPage * opts.pagesize] !== undefined && fromPage < toPage) {
				toPage--;
			}

			if(fromPage > toPage || ((fromPage == toPage) && data[fromPage * opts.pagesize] !== undefined)) {
				// TODO:  look-ahead
				return;
			}

			if(opts.url == undefined || opts.url == null) {
				return;
			}

			var url = opts.url(fromPage, toPage, opts.pagesize);

			if(h_req != null) {
			  clearTimeout(h_req);
			}

			h_req = setTimeout(function() {
				for(var i=fromPage; i<=toPage; i++) {
					data[i * opts.pagesize] = null; // null indicates a 'requested but not available yet'
				}

				onDataLoading.notify({from:from, to:to});

				// Make the AJAX/JSONP call with both the general and specific parameters we need
				$[opts.method]($.extend(request_params['*'], request_params[opts.method], {
					url: url,
					context: {
						fromPage: fromPage,
						toPage: toPage
					}}));
			}, 50);
		}


		function onError(fromPage,toPage) {
			throw "Error loading pages " + fromPage + " to " + toPage;
		}

		function onSuccess(resp) {
			if(opts.response_item == null || opts.response_item == '') {
				opts.response_item = 'items';
				if(typeof resp.items == "undefined" && typeof resp == "object") {
					resp.items = resp;
				}
			}
			if (typeof resp.offset == "undefined" || resp.offset == null) {
				resp.offset = this.fromPage * opts.pagesize;
			}

			if ($.isArray(resp) && typeof resp[0][opts.response_item] == "object") {
				var strategy = objInArray;
			} else if ($.isArray(resp[opts.response_item])) {
				var strategy = arrayInObj;
			} else {
				throw "Could not find '" + opts.response_item + "' in JSONP response!"
			}

			if (typeof resp.count == "undefined" || resp.count == null) {
				resp.count = strategy.count(resp);
			}

			for (var i = 0; i < resp.count; i++) {
				data[resp.offset + i] = strategy.find(resp, i);
				data[resp.offset + i].index = resp.offset + i;
			}

			if (typeof resp.total !== "undefined" && !isNaN(resp.total)) {
				data.length = resp.total;
			} else {
				data.length = Math.max(data.length, resp.offset + resp.count);
			}

			req = null;
			onDataLoaded.notify({from:resp.offset, to:resp.offset + resp.count});
		}

		function reloadData(from,to) {
			for(var i=from; i<=to; i++) {
			  delete data[i];
			}

			ensureData(from,to);
		}

		function getOptions() {
            return options;
        }

		function setOptions(options) {
			opts = $.extend(defaults, options);
			return this;
		}

		var objInArray = {
			find: function(resp, i) {return resp[i][opts.response_item];},
			count: function(resp) {return resp.length;}
		};

		var arrayInObj = {
			find: function(resp, i) {return resp[opts.response_item][i];},
			count: function(resp) {return resp[opts.response_item].length;}
		};

		init();

		return {
			// Properties
			"data": data,

			// Methods
			"clear": clear,
			"isDataLoaded": isDataLoaded,
			"ensureData": ensureData,
			"reloadData": reloadData,
			"getOptions": getOptions,
			"setOptions": setOptions,

			// Events
			"onDataLoading": onDataLoading,
			"onDataLoaded": onDataLoaded
		};
	}

	// Slick.Data.RemoteModel
	$.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});
})(jQuery);
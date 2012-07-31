(function ($) {
  /***
   * A sample AJAX data store implementation.
   * Right now, it's hooked up to load all Apple-related Hackernews stories, but can
   * easily be extended to support and JSONP-compatible backend that accepts paging parameters.
   */
  function RemoteModel() {
    // private
    var PAGESIZE = 50; // if this is too big, API will generate 400 errors
    var data = {length: 0};
    var searchstr = "apple";

    // events
    var onDataLoading = new Slick.Event();
    var onDataLoaded = new Slick.Event();

    function init() {
    }


    function isDataLoaded(from, to) {
      for (var i = from; i <= to; i++) {
        if (!data[i] || data[i] == null) {
          return false;
        }
      }

      return true;
    }


    function clear() {
      for (var key in data) {
        delete data[key];
      }
      data.length = 0;
    }


    function ensureData(from, to) {
      var maxdata = Math.min(999,data.length);
      if (from < 0)
        from = 0;
      if (to > maxdata)
        to = maxdata;

      var fromPage = Math.floor(from / PAGESIZE);
      var toPage = Math.floor(to / PAGESIZE); // look-ahead

      while (fromPage <= toPage) {
        if (data[fromPage * PAGESIZE] == undefined) {
          data[fromPage * PAGESIZE] = null; // null indicates a 'requested but not available yet'

          var url = "http://api.thriftdb.com/api.hnsearch.com/items/_search?q=" + searchstr + "&start=" + (fromPage * PAGESIZE) + "&limit=" + PAGESIZE;
          // configure search
          url += "&weights[title]=2.0&weights[username]=0.0&boosts[fields][points]=0.5&boosts[fields][num_comments]=0.5"

          var req = new $.jsonp({
              url: url,
              callbackParameter: "callback",
              cache: true,
              success: onSuccess,
              error: function () {
                onError(fromPage)
              }
          });
          onDataLoading.notify();
        }
        fromPage++;
      }
    }


    function onError(fromPage) {
      i = indicators.pop();
      if(i != null)
        i.fadeOut();
      alert("error loading page " + fromPage);
    }

    function onSuccess(resp) {
      var from = resp.request.start, to = from + resp.results.length;
      data.length = Math.min(parseInt(resp.hits),1000); // limitation of the API

      for (var i = 0; i < resp.results.length; i++) {
        data[from + i] = resp.results[i].item;
        data[from + i].index = from + i;
      }

      onDataLoaded.notify({from:from,to:to});
    }


    function reloadData(from, to) {
      for (var i = from; i <= to; i++)
        delete data[i];

      ensureData(from, to);
    }


    function setSearch(str) {
      searchstr = str;
      clear();
    }


    init();

    return {
      // properties
      "data": data,

      // methods
      "clear": clear,
      "isDataLoaded": isDataLoaded,
      "ensureData": ensureData,
      "reloadData": reloadData,
      "setSearch": setSearch,

      // events
      "onDataLoading": onDataLoading,
      "onDataLoaded": onDataLoaded
    };
  }

  // Slick.Data.RemoteModel
  $.extend(true, window, { Slick: { Data: { RemoteModel: RemoteModel }}});
})(jQuery);

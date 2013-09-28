(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Plugins": {
        "Menu": Menu
      }
    }
  });

  function Menu(options) {
    var _grid;
    var _self = this;
    var _handler = new Slick.EventHandler();
    var _defaults = {
      
    };
    var _gridContainer;
    var _gridTopPanelContainer;
    var _gridColumnDef ;

    //private
    var $gridMenuContainer ;

    function init(grid) {
      options = $.extend(true, {}, _defaults, options);
      _grid = grid;
      _handler
        .subscribe(_grid.onPostInit, postInit);
    }

    function postInit(e, args) {
      _grid = args.grid;
      _gridContainer = args.node;
      _gridColumnDef = _grid.getColumns();
      var i=0;

      //Add Visibility property
      for( ; i < _gridColumnDef.length ; i++ ){
        _gridColumnDef[i].visibility = true;
      }

      //_gridTopPanelContainer
      _gridTopPanelContainer = _grid.getTopPanel();

      //Draw the grid Menu Box
      drawGridMenu();

      _grid.setTopPanelVisibility(true);
     
    };


    function drawGridMenu( ) {
      
      $gridMenuContainer = $("<div class='slick-plugin-menu-container' />");

      //Draw Menu for Column Selector
      drawColumnSelector();

      $gridMenuContainer
              .appendTo(_gridTopPanelContainer)
              .show();

      drawGridHeader();
    }

    function drawGridHeader(){
      var el = $("<div class='grid-header' style='width:100%'><label>SlickGrid</label><span style='float:right' class='ui-icon ui-icon-search' title='Toggle search panel'></span></div>");
      el.children("span").bind("click",function (e){
         _grid.setTopPanelVisibility(!grid.getOptions().showTopPanel);
      });
      _gridContainer.before(el);
    }
    function drawColumnSelector(){
      var i=0, tempCol = [], j=0;

     // $gridMenuContainer = $("<div class='slick-plugin-menu-ColumnListBox' />").appendTo($gridMenuContainer);
      for( ; i < _gridColumnDef.length ; i++ ){
        var el = $( "<span>"+_gridColumnDef[i]["name"]+"</span><input type='checkbox' checked='true' value='"+_gridColumnDef[i]["name"]+"'  name='"+_gridColumnDef[i]["name"]+"' /> <span> &nbsp;&nbsp;</span>" )
                  .appendTo($gridMenuContainer);
        (function ( columndef, i ){
          $(el[1]).bind("click", function( e ) {
            _gridColumnDef[i].visibility = e.currentTarget.checked;

            tempCol = [];
            j=0;
            for(; j < _gridColumnDef.length ; j++ ){
              if (_gridColumnDef[j].visibility){
                tempCol.push(_gridColumnDef[j]);
              }
            }

            _grid.setColumns(tempCol);

          });

        })(_gridColumnDef, i);
      }

    }

    function destroy() {
      _handler.unsubscribeAll();
      $(document.body).unbind("mousedown", handleBodyMouseDown);
    }
    
    $.extend(this, {
      "init": init,
      "destroy": destroy,

      "onBeforeMenuShow": new Slick.Event(),
      "onCommand": new Slick.Event()
    });
  }
})(jQuery);





(function ($) {
  function SlickGridHeaderGroups(_grid, _groupsDef) {
    this.grid = _grid;
    this.$grid = $(_grid.getContainerNode());
    this.groupsDef = _groupsDef;
    var self = this;
    function init() {        
        self.grid.onColumnsResized.subscribe(function (e, args) {
            onResize(e, args);
        });
        self.grid.onHeaderCellRendered.subscribe(function (e, args) {
            onResize(e, args);
        });
        self.grid.init();
    }
    
    function onResize() {
        //console.log(self.grid.getContainerNode())
        self.$grid.find('.slick-header-column-groups').remove()
        var $headersLastRow = self.$grid.find(".slick-header-columns");
        var $headersFirstRow = $headersLastRow;
        
        var categories = getCategories(self.grid.getColumns(), self.groupsDef);
        var $cell = self.$grid.find('.slick-header-column').first();
        var widthDelta = parseInt($cell.css('padding-left')) 
                        + parseInt($cell.css('padding-right')) 
                        + parseInt($cell.css('margin-left'))
                        + parseInt($cell.css('margin-right')) 
                        + parseInt($cell.css('border-left'))
                        + parseInt($cell.css('border-right'))

        categories.forEach(function(row){
            var $spanHeaders = $("<div class='slick-header-columns slick-header-column-groups' style='left:-1000px' />")
                            .insertBefore($headersFirstRow);
            row.forEach(function(col){
                var header = $("<div class='ui-state-default slick-header-column'  />")
                 .html("<span class='slick-column-name'>" + col.name + "</span>")
                 .width(col.width - widthDelta)
                 .attr("title", col.name || "")
                 .data("column", col)
                 .addClass('headerAlignWithBorder')
                 .appendTo($spanHeaders);
            
            });
            $spanHeaders.width($headersLastRow.width());
            $headersFirstRow = $spanHeaders;
        });
        
    }
    
    function getCategories(cols, groupsDef, memo) {
        memo = memo || [];
        var currentLevel = cols
            .map(function(c){
                var el = {
                    field : c.field,
                    width : c.width,
                    group : (groupsDef[c.field] != null) 
                                ? groupsDef[c.field].group 
                                : null,
                }
                el.groupName = (el.group != null && groupsDef[el.group] != null && groupsDef[el.group].name != null)
                                ? groupsDef[el.group].name
                                : el.group || ''
                return el;
            })
            .reduce(function(previous, currentGroup){
                var previousGroup = jQuery.isArray(previous) ? previous[previous.length-1] : previous;
                var previousArray = jQuery.isArray(previous) ? previous : [previous];
                if (previousGroup.group != null && previousGroup.group == currentGroup.group){
                    previousArray[previousArray.length-1] = {
                        group: previousGroup.group,
                        groupName: previousGroup.groupName,
                        width: currentGroup.width + previousGroup.width
                    }
                }
                else if (previousGroup.group == null && currentGroup.group == null){
                    previousArray[previous.length-1] =  {
                        group: currentGroup.field + previousGroup.field,
                        groupName: '',
                        width: currentGroup.width + previousGroup.width
                    }
                }
                else{
                    previousArray.push({
                        group: currentGroup.group,
                        groupName: currentGroup.groupName,
                        width: currentGroup.width
                    })
                }
                return previousArray;
            })
            .map(function(g){ return { field:g.group,  width: g.width, name: g.groupName} });
            
        memo.push(currentLevel);
        if(currentLevel.filter(function(c){ return groupsDef[c.field] && groupsDef[c.field].group != null; }).length > 0){
            return getCategories(currentLevel,  groupsDef, memo);
        }
        else{
            return memo;
        }
    }
    
    init();
  }

  // Slick.Controls.HeaderGroups
  $.extend(true, window, { Slick:{ Controls:{ HeaderGroups:SlickGridHeaderGroups }}});
})(jQuery);


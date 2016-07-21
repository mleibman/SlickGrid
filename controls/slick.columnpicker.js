(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    factory(jQuery);
  }
}(function ($) {
  /**
   *
   * @param {Array, Slick.TreeColumns} columns
   * @param grid
   * @param options
   * @returns {{getAllColumns: getAllColumns, getTreeColumns: "getTreeColumns", destroy: destroy}}
   * @constructor
   */
  function SlickColumnPicker(columns, grid, options) {
    var $menu;
    var treeColumns;

    var defaults = {
      fadeSpeed: 250,
      forceFitColumnsText: "Force fit columns",
      syncColumnCellResizeText: "Synchronous resize",
      classIconLevel: '',
      groups: [],
      totals: [],
      formatters: {
        show: function (column) {
          var columnShown = grid.getColumnIndex(column.id) >= 0;
          var picker = '<label>';
          picker += '<input id="picker-show-' + column.id + '" type="checkbox" class="picker-show" title="Ocultar/Exibir" data-column-id="' + column.id + '" ' + (columnShown ? 'checked="checked"' : '') + ' >';
          picker += '</label>';
          return picker;
        },
        group: function (column, groups) {
          var columnGrouped = groups.indexOf(column.id) >= 0;
          var picker = '<label>';
          picker += '<input id="picker-group-' + column.id + '" type="checkbox" class="picker-group" title="Agrupar/Desagrupar" data-column-id="' + column.id + '" ' + (columnGrouped ? 'checked="checked"' : '') + ' >';
          picker += '</label>';
          return picker;
        },
        total: function (column, totals) {
          var columnGrouped = totals.indexOf(column.id) >= 0;
          var picker = '<label>';
          picker += '<input id="picker-total-' + column.id + '" type="checkbox" class="picker-total" title="Totalizar/Remover Total" data-column-id="' + column.id + '" ' + (columnGrouped ? 'checked="checked"' : '') + ' >';
          picker += '</label>';
          return picker;
        }
      }
    };

    function init() {
      options = $.extend({}, defaults, options);

      treeColumns = new Slick.TreeColumns(columns);

      grid.onHeaderContextMenu.subscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.subscribe(updateColumnOrder);
      grid.onFooterRowCellRendered.subscribe(footerRowCellRendered);

      if (isGrouped())
        group(groupColumns(), totalsColumns());


      $menu = $("<span class='slick-columnpicker' style='display:none;position:absolute;z-index:20;' />").appendTo(document.body);

      $menu.bind("mouseleave", function () {
        $(this).fadeOut(options.fadeSpeed);
      });
      $menu.bind("click", updateColumn);
    }

    function isCheckbox(column) {
      return column.name.indexOf('checkbox') >= 0;
    }

    function destroy() {
      grid.onHeaderContextMenu.unsubscribe(handleHeaderContextMenu);
      grid.onColumnsReordered.unsubscribe(updateColumnOrder);
      $menu.remove();
    }

    function iconLevel() {
      return '<i class="' + options.classIconLevel + '"></i>';
    }

    function picker(showIconLevel, column) {
      var picker = showIconLevel ? iconLevel() : '';

      picker += options.formatters.show(column);

      if (Slick.Data.GroupItemMetadataProvider && grid.getData() instanceof Slick.Data.DataView)
        picker += options.formatters.group(column, options.groups);

      if (column.totalizable)
        picker += options.formatters.total(column, options.totals);

      picker += column.name;

      return picker;
    }

    function createColumnsList(_columns, firstLevel) {
      var menu = '<ul>';

      _columns.forEach(function (column) {
        menu += '<li id="picker-' + column.id + '" ' + (isCheckbox(column) ? 'style="display: none;"' : '') + '>';

        if (!firstLevel)
          menu += iconLevel();

        if (column.columns) {
          menu += column.name;
          menu += createColumnsList(column.columns, false);
        } else {
          menu += picker(false, column);
        }

        menu += '</li>';
      });

      menu += '</ul>';
      return menu;
    }

    function handleHeaderContextMenu(e, args) {
      var $li, $input;
      e.preventDefault();
      $menu.empty();
      updateColumnOrder();

      $('<div class="tree" />')
        .append(createColumnsList(columns, true))
        .appendTo($menu);

      $li = $("<p />").appendTo($menu);
      $input = $("<input type='checkbox' />").data("option", "autoresize");
      $("<label />")
        .text(options.forceFitColumnsText)
        .prepend($input)
        .appendTo($li);
      if (grid.getOptions().forceFitColumns) {
        $input.attr("checked", "checked");
      }

      $li = $("<p />").appendTo($menu);
      $input = $("<input type='checkbox' />").data("option", "syncresize");
      $("<label />")
        .text(options.syncColumnCellResizeText)
        .prepend($input)
        .appendTo($li);

      if (grid.getOptions().syncColumnCellResize)
        $input.attr("checked", "checked");

      $menu
        .css("top", e.pageY - 10)
        .css("left", e.pageX - 10)
        .fadeIn(options.fadeSpeed);
    }

    function updateColumnOrder() {
      treeColumns.reOrder(grid);
    }

    function updateColumn(e) {
      var $target = $(e.target);
      if ($target.data("option") === "autoresize") {
        if (e.target.checked) {
          grid.setOptions({forceFitColumns: true});
          grid.autosizeColumns();
        } else {
          grid.setOptions({forceFitColumns: false});
        }
        return;
      }

      if ($target.data("option") === "syncresize") {
        if (e.target.checked) {
          grid.setOptions({syncColumnCellResize: true});
        } else {
          grid.setOptions({syncColumnCellResize: false});
        }
        return;
      }

      if ($target.is(":checkbox")) {
        var columnId = $target.data('columnId');

        if ($target.attr('id').indexOf('picker-show') >= 0)
          onShowClick($target, columnId);

        if ($target.attr('id').indexOf('picker-group') >= 0)
          onGroupClick($target, columnId);

        if ($target.attr('id').indexOf('picker-total') >= 0) {
          onTotalClick($target, columnId);
        }
      }
    }

    function onShowClick($target, columnId) {
      var visibleColumns = [];
      $('.tree .picker-show', $menu).each(function () {
        var $input = $(this);
        if ($input.is(":checked"))
          visibleColumns.push($input.data('columnId'));
      });

      var $visibleColumns = treeColumns
        .filter(function () {
          return this.columns || visibleColumns.indexOf(this.id) >= 0;
        });

      var showFooterRow = grid.getOptions().showFooterRow;

      grid.setFooterRowVisibility(true);
      grid.setColumns(
        $visibleColumns
      );
      grid.setFooterRowVisibility(showFooterRow);

      $('#picker-' + columnId)
        .html(picker(treeColumns.hasDepth(), treeColumns.getById(columnId)));
    }

    function onGroupClick($target, columnId) {

      if ($target.is(':checked'))
        options.groups.push(columnId);
      else {
        options.groups = options.groups.filter(function (group) {
          return group !== columnId;
        })
      }

      group(groupColumns(), totalsColumns());

      $target.parents('li:first').find('.picker-show')[0].click();
    }

    function onTotalClick($target, columnId) {
      var column = treeColumns.getById(columnId);
      column.totalized = $target.is(':checked');

      if (column.totalized)

        options.totals.push(columnId);

      else

        options.totals = options.totals.filter(function (total) {
          return total !== columnId;
        });

      if (isGrouped())
        group(groupColumns(), totalsColumns());

      totalizeOrClean(column);

      grid.setFooterRowVisibility(isTotalized());

      $('#picker-' + columnId)
        .html(picker(treeColumns.hasDepth(), treeColumns.getById(columnId)));
    }

    function group(columns, agregators) {
      var grouping =
        columns.map(function (column) {
          var group = {
            getter: column.field,
            formatter: function (g) {
              var groupValue = (column.formatter ? column.formatter(null, null, g.value, column, g.rows[0]) : g.value);

              var extractText = $('<div>' + groupValue + '</div>').text();

              return column.name + ":  " + extractText + "  <span>(" + g.count + " items)</span>";
            },
            aggregators: [],
            aggregateCollapsed: true,
            lazyTotalsCalculation: true
          }

          if (typeof column.collapsed !== 'undefined')
            group.collapsed = column.collapsed;

          if (typeof column.aggregateCollapsed !== 'undefined')
            group.aggregateCollapsed = column.aggregateCollapsed;

          if (agregators)
            agregators.forEach(function (agregator) {
              group.aggregators.push(
                  agregator.totalizationType === Slick.Data.Aggregators.WeightedAvg ?
                  new agregator.totalizationType(agregator.field, agregator.idWeightedAvgColumn) :
                  new agregator.totalizationType(agregator.field)
              );
            });

          return group;
        });

      grid.getData().setGrouping(grouping);
    }

    function isTotalized() {
      return options.totals.length;
    }

    function isGrouped() {
      return options.groups.length;
    }

    function totalizeOrClean(column) {

      if (column.totalized) {

        column.total = 0;
        updateTotalizedColumns(grid.getData().getItems(), column);

      } else
        $(grid.getFooterRowColumn(column.id)).empty();
    }

    function updateTotalizedColumns(items, column) {
      $.each(column ? $(column) : grid.getColumns(), function () {

        if (this.totalized)
          updateColumnTotal(this, items);

      });
    }

    function updateColumnTotal(column, items) {
      calculateTotal(column, items);

      if (column.total != null) {

        var footerColumn = grid.getFooterRowColumn(column.id);
        $(footerColumn).text(column.formatter ? column.formatter(null, null, column.total, column) : column.total);

      }
    }

    function footerRowCellRendered(e, args) {
      totalizeOrClean(args.column);
    }

    function calculateTotal(column, items) {
      var field = column.field,
        totals = {};

      var aggregator = column.totalizationType === Slick.Data.Aggregators.WeightedAvg ?
        new column.totalizationType(field, column.idWeightedAvgColumn) :
        new column.totalizationType(field);

      aggregator.init();

      $.each(items, function () {
        aggregator.accumulate(this);
      });

      aggregator.storeResult(totals);

      if (typeof column.total === 'undefined')
        column.total = 0;

      switch (column.totalizationType) {
        case Slick.Data.Aggregators.Sum:
          column.total += totals.sum[field];
          break;
        case Slick.Data.Aggregators.Avg:
          column.total += totals.avg[field];
          break;
      }
    }

    function groupColumns() {
      return treeColumns.getInIds(options.groups);
    }

    function totalsColumns() {
      return treeColumns.getInIds(options.totals);
    }

    function getAllColumns() {
      return treeColumns.visibleColumns();
    }

    init();

    return {
      "getAllColumns": getAllColumns,
      "getTreeColumns": function () {
        return treeColumns;
      },
      "updateTotalizedColumns": function (items, columns) {
        updateTotalizedColumns(items, columns);
      },
      "destroy": destroy
    };
  }

  // Slick.Controls.ColumnPicker
  $.extend(true, window, { Slick: { Controls: { ColumnPicker: SlickColumnPicker }}});
}));


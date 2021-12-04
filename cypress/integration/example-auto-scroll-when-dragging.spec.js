/// <reference types="cypress" />

import { getScrollDistanceWhenDragOutsideGrid } from '../support/drag'

describe('Example - Auto scroll when dragging', { retries: 1 }, () => {
  // NOTE:  everywhere there's a * 2 is because we have a top+bottom (frozen rows) containers even after Unfreeze Columns/Rows
  const cellWidth = 80;
  const cellHeight = 25;
  const scrollbarDimension = 17;

  const fullTitles = ['#', 'Title', 'Duration', '% Complete', 'Start', 'Finish', 'Cost', 'Effort Driven'];

  for (var i = 0; i < 30; i++) {
    fullTitles.push("Mock" + i);
  }

  it('should load Example', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-auto-scroll-when-dragging.html`);
  });

  it('should have exact column titles on grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    cy.get('#myGrid2')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should select border shown in cell selection model, and hidden in row selection model when dragging', { scrollBehavior: false }, function () {
    cy.getCell(0, 1, '', { parentSelector: "#myGrid" })
      .as('cell1')
      .dragStart();
    cy.get('#myGrid .slick-range-decorator').should('be.exist').and('have.css', 'border-color').and('not.equal', 'none');
    cy.get('@cell1')
      .drag(0, 5)
      .dragEnd('#myGrid');
    cy.get('#myGrid .slick-range-decorator').should('not.be.exist');
    cy.get('#myGrid .slick-cell.selected').should('have.length', 6);

    cy.getCell(0, 1, '', { parentSelector: "#myGrid2" })
      .as('cell2')
      .dragStart();
    cy.get('#myGrid2 .slick-range-decorator').should('be.exist').and('have.css', 'border-style').and('equal', 'none');
    cy.get('@cell2')
      .drag(5, 1)
      .dragEnd('#myGrid2');
    cy.get('#myGrid2 .slick-range-decorator').should('not.be.exist');
    cy.get('#myGrid2 .slick-row:nth-child(-n+6)')
      .children(':not(.cell-unselectable)')
      .each(($child) => expect($child.attr("class")).to.include('selected'));
  })

  function testScroll() {
    return getScrollDistanceWhenDragOutsideGrid("#myGrid", 'topLeft', 'right', 0, 1).then(cellScrollDistance => {
      return getScrollDistanceWhenDragOutsideGrid("#myGrid2", 'topLeft', 'bottom', 0, 1).then(rowScrollDistance => {
        return cy.wrap({
          cell: {
            scrollBefore: cellScrollDistance.scrollLeftBefore,
            scrollAfter: cellScrollDistance.scrollLeftAfter
          },
          row: {
            scrollBefore: rowScrollDistance.scrollTopBefore,
            scrollAfter: rowScrollDistance.scrollTopAfter
          }
        });
      });
    });
  }

  it('should auto scroll take effect to display the selecting element when dragging', { scrollBehavior: false }, function () {
    testScroll().then(scrollDistance => {
      expect(scrollDistance.cell.scrollBefore).to.be.lessThan(scrollDistance.cell.scrollAfter);
      expect(scrollDistance.row.scrollBefore).to.be.lessThan(scrollDistance.row.scrollAfter);
    });

    cy.get('#isAutoScroll').click();
    cy.get('#setOptions').click();

    testScroll().then(scrollDistance => {
      expect(scrollDistance.cell.scrollBefore).to.be.equal(scrollDistance.cell.scrollAfter);
      expect(scrollDistance.row.scrollBefore).to.be.equal(scrollDistance.row.scrollAfter);
    });

    cy.get('#setDefaultOption').click();
    cy.get('#isAutoScroll').should('have.value', 'on')
  })

  function getIntervalUntilRow16Displayed(selector, px) {
    const viewportSelector = (selector + ' .slick-viewport:first');
    cy.getCell(0, 1, '', { parentSelector: selector })
      .dragStart();
    return cy.get(viewportSelector).invoke('scrollTop').then(scrollBefore => {
      cy.dragOutside('bottom', 0, px, { parentSelector: selector });

      const start = performance.now();
      cy.get(selector + ' .slick-row:not(.slick-group) >.cell-unselectable')
        .contains('16', { timeout: 10000 }) // actually #15 will be selected
        .should('not.be.hidden');

      return cy.get(viewportSelector).invoke('scrollTop').then(scrollAfter => {
        cy.dragEnd(selector);
        var interval = performance.now() - start;
        expect(scrollBefore).to.be.lessThan(scrollAfter);
        cy.get(viewportSelector).scrollTo(0, 0, { ensureScrollable: false });
        return cy.wrap(interval);
      });
    });
  }

  function testInterval(px) {
    return getIntervalUntilRow16Displayed("#myGrid", px).then(intervalCell => {
      return getIntervalUntilRow16Displayed("#myGrid2", px).then(intervalRow => {
        return cy.wrap({
          cell: intervalCell,
          row: intervalRow
        });
      });
    });
  }

  it('should MIN interval take effect when auto scroll: 30ms -> 90ms', { scrollBehavior: false }, function () {
    // By default the MIN interval to show next cell is 30ms.
    testInterval(300).then(defaultInterval => {

      // Setting the interval to 90ms (3 times of the default).
      cy.get('#minIntervalToShowNextCell').type('{selectall}90'); // 30ms -> 90ms
      cy.get('#setOptions').click();

      // Ideally if we scrolling to same row by MIN interval, the used time should be 3 times slower than default.
      // Considering the threshold, 1.5 times slower than default is expected
      testInterval(300).then(newInterval => {

        // max scrolling speed is slower than before
        expect(newInterval.cell).to.be.greaterThan(1.5 * defaultInterval.cell);
        expect(newInterval.row).to.be.greaterThan(1.5 * defaultInterval.row);

        cy.get('#setDefaultOption').click();
        cy.get('#minIntervalToShowNextCell').should('have.value', '30');
      })
    })
  })

  it('should MAX interval take effect when auto scroll: 600ms -> 200ms', { scrollBehavior: false }, function () {
    // By default the MAX interval to show next cell is 600ms.
    testInterval(0).then(defaultInterval => {

      // Setting the interval to 200ms (1/3 of the default).
      cy.get('#maxIntervalToShowNextCell').type('{selectall}200'); // 600ms -> 200ms
      cy.get('#setOptions').click();

      // Ideally if we scrolling to same row by MAX interval, the used time should be 3 times faster than default.
      // Considering the threshold, 1.5 times faster than default is expected
      testInterval(0).then(newInterval => {

        // min scrolling speed is quicker than before
        expect(1.5 * newInterval.cell).to.be.lessThan(defaultInterval.cell);
        expect(1.5 * newInterval.row).to.be.lessThan(defaultInterval.row);

        cy.get('#setDefaultOption').click();
        cy.get('#maxIntervalToShowNextCell').should('have.value', '600');
      })
    })
  })

  it('should Delay per Px take effect when auto scroll: 5ms/px -> 50ms/px', { scrollBehavior: false }, function () {
    // By default the Delay per Px is 5ms/px.
    testInterval(scrollbarDimension).then(defaultInterval => {

      // Setting to 50ms/px (10 times of the default).
      cy.get('#accelerateInterval').type('{selectall}50'); // 5ms/px -> 50ms/px
      cy.get('#setOptions').click();

      // Ideally if we scrolling to same row, and set cursor to 17px, the new interval will be set to MIN interval (Math.max(30, 600 - 50 * 17) = 30ms),
      // and the used time should be around 17 times faster than default.
      // Considering the threshold, 5 times faster than default is expected
      testInterval(scrollbarDimension).then(newInterval => {

        // scrolling speed is quicker than before
        expect(5 * newInterval.cell).to.be.lessThan(defaultInterval.cell);
        expect(5 * newInterval.row).to.be.lessThan(defaultInterval.row);

        cy.get('#setDefaultOption').click();
        cy.get('#accelerateInterval').should('have.value', '5');
      })
    })
  })

  it('should have a frozen grid with 4 containers with 2 columns on the left and 3 rows on the top after click Set/Clear Frozen button', () => {
    cy.get('#myGrid [style="top:0px"]').should('have.length', 1);
    cy.get('#myGrid2 [style="top:0px"]').should('have.length', 1);

    cy.get('#toggleFrozen').click();

    cy.get('#myGrid [style="top:0px"]').should('have.length', 2 * 2);
    cy.get('#myGrid2 [style="top:0px"]').should('have.length', 2 * 2);
    cy.get('#myGrid .grid-canvas-left > [style="top:0px"]').children().should('have.length', 2 * 2);
    cy.get('#myGrid2 .grid-canvas-left > [style="top:0px"]').children().should('have.length', 2 * 2);
    cy.get('#myGrid .grid-canvas-top').children().should('have.length', 3 * 2);
    cy.get('#myGrid2 .grid-canvas-top').children().should('have.length', 3 * 2);
  });

  function resetScrollInFrozen() {
    cy.get('#myGrid .slick-viewport:last').scrollTo(0, 0);
    cy.get('#myGrid2 .slick-viewport:last').scrollTo(0, 0);
  }

  it('should auto scroll to display the selecting element when dragging in frozen grid', { scrollBehavior: false }, () => {
    // top left - to bottomRight
    getScrollDistanceWhenDragOutsideGrid('#myGrid', 'topLeft', 'bottomRight', 0, 1).then(result => {
      expect(result.scrollTopBefore).to.be.equal(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.equal(result.scrollLeftAfter);
    });
    getScrollDistanceWhenDragOutsideGrid('#myGrid2', 'topLeft', 'bottomRight', 0, 1).then(result => {
      expect(result.scrollTopBefore).to.be.equal(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.equal(result.scrollLeftAfter);
    });

    // top right - to bottomRight
    getScrollDistanceWhenDragOutsideGrid('#myGrid', 'topRight', 'bottomRight', 0, 0).then(result => {
      expect(result.scrollTopBefore).to.be.equal(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.lessThan(result.scrollLeftAfter);
    });
    getScrollDistanceWhenDragOutsideGrid('#myGrid2', 'topRight', 'bottomRight', 0, 0).then(result => {
      expect(result.scrollTopBefore).to.be.equal(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.lessThan(result.scrollLeftAfter);
    });
    resetScrollInFrozen();

    // bottom left - to bottomRight
    getScrollDistanceWhenDragOutsideGrid('#myGrid', 'bottomLeft', 'bottomRight', 0, 1).then(result => {
      expect(result.scrollTopBefore).to.be.lessThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.equal(result.scrollLeftAfter);
    });
    getScrollDistanceWhenDragOutsideGrid('#myGrid2', 'bottomLeft', 'bottomRight', 0, 1).then(result => {
      expect(result.scrollTopBefore).to.be.lessThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.equal(result.scrollLeftAfter);
    });
    resetScrollInFrozen();

    // bottom right - to bottomRight
    getScrollDistanceWhenDragOutsideGrid('#myGrid', 'bottomRight', 'bottomRight', 0, 0).then(result => {
      expect(result.scrollTopBefore).to.be.lessThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.lessThan(result.scrollLeftAfter);
    });
    getScrollDistanceWhenDragOutsideGrid('#myGrid2', 'bottomRight', 'bottomRight', 0, 0).then(result => {
      expect(result.scrollTopBefore).to.be.lessThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.lessThan(result.scrollLeftAfter);
    });
    resetScrollInFrozen();
    cy.get('#myGrid .slick-viewport-bottom.slick-viewport-right').scrollTo(cellWidth * 3, cellHeight * 3);
    cy.get('#myGrid2 .slick-viewport-bottom.slick-viewport-right').scrollTo(cellWidth * 3, cellHeight * 3);

    // bottom right - to topLeft
    getScrollDistanceWhenDragOutsideGrid('#myGrid', 'bottomRight', 'topLeft', 8, 4, 100).then(result => {
      expect(result.scrollTopBefore).to.be.greaterThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.greaterThan(result.scrollLeftAfter);
    });
    getScrollDistanceWhenDragOutsideGrid('#myGrid2', 'bottomRight', 'topLeft', 8, 4, 100).then(result => {
      expect(result.scrollTopBefore).to.be.greaterThan(result.scrollTopAfter);
      expect(result.scrollLeftBefore).to.be.greaterThan(result.scrollLeftAfter);
    });
    resetScrollInFrozen();
  });

  it('should have a frozen & grouping by Duration grid after click Set/Clear grouping by Duration button', { scrollBehavior: false }, () => {
    cy.get('#toggleGroup').trigger('click');
    cy.get('#myGrid [style="top:0px"]').should('have.length', 2 * 2);
    cy.get('#myGrid2 [style="top:0px"]').should('have.length', 2 * 2);
    cy.get('#myGrid .grid-canvas-top.grid-canvas-left').contains('Duration');
    cy.get('#myGrid2 .grid-canvas-top.grid-canvas-left').contains('Duration');
  });

  function testDragInGrouping(selector) {
    cy.getCell(7, 0, 'bottomRight', { parentSelector: selector })
      .dragStart();
    cy.get(selector + ' .slick-viewport:last').as('viewport').invoke('scrollTop').then(scrollBefore => {
      cy.dragOutside('bottom', 400, 300, { parentSelector: selector });
      cy.get('@viewport').invoke('scrollTop').then(scrollAfter => {
        expect(scrollBefore).to.be.lessThan(scrollAfter);
        cy.dragEnd(selector);
        cy.get(selector + ' [style="top:350px"].slick-group').should('not.be.hidden');;
      })
    })
  }

  it('should auto scroll to display the selecting element even unselectable cell exist in grouping grid', { scrollBehavior: false }, () => {
    testDragInGrouping('#myGrid');
    testDragInGrouping('#myGrid2');
  });

  it('should reset to default grid when click Set/Clear Frozen button and Set/Clear grouping button', () => {
    cy.get('#toggleFrozen').trigger('click');
    cy.get('#toggleGroup').trigger('click');
    cy.get('#myGrid [style="top:0px"]').should('have.length', 1);
    cy.get('#myGrid2 [style="top:0px"]').should('have.length', 1);
  });

});

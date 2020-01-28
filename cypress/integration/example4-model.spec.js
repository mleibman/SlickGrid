/// <reference types="cypress" />

describe('Example 4 - Model', () => {
  const titles = ['#', 'Title', 'Duration', '% Complete', 'Start', 'Finish', 'Effort Driven'];

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, "log");
    });
  });

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example4-model.html`);
    cy.get('h2').contains('Demonstrates');
    cy.get('h2 + ul > li').first().contains('a filtered Model (DataView) as a data source instead of a simple array');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(titles[index]));
  });

  it('should display the text "Showing all 50000 rows" without Pagination', () => {
    const expectedRows = ['Task 0', 'Task 1', 'Task 2', 'Task 3', 'Task 4'];

    cy.get('.slick-pager-status')
      .contains('Showing all 50000 rows');

    cy.get('#myGrid')
      .find('.slick-row')
      .each(($row, index) => {
        if (index > expectedRows.length - 1) {
          return;
        }
        cy.wrap($row).children('.slick-cell:nth(1)')
          .first()
          .should('contain', expectedRows[index]);
      });
  });

  it('Should display "Showing page 1 of 1000" text after changing Pagination to 50 items per page', () => {
    cy.get('.ui-icon-lightbulb')
      .click();

    cy.get('.slick-pager-settings-expanded')
      .should('be.visible');

    cy.get('.slick-pager-settings-expanded')
      .contains('50')
      .click();

    cy.get('.slick-pager-status')
      .contains('Showing page 1 of 1000');

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('on Before Paging Info Changed - Previous Paging:: ', { pageSize: 0, pageNum: 0, totalRows: 50000, totalPages: 1 });
      expect(win.console.log).to.be.calledWith('on After Paging Info Changed - New Paging:: ', { pageSize: 50, pageNum: 0, totalRows: 50000, totalPages: 1000 });
    });
  });

  it('Should display "Showing page 2 of 1000" text after clicking on next page', () => {
    const expectedRows = ['Task 50', 'Task 51', 'Task 52', 'Task 53', 'Task 54'];

    cy.get('.ui-icon-seek-first.ui-state-disabled');
    cy.get('.ui-icon-seek-prev.ui-state-disabled');

    cy.get('.ui-icon-seek-next')
      .click();

    cy.get('.slick-pager-status')
      .contains('Showing page 2 of 1000');

    cy.get('#myGrid')
      .find('.slick-row')
      .each(($row, index) => {
        if (index > expectedRows.length - 1) {
          return;
        }
        cy.wrap($row).children('.slick-cell:nth(1)')
          .first()
          .should('contain', expectedRows[index]);
      });

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('on Before Paging Info Changed - Previous Paging:: ', { pageSize: 50, pageNum: 0, totalRows: 50000, totalPages: 1000 });
      expect(win.console.log).to.be.calledWith('on After Paging Info Changed - New Paging:: ', { pageSize: 50, pageNum: 1, totalRows: 50000, totalPages: 1000 });
    });
  });

  it('Should display "Showing page 1000 of 1000" text after clicking on last page', () => {
    const expectedRows = ['Task 49950', 'Task 49951', 'Task 49952', 'Task 49953', 'Task 49954'];

    cy.get('.ui-icon-seek-end')
      .click();

    cy.get('.slick-pager-status')
      .contains('Showing page 1000 of 1000');

    cy.get('#myGrid')
      .find('.slick-row')
      .each(($row, index) => {
        if (index > expectedRows.length - 1) {
          return;
        }
        cy.wrap($row).children('.slick-cell:nth(1)')
          .first()
          .should('contain', expectedRows[index]);
      });

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('on Before Paging Info Changed - Previous Paging:: ', { pageSize: 50, pageNum: 1, totalRows: 50000, totalPages: 1000 });
      expect(win.console.log).to.be.calledWith('on After Paging Info Changed - New Paging:: ', { pageSize: 50, pageNum: 999, totalRows: 50000, totalPages: 1000 });
    });
  });
});

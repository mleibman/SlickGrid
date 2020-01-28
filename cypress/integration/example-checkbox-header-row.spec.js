/// <reference types="cypress" />

describe('Example - Checkbox Header Row', () => {
  const titles = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, "log");
    });
  });

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-checkbox-header-row.html`);
    cy.get('h2').contains('Demonstrates');
    cy.get('h2 + ul > li').first().contains('Using a fixed header row to implement column-level filters with Checkbox Selector');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(titles[index]));
  });

  it('should select a single row and display new and previous selected rows in the console (previous should be empty)', () => {
    cy.get('.slick-row:nth(3) .slick-cell:nth(0) input[type=checkbox]')
      .click({ force: true });

    cy.get('#selectedRows')
      .contains('3');

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Previously Selected Rows: ');
      expect(win.console.log).to.be.calledWith('Selected Rows: 3');
    });
  });

  it('should select a second row and display new and previous selected rows in the console (previous should be empty)', () => {
    cy.get('.slick-row:nth(6) .slick-cell:nth(0) input[type=checkbox]')
      .click({ force: true });

    cy.get('#selectedRows')
      .contains('3,7');

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Previously Selected Rows: 3');
      expect(win.console.log).to.be.calledWith('Selected Rows: 3,7');
    });
  });

  it('should unselect first row and display previous and new selected rows', () => {
    cy.get('.slick-cell-checkboxsel.selected:nth(0) input[type=checkbox]')
      .click({ force: true });

    cy.get('#selectedRows')
      .contains('7');

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Previously Selected Rows: 3,7');
      expect(win.console.log).to.be.calledWith('Selected Rows: 7');
    });
  });

  it('should click on Select All and display previous and new selected rows', () => {
    const expectedRows = '1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87,89,91,93,95,97,99';

    cy.get('#filter-checkbox-selectall-container input[type=checkbox]')
      .click({ force: true });

    cy.get('#selectedRows')
      .contains(expectedRows);

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Previously Selected Rows: 7');
      expect(win.console.log).to.be.calledWith(`Selected Rows: ${expectedRows}`);
    });
  });

  it('should click on Select All again and expect no new selected rows', () => {
    const expectedPreviousRows = '1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79,81,83,85,87,89,91,93,95,97,99';

    cy.get('#filter-checkbox-selectall-container input[type=checkbox]')
      .click({ force: true });

    cy.get('#selectedRows')
    .invoke('text').then((text => {
        expect(text.trim()).to.eq('')
    }));

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith(`Previously Selected Rows: ${expectedPreviousRows}`);
      expect(win.console.log).to.be.calledWith('Selected Rows: ');
    });
  });
});
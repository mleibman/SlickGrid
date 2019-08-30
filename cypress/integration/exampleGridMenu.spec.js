/// <reference types="Cypress" />

describe('Example - Grid Menu', () => {
  const fullTitles = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  it('should display Example Grid Menu', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-grid-menu.html`);
    cy.get('h2').should('contain', 'Demonstrates:');
    cy.contains('This example demonstrates using the Slick.Controls.GridMenu ');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should click on the Grid Menu to hide the column "A"', () => {
    const expectedTitleList = ['#', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']; // without "A"

    cy.get('#myGrid')
      .find('button.slick-gridmenu-button')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('.slick-gridmenu-list')
      .children('li:visible:nth(0)')
      .children('label')
      .should('contain', 'A')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('span.close')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(expectedTitleList[index]));
  });

  it('should click on the External Grid Menu to show the column "A" as 1st column again', () => {
    cy.get('button')
      .contains('Grid Menu')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('.slick-gridmenu-list')
      .children('li:visible:nth(0)')
      .children('label')
      .should('contain', 'A')
      .click();

    cy.get('[data-dismiss=slick-gridmenu]')
      .click({ force: true });

    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should click on "Help" and expect an Alert to show the Help text', () => {
    cy.on('window:alert', (str) => {
      expect(str).to.equal(`Command: help`);
    });

    cy.get('.slick-gridmenu-item')
      .contains('Help')
      .click();
  });

  it('should toggle Filter Row and expect the row to be hidden', () => {
    cy.get('.slick-gridmenu-item')
      .contains('Toggle Filter Row')
      .click();

    cy.get('#myGrid')
      .find('.slick-pane-left')
      .find('.slick-headerrow')
      .should('be.hidden');
  });

  it('should toggle Filter Row and expect the row to be shown again', () => {
    cy.get('.slick-gridmenu-item')
      .contains('Toggle Filter Row')
      .click();

    cy.get('#myGrid')
      .find('.slick-pane-left')
      .find('.slick-headerrow')
      .should('be.visible');
  });

  it('should toggle Top Panel and expect the row to show up', () => {
    cy.get('.slick-gridmenu-item')
      .contains('Toggle Top Panel')
      .click();

    cy.get('#myGrid')
      .find('.slick-pane-left')
      .find('.slick-top-panel-scroller')
      .should('be.visible');
  });

  it('should toggle Top Panel and expect the row to be hide', () => {
    cy.get('.slick-gridmenu-item')
      .contains('Toggle Top Panel')
      .click();

    cy.get('#myGrid')
      .find('.slick-pane-left')
      .find('.slick-top-panel-scroller')
      .should('be.hidden');
  });

  it('should filter column "#" with value 9 and expect only 1 row in the grid with value 9', () => {
    cy.get('.grid-canvas')
      .find('.slick-row')
      .should('be.visible');

    cy.get('#myGrid')
      .find('.slick-headerrow-column.l0.r0')
      .find('input')
      .type('9');

    cy.get('#myGrid')
      .find('.slick-row')
      .should('have.length', 1);
  });

  it('should open the Grid Menu and click on Clear Filter and expect multiple rows now showing in the grid', () => {
    cy.get('#myGrid')
      .find('button.slick-gridmenu-button')
      .trigger('click')
      .click();

    cy.get('.slick-gridmenu-item')
      .contains('Clear Filters')
      .click();

    cy.get('.grid-canvas')
      .find('.slick-row')
      .should('be.visible');

    cy.get('#myGrid')
      .find('.slick-row')
      .its('length')
      .should('be.gt', 1)

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('span.close')
      .trigger('click')
      .click();
  });

  it('should drag column "A" to be after column "C" and expect this to be reflected in the Grid Menu', () => {
    const expectedGridMenuList = ['B', 'C', 'A', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'Force fit columns', 'Synchronous resize']; // without "A"

    cy.get('.slick-header-columns')
      .children('.slick-header-column:nth(1)')
      .should('contain', 'A')
      .trigger('mousedown', 'bottom', { which: 1 });

    cy.get('.slick-header-columns')
      .children('.slick-header-column:nth(3)')
      .should('contain', 'C')
      .trigger('mousemove', 'bottomRight')
      .trigger('mouseup', 'bottomRight', { force: true });

    cy.get('button')
      .contains('Grid Menu')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('.slick-gridmenu-list')
      .children('li:visible')
      .each(($child, index) => expect($child.text()).to.eq(expectedGridMenuList[index]));
  });
});

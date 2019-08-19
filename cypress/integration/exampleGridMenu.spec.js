/// <reference types="Cypress" />

describe('Example - Grid Menu', () => {
  const fullTitles = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const titlesWithoutId = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];


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

  it('should click on the Grid Menu to hide the column A from being displayed', () => {
    cy.get('#myGrid')
      .find('button.slick-gridmenu-button')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('.slick-gridmenu-list')
      .children('li:nth-child(1)')
      .children('label')
      .should('contain', 'A')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('span.close')
      .trigger('click')
      .click();

    const smallerTitleList = titlesWithoutId.slice(1);
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(smallerTitleList[index]));
  });

  it('should click on the External Grid Menu to show the column A as 1st column again', () => {
    cy.get('button')
      .contains('Grid Menu')
      .trigger('click')
      .click();

    cy.get('#myGrid')
      .get('.slick-gridmenu:visible')
      .find('.slick-gridmenu-list')
      .children('li:nth-child(1)')
      .children('label')
      .should('contain', 'A')
      .click();

    cy.get('[data-dismiss=slick-gridmenu]')
      .click({ force: true });

    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(titlesWithoutId[index]));
  });
});

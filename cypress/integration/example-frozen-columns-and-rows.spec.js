/// <reference types="cypress" />

describe('Example - Frozen Columns & Rows', { retries: 1 }, () => {
  // NOTE:  everywhere there's a * 2 is because we have a top+bottom (frozen rows) containers even after Unfreeze Columns/Rows

  const fullTitles = ['#', 'Title', 'Duration', '% Complete', 'Start', 'Finish', 'Effort Driven', 'Title1', 'Title2', 'Title3', 'Title4'];

  it('should load Example', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-frozen-columns-and-rows.html`);
  });

  it('should have exact column titles on 1st grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should have exact Column Header Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns:nth(0)')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should have a frozen grid with 4 containers on page load with 3 columns on the left and 6 columns on the right', () => {
    cy.get('[style="top:0px"]').should('have.length', 2 * 2);
    cy.get('.grid-canvas-left > [style="top:0px"]').children().should('have.length', 3 * 2);
    cy.get('.grid-canvas-right > [style="top:0px"]').children().should('have.length', 8 * 2);

    // top-left
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(0)').should('contain', '');
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 0');

    // top-right
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(2)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(4)').should('contain', '0');

    // bottom-left
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 5');
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:25px"] > .slick-cell:nth(1)').should('contain', 'Task 6');

    // bottom-right
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(2)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(4)').should('contain', '5');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:25px"] > .slick-cell:nth(4)').should('contain', '6');
  });

  it('should change frozen row and increment by 1 and expect changes to be reflected in the grid', () => {
    cy.get('input#frozenRow').type('{backspace}7');
    cy.get('button#setFrozenRow').click();

    cy.get('[style="top:0px"]').should('have.length', 2 * 2);
    cy.get('.grid-canvas-left > [style="top:0px"]').children().should('have.length', 3 * 2);
    cy.get('.grid-canvas-right > [style="top:0px"]').children().should('have.length', 8 * 2);

    // top-left
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(0)').should('contain', '');
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 0');

    // top-right
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(2)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(4)').should('contain', '0');

    // bottom-left
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 7');
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:25px"] > .slick-cell:nth(1)').should('contain', 'Task 8');

    // bottom-right
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(2)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(4)').should('contain', '7');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:25px"] > .slick-cell:nth(4)').should('contain', '8');
  });

  it('should change frozen column and increment by 1 and expect changes to be reflected in the grid', () => {
    cy.get('input#frozenColumn').type('{backspace}3');
    cy.get('button#setFrozenColumn').click();

    cy.get('[style="top:0px"]').should('have.length', 2 * 2);
    cy.get('.grid-canvas-left > [style="top:0px"]').children().should('have.length', 4 * 2);
    cy.get('.grid-canvas-right > [style="top:0px"]').children().should('have.length', 7 * 2);

    // top-left
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(0)').should('contain', '');
    cy.get('.grid-canvas-top.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 0');

    // top-right
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(0)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-top.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(3)').should('contain', '0');

    // bottom-left
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:0px"] > .slick-cell:nth(1)').should('contain', 'Task 7');
    cy.get('.grid-canvas-bottom.grid-canvas-left > [style="top:25px"] > .slick-cell:nth(1)').should('contain', 'Task 8');

    // bottom-right
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(0)').should('contain', '01/01/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(1)').should('contain', '01/05/2009');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:0px"] > .slick-cell:nth(3)').should('contain', '7');
    cy.get('.grid-canvas-bottom.grid-canvas-right > [style="top:25px"] > .slick-cell:nth(3)').should('contain', '8');
  });

  it('should click on "Select first 10 rows" button and expect first few rows to be selected', () => {
    cy.get('button#btnSelectRows').click();
    cy.get('.selected').should('have.length', 10 * 11); // 10 rows * 11 columns
  });
});

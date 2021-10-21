/// <reference types="cypress" />

describe('Example - Custom Tooltip', () => {
  const GRID_ROW_HEIGHT = 25;
  const titles = ['', 'Title', 'Description', 'Description 2', 'Duration', '% Complete', 'Start', 'Finish', 'Effort Driven'];

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, "log");
    });
  });

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-plugin-custom-tooltip.html`);
    cy.get('h2').contains('Demonstrates: Slick.Plugins.CustomTooltip');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(titles[index]));
  });

  it('should change server delay to 10ms for faster testing', () => {
    cy.get('#server-delay').type('{backspace}{backspace}{backspace}10');
    cy.get('#set-delay-btn').click();
  });

  it('should mouse over 1st row checkbox column and NOT expect any tooltip to show since it is disabled on that column', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(0)`).as('checkbox0-cell')
    cy.get('@checkbox0-cell').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('not.exist');
    cy.get('@checkbox0-cell').trigger('mouseleave');
  });

  it('should mouse over Task 1 cell and expect async tooltip to show', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(1)`).as('task1-cell')
    cy.get('@task1-cell').should('contain', 'Task 1');
    cy.get('@task1-cell').trigger('mouseover');
    cy.get('.slick-custom-tooltip').contains('loading...');

    cy.wait(10);
    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains('Task 1 - (async tooltip)');

    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(0)').contains('Lifespan:');
    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(1)').contains(/\d+$/); // use regexp to make sure it's a number

    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(0)').contains('Ratio:');
    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(1)').contains(/\d+$/); // use regexp to make sure it's a number

    cy.get('@task1-cell').trigger('mouseleave');
  });

  it('should mouse over Task 5 cell and expect async tooltip to show', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(1)`).as('task5-cell')
    cy.get('@task5-cell').should('contain', 'Task 5');
    cy.get('@task5-cell').trigger('mouseover');
    cy.get('.slick-custom-tooltip').contains('loading...');

    cy.wait(10);
    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains('Task 5 - (async tooltip)');

    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(0)').contains('Lifespan:');
    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(1)').contains(/\d+$/); // use regexp to make sure it's a number

    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(0)').contains('Ratio:');
    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(1)').contains(/\d+$/); // use regexp to make sure it's a number

    cy.get('@task5-cell').trigger('mouseleave');
  });

  it('should mouse over 6th row Description and expect full cell content to show in a tooltip because cell has ellipsis and is too long for the cell itself', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(2)`).as('desc5-cell')
    cy.get('@desc5-cell').should('contain', 'This is a sample task description.');
    cy.get('@desc5-cell').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').should('not.contain', `regular tooltip (from title attribute)\nTask 5 cell value:\nThis is a sample task description.\nIt can be multiline\n\nAnother line...`);
    cy.get('.slick-custom-tooltip').should('contain', `This is a sample task description.\nIt can be multiline\n\nAnother line...`);

    cy.get('@desc5-cell').trigger('mouseleave');
  });

  it('should mouse over 6th row Description 2 and expect regular tooltip title + concatenated full cell content when using "useRegularTooltipFromFormatterOnly: true"', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(3)`).as('desc2-5-cell')
    cy.get('@desc2-5-cell').should('contain', 'This is a sample task description.');
    cy.get('@desc2-5-cell').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').should('contain', `regular tooltip (from title attribute)\nTask 5 cell value:\nThis is a sample task description.\nIt can be multiline\n\nAnother line...`);

    cy.get('@desc2-5-cell').trigger('mouseleave');
  });

  it('should mouse over 6th row Duration and expect a custom tooltip shown with 4 label/value pairs displayed', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(4)`).as('duration5-cell')
    cy.get('@duration5-cell').should('contain', '5 days');
    cy.get('@duration5-cell').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains('Custom Tooltip');

    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(0)').contains('Id:');
    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(1)').contains('5');

    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(0)').contains('Title:');
    cy.get('.tooltip-2cols-row:nth(1)').find('div:nth(1)').contains('Task 5');

    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(0)').contains('Completion:');
    cy.get('.tooltip-2cols-row:nth(2)').find('div:nth(1)').find('.percent-complete-bar').should('exist');

    cy.get('.tooltip-2cols-row:nth(3)').find('div:nth(0)').contains('Effort Driven:');
    cy.get('.tooltip-2cols-row:nth(3)').find('div:nth(1)')
      .find('img').invoke('attr', 'src').then(src => expect(src).to.contain('tick.png'));

    cy.get('@duration5-cell').trigger('mouseleave');
  });

  it('should mouse over % Complete cell of Task 5 and expect regular tooltip to show with content "x %" where x is a number', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(5)`).as('percentage-cell')
    cy.get('@percentage-cell').find('.percent-complete-bar').should('exist');
    cy.get('@percentage-cell').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains(/\d+\%$/);

    cy.get('@percentage-cell').trigger('mouseleave');
  });

  it('should mouse over header-row (filter) 1st column checkbox and NOT expect any tooltip to show since it is disabled on that column', () => {
    cy.get(`.slick-headerrow-columns .slick-headerrow-column:nth(0)`).as('checkbox0-filter')
    cy.get('@checkbox0-filter').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('not.exist');
    cy.get('@checkbox0-filter').trigger('mouseleave');
  });

  it('should mouse over header-row (filter) 2nd column Title and expect a tooltip to show rendered from an headerRowFormatter', () => {
    cy.get(`.slick-headerrow-columns .slick-headerrow-column:nth(1)`).as('checkbox0-filter')
    cy.get('@checkbox0-filter').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains('Custom Tooltip - Header Row (filter)');

    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(0)').contains('Column:');
    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(1)').contains('title');

    cy.get('@checkbox0-filter').trigger('mouseleave');
  });

  it('should mouse over header-row (filter) Finish column and NOT expect any tooltip to show since it is disabled on that column', () => {
    cy.get(`.slick-headerrow-columns .slick-headerrow-column:nth(7)`).as('finish-filter')
    cy.get('@finish-filter').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('not.exist');
    cy.get('@finish-filter').trigger('mouseleave');
  });

  it('should mouse over header title on 1st column with checkbox and NOT expect any tooltip to show since it is disabled on that column', () => {
    cy.get(`.slick-header-columns .slick-header-column:nth(0)`).as('checkbox-header')
    cy.get('@checkbox-header').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('not.exist');
    cy.get('@checkbox-header').trigger('mouseleave');
  });

  it('should mouse over header title on 2nd column with Title name and expect a tooltip to show rendered from an headerFormatter', () => {
    cy.get(`.slick-header-columns .slick-header-column:nth(1)`).as('checkbox0-header')
    cy.get('@checkbox0-header').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('be.visible');
    cy.get('.slick-custom-tooltip').contains('Custom Tooltip - Header');

    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(0)').contains('Column:');
    cy.get('.tooltip-2cols-row:nth(0)').find('div:nth(1)').contains('Title');

    cy.get('@checkbox0-header').trigger('mouseleave');
  });

  it('should mouse over header title on 2nd column with Finish name and NOT expect any tooltip to show since it is disabled on that column', () => {
    cy.get(`.slick-header-columns .slick-header-column:nth(7)`).as('finish-header')
    cy.get('@finish-header').trigger('mouseover');

    cy.get('.slick-custom-tooltip').should('not.exist');
    cy.get('@finish-header').trigger('mouseleave');
  });
});
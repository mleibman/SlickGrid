/// <reference types="cypress" />

describe('Example - Composite Editor Modal with Create/Edit/Mass-Update/Mass-Selection', () => {
  const GRID_ROW_HEIGHT = 25;
  const titles = ['', 'Title', 'Description', 'Duration', '% Complete', 'Start', 'Finish', 'Effort Driven'];

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, "log");
    });
  });

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-composite-editor-modal-dialog.html`);
    cy.get('h2').contains('Demonstrates');
    cy.get('h2 + ul > li').first().contains('Composite Editor Modal - Edit Form');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(titles[index]));
  });

  it('should expect first row to include "Task 0" and other specific properties', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(1)`).should('contain', 'Task 0');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(3)`).should('contain', '5 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(5)`).should('contain', '01/01/2009');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(6)`).should('contain', '01/05/2009');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(7)`).find('img');
  });

  it('should open the Edit Modal and expect same data to include "Task 0" and other specific properties', () => {
    cy.get('[data-test=edit-button]').click();

    cy.get('.modal-header > h5').contains('Editing Task 0');
    cy.get('.item-details-label.editor-title').contains('Title');

    cy.get('[data-editorid=title] input')
      .invoke('val')
      .then(text => expect(text).to.eq('Task 0'));

    cy.get('[data-editorid=duration] input')
      .invoke('val')
      .then(text => expect(text).to.eq('5'));

    cy.get('[data-editorid=start] input')
      .invoke('val')
      .then(text => expect(text).to.eq('01/01/2009'));

    cy.get('[data-editorid=finish] input')
      .invoke('val')
      .then(text => expect(text).to.eq('01/05/2009'));
  });

  it('Should try to change "Duration" below 5 and expect it to become invalid', () => {
    cy.get('[data-editorid=duration] input')
      .type('2');

    cy.get('[data-action=save]').click();

    cy.get('.item-details-validation.editor-duration')
      .should('have.text', 'Duration must be at least 5 days when "Effort-Driven" is enabled');

    cy.get('.modified')
      .should('have.length', 1);

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(1);
      expect(win.console.log).to.be.calledWith('composite editor input changed', { duration: 2 });
    });
  });

  it('Should try to change "Duration" over 5 and expect it to become valid', () => {
    cy.get('[data-editorid=duration] input')
      .type('7')
      .blur();

    cy.get('.item-details-validation.editor-duration')
      .should('have.text', '');

    cy.get('.modified')
      .should('have.length', 1);

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(1);
      expect(win.console.log).to.be.calledWith('composite editor input changed', { duration: 27 });
    });
  });

  it('Should change a few more values in the Edit Modal then expect the updated data in the grid after Saving', () => {
    cy.get('[data-editorid=title] input')
      .type('Task 0000');

    cy.get('[data-editorid=desc] textarea')
      .type('some description');

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('.modified')
      .should('have.length', 4);

    cy.get('[data-action=save]').click();

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(4);
      expect(win.console.log).to.be.calledWith('composite editor input changed', { duration: 27, title: 'Task 0000', description: 'some description', effortDriven: false });
    });

    cy.wait(10);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(1)`).should('contain', 'Task 0000');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(5)`).should('contain', '01/01/2009');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(6)`).should('contain', '01/05/2009');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 0);
  });

  it('should open the Mass Update try to change "Duration" below 5 and expect it to become invalid', () => {
    cy.get('[data-test="mass-update-button"]').click();
    cy.get('.modal-header > h5').contains('Mass Update (all rows)');

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('[data-editorid=duration] input')
      .type('2');

    cy.get('[data-action="mass-update"]').click();

    cy.get('.item-details-validation.editor-duration')
      .should('have.text', 'Duration must be at least 5 days when "Effort-Driven" is enabled');

    cy.get('.modified')
      .should('have.length', 2);

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('composite editor input changed', { duration: 2, effortDriven: true });
    });
  });

  it('Should try to change "Duration" over 5 and expect it to become valid', () => {
    cy.get('[data-editorid=duration] input')
      .type('7')
      .blur();

    cy.get('.item-details-validation.editor-duration')
      .should('have.text', '');

    cy.get('.modified')
      .should('have.length', 2);

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(1);
      expect(win.console.log).to.be.calledWith('composite editor input changed', { duration: 27, effortDriven: true });
    });

    cy.get('[data-action="mass-update"]').click();
  });

  it('Should expect to see "Duration" of "27 days" and "Effort-Driven" to be enabled accross the entire grid', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(1)`).should('contain', 'Task 0000');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(1)`).should('contain', 'Task 1');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(1)`).should('contain', 'Task 2');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(1)`).should('contain', 'Task 3');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(1)`).should('contain', 'Task 4');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(1)`).should('contain', 'Task 5');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);
  });

  it('Should expect an Alert about missing row selection before executing Mass Selection', () => {
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.get('[data-test="mass-selection-button"]')
      .click()
      .then(() => {
        expect(alertStub.getCall(0)).to.be.calledWith(`You must select some rows before trying to apply new value(s)`);
      });
  });

  it('Should select row 2 and 3 and change ', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(0)`).click();
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(0)`).click();

    cy.get('[data-test="mass-selection-button"]').click();

    cy.get('.modal-header > h5').contains('Update on Current Selection');

    cy.get('[data-editorid=duration] input')
      .type('7');

    cy.get('[data-editorid=start] input')
      .type('02/02/2020');

    cy.get('.ui-datepicker-trigger').click(); // just 
    cy.get('a.ui-state-default').contains('1').click();

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('.modified')
      .should('have.length', 3);

    cy.get('[data-action="mass-selection"]').click();
  });

  it('Should expect to see "Duration" of "27 days" and "Effort-Driven" to be enabled accross the entire grid', () => {
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(1)`).should('contain', 'Task 0000');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 0}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(1)`).should('contain', 'Task 1');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(3)`).should('contain', '7 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(5)`).should('contain', '02/01/2020');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 1}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(1)`).should('contain', 'Task 2');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(3)`).should('contain', '7 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(5)`).should('contain', '02/01/2020');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 2}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(1)`).should('contain', 'Task 3');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 3}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(1)`).should('contain', 'Task 4');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 4}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);

    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(1)`).should('contain', 'Task 5');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(3)`).should('contain', '27 days');
    cy.get(`[style="top:${GRID_ROW_HEIGHT * 5}px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);
  });

  it('Should open a Create Modal window and click on Effort-Driven then expect 3 validation errors', () => {
    cy.get('[data-test=create-button]').click();
    cy.get('.modal-header > h5').contains('Inserting New Task');

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('.modified')
      .should('have.length', 1);

    cy.get('[data-action=save]').click();

    cy.get('.item-details-validation.editor-title')
      .should('have.text', 'This is a required field');

    cy.get('.item-details-validation.editor-duration')
      .should('have.text', 'Duration must be at least 5 days when "Effort-Driven" is enabled');

    cy.get('.item-details-validation.editor-percent')
      .should('have.text', 'Please enter a valid positive number');
  });

  it('Should fill in the Create Item form then expect the new data to show up in the grid after Saving', () => {
    cy.get('[data-test=create-button]').click();
    cy.get('.modal-header > h5').contains('Inserting New Task');

    cy.get('[data-editorid=title] input')
      .type('Task 8899');

    cy.get('[data-editorid=desc] textarea')
      .type('random text');

    cy.get('[data-editorid=duration] input')
      .type('9');

    cy.get('[data-editorid=percent] input')
      .type('44');

    cy.get('[data-editorid=start] input')
      .type('02/02/2020');

    cy.get('.ui-datepicker-trigger').first().click(); // just 
    cy.get('a.ui-state-default').contains('1').click();

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('[data-editorid=effort-driven] input')
      .click();

    cy.get('.modified')
      .should('have.length', 5);

    cy.get('[data-action=save]').click();

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(7);
      expect(win.console.log).to.be.calledWith('composite editor input changed', {
        description: 'random text', duration: 9, effortDriven: true, start: '02/01/2020', title: 'Task 8899'
      });
    });
  });

  it('Should expect to see "Duration" of "27 days" and "Effort-Driven" to be enabled accross the entire grid', () => {
    cy.get(`[style="top:12500px"] > .slick-cell:nth(1)`).should('contain', 'Task 8899');
    cy.get(`[style="top:12500px"] > .slick-cell:nth(2)`).should('contain', 'random text');
    cy.get(`[style="top:12500px"] > .slick-cell:nth(3)`).should('contain', '9 days');
    cy.get(`[style="top:12500px"] > .slick-cell:nth(4)`).each($cell => {
      const htmlText = $cell.html();
      expect(htmlText).to.eq('<span class="percent-complete-bar" style="background:silver;width:44%" title="44%"></span>');
    });
    cy.get(`[style="top:12500px"] > .slick-cell:nth(5)`).should('contain', '02/01/2020');
    cy.get(`[style="top:12500px"] > .slick-cell:nth(6)`).should('contain', '');
    cy.get(`[style="top:12500px"] > .slick-cell:nth(7)`).find('img').should('have.length', 1);
  });
});

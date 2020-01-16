/// <reference types="Cypress" />

describe('Example - Context Menu & Cell Menu', () => {
  const fullTitles = ['#', 'Title', '% Complete', 'Start', 'Finish', 'Priority', 'Effort Driven', 'Action'];

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, "log");
    });
  });

  it('should display Example Context Menu & Cell Menu', () => {
    cy.visit(`${Cypress.config('baseExampleUrl')}/example-plugin-contextmenu.html`);
    cy.get('h2').should('contain', 'Demonstrates:');
    cy.get('h2 span').should('contain', 'Slick.Plugins.ContextMenu / Slick.Plugins.CellMenu');
  });

  it('should have exact Column Titles in the grid', () => {
    cy.get('#myGrid')
      .find('.slick-header-columns')
      .children()
      .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
  });

  it('should have first row with "Task 0" and a Priority set to "Low" with the Action cell disabled and not clickable', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(5)')
      .contains('Low');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(6) img')
      .invoke('attr', 'src')
      .then(src => {
        expect(src).to.contain('tick.png')
      });

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7) .disabled')
      .contains('Action');

    cy.get('.slick-cell-menu')
      .should('not.exist')
  });

  it('should open the Context Menu and expect onBeforeMenuShow then onAfterMenuShow to show in the console log', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .rightclick();

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Before the global Context Menu is shown');
      expect(win.console.log).to.be.calledWith('After the Context Menu is shown');
    });
  });

  it('should expect the Context Menu to not have the "Help" menu when there is Effort Driven set to True', () => {
    const commands = ['Copy Cell Value', 'Delete Row', '', 'Command (always disabled)'];

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .rightclick();

    cy.get('.slick-context-menu.dropright .slick-context-menu-command-list')
      .find('.slick-context-menu-item')
      .each(($command, index) => {
        expect($command.text()).to.eq(commands[index]);
        expect($command.text()).not.include('Help');
      });
  });

  it('should expect the Context Menu to not have the "Help" menu when there is Effort Driven set to True', () => {
    const commands = ['Copy Cell Value', 'Delete Row', '', 'Command (always disabled)'];

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .rightclick();

    cy.get('.slick-context-menu.dropright .slick-context-menu-command-list')
      .find('.slick-context-menu-item')
      .each(($command, index) => {
        expect($command.text()).to.eq(commands[index]);
        expect($command.text()).not.include('Help');
      });
  });

  it('should be able to click on the Context Menu (x) close button, on top right corner, to close the menu', () => {
    cy.get('.slick-context-menu.dropright')
      .should('exist');

    cy.get('.slick-context-menu button.close')
      .click();
  });

  it('should change "Task 0" Priority to "High" with Context Menu and expect the Action Menu to become clickable and usable', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(5)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-option-list')
      .contains('High')
      .click();

    cy.get('.slick-context-menu-command-list')
      .should('not.exist');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu.dropleft')
      .should('exist');
  });

  it('should expect a "Command 2" to be disabled and not clickable (menu will remain open), in that same Action menu', () => {
    cy.get('.slick-cell-menu .slick-cell-menu-item.slick-cell-menu-item-disabled')
      .contains('Command 2')
      .click({ force: true });

    cy.get('.slick-cell-menu.dropleft')
      .should('exist');
  });

  it('should change the Effort Driven to "False" in that same Action and then expect the "Command 2" to enabled and clickable', () => {
    const stub = cy.stub();
    cy.on('window:alert', stub);

    cy.get('.slick-cell-menu .slick-cell-menu-option-list')
      .find('.slick-cell-menu-item')
      .contains('False')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu .slick-cell-menu-item')
      .contains('Command 2')
      .click()
      .then(() => expect(stub.getCall(0)).to.be.calledWith('Command 2'));
  });

  it('should expect the Context Menu now have the "Help" menu when Effort Driven is set to False', () => {
    const commands = ['Copy Cell Value', 'Delete Row', '', 'Help', 'Command (always disabled)'];

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(6)')
      .rightclick();

    cy.get('.slick-context-menu.dropleft .slick-context-menu-command-list')
      .find('.slick-context-menu-item')
      .each(($command, index) => expect($command.text()).to.eq(commands[index]));

    cy.get('.slick-context-menu button.close')
      .click();
  });

  it('should open the Cell Menu and expect onBeforeMenuShow then onAfterMenuShow to show in the console log', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu.dropleft')
      .should('exist');

    cy.window().then((win) => {
      expect(win.console.log).to.have.callCount(2);
      expect(win.console.log).to.be.calledWith('Before the Cell Menu is shown');
      expect(win.console.log).to.be.calledWith('After the Cell Menu is shown');
    });
  });

  it('should be able to click on the Action Cell Menu (x) close button, on top right corner, to close the menu', () => {
    cy.get('.slick-cell-menu.dropleft')
      .should('exist');

    cy.get('.slick-cell-menu button.close')
      .click();

    cy.get('.slick-cell-menu.dropleft')
      .should('not.exist');
  });

  it('should click on the "Show Commands & Priority Options" button and see both list when opening Context Menu', () => {
    cy.get('button')
      .contains('Show Commands & Priority Options')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(5)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-option-list')
      .should('exist')
      .contains('High');

    cy.get('.slick-context-menu-command-list')
      .find('.slick-context-menu-item.bold')
      .find('.slick-context-menu-content.red')
      .should('exist')
      .contains('Delete Row');

    cy.get('.slick-context-menu button.close')
      .click();
  });

  it('should click on the "Show Priority Options Only" button and see both list when opening Context Menu', () => {
    cy.get('button')
      .contains('Show Priority Options Only')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(5)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-option-list')
      .should('exist')
      .contains('High');

    cy.get('.slick-context-menu-command-list')
      .should('not.exist');

    cy.get('.slick-context-menu button.close')
      .click();
  });

  it('should click on the "Show Actions Commands & Effort Options" button and see both list when opening Action Cell Menu', () => {
    cy.get('button')
      .contains('Show Actions Commands & Effort Options')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu .slick-cell-menu-option-list')
      .should('exist')
      .contains('True');

    cy.get('.slick-cell-menu-command-list')
      .should('exist')
      .contains('Delete Row');

    cy.get('.slick-cell-menu button.close')
      .click();
  });

  it('should open the Action Cell Menu and expect the Effort Driven "null" option when this Effort is set to False', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu.dropleft')
      .should('exist');

    cy.get('.slick-cell-menu')
      .find('.slick-cell-menu-option-list')
      .find('.slick-cell-menu-content.italic')
      .contains('null');
  });

  it('should open the Action Cell Menu and not expect the Effort Driven "null" option when this Effort is set to True', () => {
    cy.get('.slick-cell-menu.dropleft')
      .should('exist');

    cy.get('.slick-cell-menu')
      .find('.slick-cell-menu-option-list')
      .contains('True')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu')
      .each($row => {
        expect($row.text()).not.include('null');
      });
  });

  it('should reset Effort Driven to False for the next test to include all commands', () => {
    cy.get('.slick-cell-menu')
      .find('.slick-cell-menu-option-list')
      .contains('False')
      .click();
  });

  it('should click on the "Show Action Commands Only" button and see both list when opening Context Menu', () => {
    const commands = ['Command 1', 'Command 2', 'Delete Row', '', 'Help', 'Disabled Command'];

    cy.get('button')
      .contains('Show Action Commands Only')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu .slick-cell-menu-command-list')
      .should('exist')
      .find('.slick-cell-menu-item')
      .each(($command, index) => expect($command.text()).to.eq(commands[index]));

    cy.get('.slick-cell-menu-option-list')
      .should('not.exist');

    cy.get('.slick-cell-menu button.close')
      .click();
  });

  it('should be able to delete first row by using the "Delete Row" command from the Context Menu', () => {
    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .contains('Task 0');

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-command-list')
      .find('.slick-context-menu-item.bold')
      .find('.slick-context-menu-content.red')
      .should('exist')
      .contains('Delete Row')
      .click();

    cy.get('#myGrid')
      .find('.slick-row .slick-cell:nth(1)')
      .each($row => {
        expect($row.text()).not.include('Task 0');
      });
  });

  it('should be able to delete the 3rd row "Task 3" by using the "Delete Row" command from the Action Cell Menu', () => {
    cy.get('#myGrid')
      .find('.slick-row:nth(2) .slick-cell:nth(1)')
      .contains('Task 3');

    cy.get('#myGrid')
      .find('.slick-row:nth(2) .slick-cell:nth(7)')
      .contains('Action')
      .click({ force: true });

    cy.get('.slick-cell-menu .slick-cell-menu-command-list')
      .find('.slick-cell-menu-item.bold')
      .find('.slick-cell-menu-content.red')
      .should('exist')
      .contains('Delete Row')
      .click();

    cy.get('#myGrid')
      .find('.slick-row:nth(2) .slick-cell:nth(1)')
      .each($row => {
        expect($row.text()).not.include('Task 3');
      });
  });

  it('should check Context Menu "menuUsabilityOverride" condition and expect to not be able to open Context Menu from rows than are >= to Task 21', () => {
    cy.get('#myGrid')
      .find('.slick-row:nth(21) .slick-cell:nth(1)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-command-list')
      .should('not.exist');
  });

  it('should scroll back to top row and be able to open Context Menu', () => {
    cy.get('#myGrid')
      .find('.slick-row:nth(1) .slick-cell:nth(1)')
      .rightclick();

    cy.get('.slick-context-menu .slick-context-menu-command-list')
      .should('exist');

    cy.get('.slick-context-menu button.close')
      .click();
  });
});

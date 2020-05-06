/// <reference types="Cypress" />

describe('Example - Row Detail/Row Move/Checkbox Selector Plugins', () => {
    const fullTitles = ['', '', '', '#', 'Title', 'Duration', '% Complete', 'Start', 'Finish', 'Effort Driven'];

    beforeEach(() => {
        // create a console.log spy for later use
        cy.window().then((win) => {
            cy.spy(win.console, "log");
        });
    });

    it('should display Example Row Detail/Row Move/Checkbox Selector Plugins', () => {
        cy.visit(`${Cypress.config('baseExampleUrl')}/example-row-detail-selection-and-move.html`);
        cy.get('h2').should('contain', 'Demonstrates:');
        cy.get('h3').should('contain', 'The following three Plugins used together');
    });

    it('should have exact Column Titles in the grid', () => {
        cy.get('#myGrid')
            .find('.slick-header-columns')
            .children()
            .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    });

    it('should open the Row Detail of the 2nd row and expect to find some details', () => {
        cy.get('.slick-cell.detailView-toggle:nth(3)')
            .click()
            .wait(250);

        cy.get('.innerDetailView_3')
            .find('h2')
            .should('contain', 'Task 3');

        cy.get('input[id="assignee_3"]')
            .should('exist');

        cy.get('input[type="checkbox"]:checked')
            .should('have.length', 0);
    });

    it('should drag opened Row Detail to another valid position in the grid', () => {
        cy.get('[style="top:25px"] > .slick-cell.cell-reorder').as('moveIconTask1');
        cy.get('[style="top:75px"] > .slick-cell.cell-reorder').as('moveIconTask3');
        cy.get('[style="top:100px"]').as('expandIconTask4');

        cy.get('@moveIconTask3')
            .trigger('mousedown', { button: 0, force: true })
            .trigger('mousemove', 'bottomRight');

        cy.get('[style="top:100px"]')
            .trigger('mousemove', 'bottomRight', { force: true });

        cy.get('[style="top:100px"]')
            .trigger('mouseup', 'bottomRight', { force: true });

        cy.get('input[type="checkbox"]:checked')
            .should('have.length', 0);
    });

    it('should expect row to be moved to another row index', () => {
        cy.get('.slick-viewport-top.slick-viewport-left')
            .scrollTo('top');

        cy.get('[style="top:0px"] > .slick-cell:nth(4)').should('contain', 'Task 0');
        cy.get('[style="top:25px"] > .slick-cell:nth(4)').should('contain', 'Task 1');
        cy.get('[style="top:50px"] > .slick-cell:nth(4)').should('contain', 'Task 2');
        cy.get('[style="top:75px"] > .slick-cell:nth(4)').should('contain', 'Task 4');
        cy.get('[style="top:100px"] > .slick-cell:nth(4)').should('contain', 'Task 3');

        cy.get('input[type="checkbox"]:checked')
            .should('have.length', 0);
    });

    it('should try moving a row to an invalid target and expect nothing moved (same rows as prior test)', () => {
        cy.get('[style="top:25px"] > .slick-cell.cell-reorder').as('moveIconTask1');
        cy.get('[style="top:100px"]').as('expandIconTask4');

        cy.get('@moveIconTask1')
            .trigger('mousedown', { button: 0, force: true })
            .trigger('mousemove', 'bottomRight');

        cy.get('[style="top:75px"]')
            .trigger('mousemove', 'topRight', { force: true });

        cy.get('[style="top:75px"]')
            .trigger('mouseup', 'topRight', { force: true });

        cy.get('input[type="checkbox"]:checked')
            .should('have.length', 0);
    });

    it('should select 2 rows (Task 1,3), then move row and expect the 2 rows to still be selected without any other rows', () => {
        cy.get('[style="top:25px"] > .slick-cell:nth(2)').click();
        cy.get('[style="top:100px"] > .slick-cell:nth(2)').click();

        cy.get('[style="top:25px"] > .slick-cell.cell-reorder').as('moveIconTask1');
        cy.get('[style="top:150px"]').as('moveIconTask3');

        cy.get('@moveIconTask1').should('have.length', 1);

        cy.get('@moveIconTask1')
            .trigger('mousedown', { button: 0, force: true })
            .trigger('mousemove', 'bottomRight');

        cy.get('@moveIconTask3')
            .trigger('mousemove', 'bottomRight', { force: true })
            .trigger('mouseup', 'bottomRight', { force: true });

        cy.get('[style="top:0px"] > .slick-cell:nth(4)').should('contain', 'Task 0');
        cy.get('[style="top:25px"] > .slick-cell:nth(4)').should('contain', 'Task 2');
        cy.get('[style="top:50px"] > .slick-cell:nth(4)').should('contain', 'Task 4');
        cy.get('[style="top:75px"] > .slick-cell:nth(4)').should('contain', 'Task 3');
        cy.get('[style="top:100px"] > .slick-cell:nth(4)').should('contain', 'Task 5');
        cy.get('[style="top:125px"] > .slick-cell:nth(4)').should('contain', 'Task 6');
        cy.get('[style="top:150px"] > .slick-cell:nth(4)').should('contain', 'Task 1');

        // Task 4 and 3 should be selected
        cy.get('input[type="checkbox"]:checked').should('have.length', 2);
        cy.get('[style="top:75px"] > .slick-cell:nth(2) input[type="checkbox"]:checked').should('have.length', 1);
        cy.get('[style="top:150px"] > .slick-cell:nth(2) input[type="checkbox"]:checked').should('have.length', 1);
    });

    it('should click on "Single Row Move OFF", then drag a row and expect both selected rows to be moved together', () => {
        cy.contains('Single Row Move OFF').click();

        cy.get('[style="top:175px"] > .slick-cell.cell-reorder').as('moveIconTask7');
        cy.get('[style="top:75px"] > .slick-cell.cell-reorder').as('moveIconTask3');

        cy.get('@moveIconTask3').should('have.length', 1);

        cy.get('@moveIconTask3')
            .trigger('mousedown', { button: 0, force: true })
            .trigger('mousemove', 'bottomRight');

        cy.get('[style="top:200px"]')
            .trigger('mousemove', 'bottomRight', { force: true })
            .trigger('mouseup', 'bottomRight', { force: true });

        cy.get('[style="top:0px"] > .slick-cell:nth(4)').should('contain', 'Task 0');
        cy.get('[style="top:25px"] > .slick-cell:nth(4)').should('contain', 'Task 2');
        cy.get('[style="top:50px"] > .slick-cell:nth(4)').should('contain', 'Task 4');
        cy.get('[style="top:75px"] > .slick-cell:nth(4)').should('contain', 'Task 5');
        cy.get('[style="top:100px"] > .slick-cell:nth(4)').should('contain', 'Task 6');
        cy.get('[style="top:125px"] > .slick-cell:nth(4)').should('contain', 'Task 7');
        cy.get('[style="top:150px"] > .slick-cell:nth(4)').should('contain', 'Task 8');
        cy.get('[style="top:175px"] > .slick-cell:nth(4)').should('contain', 'Task 3');
        cy.get('[style="top:200px"] > .slick-cell:nth(4)').should('contain', 'Task 1');

        // // Task 1 and 3 should be selected
        cy.get('input[type="checkbox"]:checked').should('have.length', 2);
        cy.get('[style="top:175px"] > .slick-cell:nth(2) input[type="checkbox"]:checked').should('have.length', 1);
        cy.get('[style="top:200px"] > .slick-cell:nth(2) input[type="checkbox"]:checked').should('have.length', 1);
    });

    it('should open the Task 3 Row Detail and still expect same detail', () => {
        cy.get('[style="top:175px"] > .slick-cell:nth(4)').should('contain', 'Task 3');

        cy.get('[style="top:175px"] > .slick-cell:nth(0)')
            .click()
            .wait(250);

        cy.get('.innerDetailView_3')
            .find('h2')
            .should('contain', 'Task 3');

        cy.get('input[id="assignee_3"]')
            .should('exist');
    });
});

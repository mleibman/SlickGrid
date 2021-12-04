import { convertPosition } from './common';

Cypress.Commands.add("dragStart", { prevSubject: true }, (subject, { cellWidth = 80, cellHeight = 25 } = {}) => {
  return cy.wrap(subject).click({ force: true })
    .trigger('mousedown', { which: 1 })
    .trigger('mousemove', cellWidth / 3, cellHeight / 3);
})

Cypress.Commands.add("drag", { prevSubject: true }, (subject, addRow, addCell, { cellWidth = 80, cellHeight = 25 } = {}) => {
  return cy.wrap(subject).trigger('mousemove', cellWidth * (addCell + 0.5), cellHeight * (addRow + 0.5), { force: true });
})

Cypress.Commands.add("dragOutside", (viewport = 'topLeft', ms = 0, px = 0, { parentSelector = 'div[class^="slickgrid_"]', scrollbarDimension = 17 } = {}) => {
  const $parent = cy.$$(parentSelector);
  const gridWidth = $parent.width();
  const gridHeight = $parent.height();
  var x = gridWidth / 2;
  var y = gridHeight / 2;
  const position = convertPosition(viewport);
  if (position.x === "left") {
    x = -px;
  } else if (position.x === "right") {
    x = gridWidth - scrollbarDimension + 3 + px;
  }
  if (position.y === "top") {
    y = -px;
  } else if (position.y === "bottom") {
    y = gridHeight - scrollbarDimension + 3 + px;
  }

  cy.get(parentSelector).trigger('mousemove', x, y, { force: true });
  if (ms) {
    cy.wait(ms);
  }
  return;
})

Cypress.Commands.add("dragEnd", { prevSubject: 'optional' }, (subject, gridSelector = 'div[class^="slickgrid_"]') => {
  cy.get(gridSelector).trigger('mouseup', { force: true });
  return;
})

export function getScrollDistanceWhenDragOutsideGrid(selector, viewport, dragDirection, fromRow, fromCol, px = 100) {
  return cy.convertPosition(viewport).then(_viewportPosition => {
    const viewportSelector = `${selector} .slick-viewport-${_viewportPosition.x}.slick-viewport-${_viewportPosition.y}`
    cy.getCell(fromRow, fromCol, viewport, { parentSelector: selector })
      .dragStart();
    return cy.get(viewportSelector).then($viewport => {
      const scrollTopBefore = $viewport.scrollTop();
      const scrollLeftBefore = $viewport.scrollLeft();
      cy.dragOutside(dragDirection, 300, px, { parentSelector: selector });
      return cy.get(viewportSelector).then($viewportAfter => {
        cy.dragEnd(selector);
        const scrollTopAfter = $viewportAfter.scrollTop();
        const scrollLeftAfter = $viewportAfter.scrollLeft();
        cy.get(viewportSelector).scrollTo(0, 0, { ensureScrollable: false });
        return cy.wrap({
          scrollTopBefore,
          scrollLeftBefore,
          scrollTopAfter,
          scrollLeftAfter
        });
      });
    });
  });
}

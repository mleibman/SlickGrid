/**
 * @typedef {('left'|'right')} xAllowed
 * @typedef {('top'|'bottom')} yAllowed
 *
 * Define allowed input position
 * @typedef {(xAllowed|yAllowed|'topLeft'|'topRight'|'bottomLeft'|'bottomRight')} AllowedInputPosition
 *
 * Define position object
 * @typedef {Object} Position
 * @property {xAllowed} x - horizontal
 * @property {yAllowed} y - vertical
 */

/**
 * Enum for position values
 * @constant
 * @enum {(xAllowed|yAllowed)}
 */
const POSITION = Object.freeze({
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
})

/**
 * Convert position string to object
 *
 * @param {AllowedInputPosition} position
 * @returns {Position}
 */
export function convertPosition(position) {
  let x = '';
  let y = '';
  const _position = position.toLowerCase();
  if (_position.includes(POSITION.LEFT)) {
    x = POSITION.LEFT;
  } else if (_position.includes(POSITION.RIGHT)) {
    x = POSITION.RIGHT;
  }
  if (_position.includes(POSITION.TOP)) {
    y = POSITION.TOP;
  } else if (_position.includes(POSITION.BOTTOM)) {
    y = POSITION.BOTTOM;
  }
  return { x, y };
}
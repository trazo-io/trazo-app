/**
 * How a farm's OTHER parcels are drawn around the one in focus: the parcel page's map card and
 * the boundary editor. White, thin, barely filled, below the focused parcel (zIndex), and never
 * clickable, so in the editor a click on a neighbour still adds a point to the outline being
 * drawn. The focused parcel keeps the green the parcel page has always used.
 */
export const NEIGHBOUR_OUTLINE: google.maps.PolygonOptions = {
  fillColor: '#FFFFFF',
  fillOpacity: 0.12,
  strokeColor: '#FFFFFF',
  strokeOpacity: 0.9,
  strokeWeight: 1.5,
  clickable: false,
  zIndex: 0
};

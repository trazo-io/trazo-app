/**
 * How a farm's OTHER parcels are drawn around the one in focus: the parcel page's map card and
 * the boundary editor. Theme blue.300: it holds up on satellite imagery (white vanished on a
 * bright field) and stays apart from the two colours these maps already mean something by,
 * green for the parcel in focus and orange for an outline still incomplete in the editor.
 * Below the focused parcel (zIndex) and never clickable, so in the editor a click on a
 * neighbour still adds a point to the outline being drawn.
 */
export const NEIGHBOUR_OUTLINE: google.maps.PolygonOptions = {
  fillColor: '#64B5F6',
  fillOpacity: 0.15,
  strokeColor: '#64B5F6',
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: false,
  zIndex: 0
};

/** The middle of an outline's bounding box: where its name label sits. */
export const outlineCenter = (path: Array<{ lat: number; lng: number }>) => {
  const lats = path.map((p) => p.lat);
  const lngs = path.map((p) => p.lng);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };
};

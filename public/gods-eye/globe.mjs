export function project(lon, lat, center = 0) {
 const r = Math.PI / 180, a = (lon - center) * r, b = lat * r;
 return { x: 200 + 170 * Math.cos(b) * Math.sin(a), y: 200 - 170 * Math.sin(b), visible: Math.cos(b) * Math.cos(a) >= 0 };
}

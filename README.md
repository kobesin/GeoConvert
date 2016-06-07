#GeoConvert

converting between geojson and gis type data(kml, gpx, shapefile)

Rreference the JavaScript file manually:
```html
<script src="dist/GeoConvert.min.js"></script>
```
note that coordinate transformations depend on proj4.js (this means proj4.js must be included before including the file).
```html
<script src="lib/proj4.js"></script>
```

Usage
-----
kml to geojson
```javascript
GeoConvert.kml2Geojson(kml);
```

geojson to kml
```javascript
GeoConvert.geojson2Kml(geojson);
```

gpx to geojson
```javascript
GeoConvert.gpx2Geojson(kml);
```

geojson to gpx
```javascript
GeoConvert.geojson2Gpx(geojson);
```

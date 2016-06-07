#GeoConvert

Converting between geojson and gis type data(kml, gpx, shapefile)

Rreference the JavaScript file manually:
```html
<script src="dist/GeoConvert.min.js"></script>
```
Note that coordinate transformations depend on proj4.js (this means proj4.js must be included before including the file).
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
shapefile to geojson
```javascript
//shapefile is a object that contain shp, dbf, prj? arrayBuffer
var shapefile = {};
shapefile.shp = arrayBuffer_shp;
shapefile.dbf = arrayBuffer_dbf;

//optional
shapefile.prj = arrayBuffer_prj;

GeoConvert.shapefile2Geojson(shapefile);
```

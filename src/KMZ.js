;
(function(window, document, undefined) {
  //kmz2geojsons. Depends on JSZip.
  GeoConvert.kmz2Geojsons = function(kmz, callback) {
    if (JSZip) {
      var count = 0;
      var zip = new JSZip();

      var kmls = [];
      var imgs = {};

      zip.loadAsync(kmz)
        .then(function(result) {
          for (var f in zip.files) {
            count++;

            var ext = zip.file(f).name.split(".").pop();
            if (ext === "kml") {
              // you now have every files contained in the loaded zip
              result.file(f).async("string").then(function success(content) {
                kmls.push(content);
                finishUnzip();
              }, function error(e) {
                // handle the error
                count--;
              });
            } else if (ext === "png" || ext === "jpg") {
              result.file(f).async("base64").then(function success(content) {
                var base64 = "data:image/" + ext + ";base64,";
                imgs[f] = base64 + content;

                finishUnzip();
              }, function error(e) {
                // handle the error
                count--;
              });
            } else {
              count--;
            }
          }
        });
    }

    function finishUnzip() {
      count--;
      if (count === 0) {
        var geojsons = [];
        kmls.forEach(function(kml){
          var geojson = GeoConvert.kml2Geojson(kml);
          geojson.features.forEach(function(feature){
            if (feature.style && feature.style.iconUrl && imgs[feature.style.iconUrl]) {
              feature.style.iconUrl = imgs[feature.style.iconUrl];
            }
          });

          geojsons.push(geojson);
        });

        callback && callback(geojsons);
      }
    }
  };
})(window, document);
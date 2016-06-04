function file2ArrayBuffer(file, callback) {
	var reader = new FileReader();

	// If we use onloadend, we need to check the readyState.
	reader.onloadend = function(evt) {
		if (evt.target.readyState == FileReader.DONE) { // DONE == 2
			callback(null, evt.target.result);
		} else {
			callback("error");
		}
	};

	// var blob = file.slice(0, file.size);
	// reader.readAsArrayBuffer(blob);
	reader.readAsArrayBuffer(file);
}

function file2Text(file, callback) {
	var reader = new FileReader();

	// If we use onloadend, we need to check the readyState.
	reader.onloadend = function(evt) {
		if (evt.target.readyState == FileReader.DONE) { // DONE == 2
			callback(null, evt.target.result);
		} else {
			callback("error");
		}
	};

	reader.readAsText(file);
}

function fileExtName(fileName) {
	return fileName.split(".").pop();
}
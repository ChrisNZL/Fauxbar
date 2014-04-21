function initJscolor() {
	try {
		if (jscolor) {
			setTimeout(jscolor.init, 1);
		}
	} catch(e) {
		setTimeout(initJscolor, 100);
	}
	/*if (jscolor) {
		setTimeout(jscolor.init, 1);
	} else {
		setTimeout(initJscolor, 100);
	}*/
}

// Update Fauxbar / Fauxbar Lite name texts
$(document).ready(function(){
	initJscolor();
	if (localStorage.extensionName && localStorage.extensionName.length) {
		$(".extensionName").html(localStorage.extensionName);
		$('select#option_openfauxbarfocus option[value="addressbox"]').text(localStorage.extensionName+"'s Address Box");
		$('select#option_openfauxbarfocus option[value="searchbox"]').text(localStorage.extensionName+"'s Search Box");
	}
});
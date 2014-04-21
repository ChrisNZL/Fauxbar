try {
	chrome.tabs.getCurrent(function(tab){
		chrome.tabs.update(tab.id, {selected:localStorage.option_openfauxbarfocus != "chrome"}, function(){
			$(document).ready(function(){
				var scriptsToLoad = [/*'md5-min.js',*/ 'fauxbar-2.js', 'common-1.js', 'fauxbar-1.js', 'menubar.js']
				var head = document.getElementById('head');
				for (var s in scriptsToLoad) {
					var newScript = document.createElement("script");
					newScript.setAttribute('src', '/js/'+scriptsToLoad[s]);
					head.appendChild(newScript);
				}
			});
		});
		window.currentTabId = tab.id;
	});
	var speech = localStorage.option_speech == 1 ? "x-webkit-speech" : "";
}
catch (e) {
	if (window.location.href.split('#reloaded=1').length == 1 && window.location.href.split('&reloaded=1').length == 1) {
		if (window.location.href == chrome.extension.getURL('/html/fauxbar.html')) {
			window.location.href += '#reloaded=1';
		} else {
			window.location.href += '&reloaded=1';
		}
		//window.location.reload();
		chrome.tabs.reload({bypassCache:true});
	} else {
		console.log(e);
		webkitNotifications.createNotification('/img/fauxbar48unhappy.png', localStorage.extensionName+' is unable to load.', 'Please view the page\'s developer tools console for details: ' +
			'Ctrl+Right-click > Inspect element > Console').show();
	}
}
$(document).ready(function(){
	localStorage.option_showMenuBarDate == 1 && $('#menubar').prepend('<menuDate>'+date(localStorage.option_menuBarDateFormat?localStorage.option_menuBarDateFormat:'l, j F Y')+'</menuDate>');
});
// Fauxbar Memory Helper background script

window.doEnable = false;
window.newState = "idle";

// Listen for when Fauxbar wants to restart itself
chrome.extension.onRequestExternal.addListener(function(request){
	if (request == "restart fauxbar") {
		chrome.management.getAll(function(extensions){
			for (var e in extensions) {
				if ((extensions[e].name == "Fauxbar" || extensions[e].name == "Fauxbar Lite") && extensions[e].enabled == true) {
					window.doEnable = true;
					var eId = extensions[e].id;
					setTimeout(function(){
						chrome.management.setEnabled(eId, false);
					}, 100);
				}
			}
		});
	}
});

// When Memory Helper disables Fauxbar, enable Fauxbar shortly after
chrome.management.onDisabled.addListener(function(extension) {
	if (window.doEnable == true && (extension.name == "Fauxbar" || extension.name == "Fauxbar Lite")) {
		var eId = extension.id;
		setTimeout(function(){
			chrome.management.setEnabled(eId, true, function(){
				window.doEnable = false;
			});
		}, 1000);
	}
});

// Poll to see when user goes idle
setInterval(function() {
	// If user has been idle for 10 minutes...
	chrome.idle.queryState(60 * 10, function(newState){
		if (newState == "idle" && window.newState == "active") {
			window.newState = "idle";
			chrome.management.getAll(function(extensions){
				for (var e in extensions) {
					if ((extensions[e].name == "Fauxbar" || extensions[e].name == "Fauxbar Lite") && extensions[e].enabled == true) {
						chrome.extension.sendRequest(extensions[e].id, "restart fauxbar?");
					}
				}
			});
		} else if (newState == "active") {
			window.newState = "active";
		}
	});
}, 60000); // Check idle state every 60 seconds
// This content script gets injected/executed after user right-clicks on a search field and clicks on the "Fauxbar: Add as search engine..." context menu item.
// Context menu should be enabled/disabled via contextMenu-hoverToggle.js, but just in case it still gets shown, error checking below exists
var focusedEl = $('form input[type="text"]:focus, form input[type="search"]:focus').first();
if (focusedEl && focusedEl.length && !focusedEl.attr("name")) {
	chrome.runtime.sendMessage(null, {action:"invalid search field", reason:"no name"});
}
else if (focusedEl && focusedEl.length) {
	var loc = window.location;
	// Gather form data and send to background page for "add search engine" window preparation
	var processFormData = function(jsonUrl, shortname) {
		var form = focusedEl.parents("form").first();
		var paramsArray = form.serializeArray();
		var paramsString = form.serialize();
		var searchFieldName = focusedEl.attr("name");
		var method = form.attr("method") ? form.attr("method") : "get";
		var action = form.attr("action") ? form.attr("action") : null;
		var searchUrl = '';
		if (action) {
			// If action is a whole URL...
			if (action.toLowerCase().substr(0,7) == "http://" || action.toLowerCase().substr(0,8) == "https://") {
				searchUrl = action;
			} else {
				searchUrl = loc.protocol + "//" + (loc.port == 80 ? loc.hostname : loc.host);
				if (action.substr(0,1) == "/") {
					searchUrl += action;
				} else {
					var pathParts = loc.pathname.split("/");
					pathParts.pop();
					searchUrl += "/" + pathParts.join("/") + action;
				}
			}
		} else {
			searchUrl = loc.protocol + "//" + (loc.port == 80 ? loc.hostname : loc.host) + loc.pathname + loc.search;
		}

		chrome.runtime.sendMessage(null, {
			action: "show 'add search engine' pop-up",
			engine: {
				method: method,
				searchUrl: searchUrl,
				searchFieldName: searchFieldName,
				paramsArray: paramsArray,
				paramsString: paramsString,
				sourceUrl: loc.href,
				hostname: loc.hostname,
				jsonUrl: jsonUrl ? jsonUrl : '',
				shortname: shortname ? shortname : ''
			}
		});
	};

	// Get OpenSearch suggestion URL if available, and/or send info to background page for pop-up creation
	var openSearch = $('head link[rel="search"][type="application/opensearchdescription+xml"]');
	if (openSearch && openSearch.attr("href")) {
		var openSearchUrl = openSearch.attr("href");
		// If link href for xml file is relative...
		if (openSearch.attr("href").substr(0,7) != "http://" && openSearch.attr("href").substr(0,8) != "https://") {
			openSearchUrl = loc.protocol + "//" + (loc.port == 80 ? loc.hostname : loc.host);
			if (openSearch.attr("href").substr(0,1) == "/") {
				openSearchUrl += openSearch.attr("href");
			} else {
				var osPathParts = loc.pathname.split("/");
				osPathParts.pop();
				openSearchUrl += "/" + osPathParts.join("/") + openSearch.attr("href");
			}
		}
		$.ajax({
			type: "GET",
			url: openSearchUrl,
			dataType: "xml",
			timeout: 30000,
			success: function(xml){
				var jsonEl = $('Url[type="application/x-suggestions+json"]', xml);
				var jsonUrl = '';
				var shortname = $('ShortName',xml) ? $('ShortName',xml).text() : '';
				if (jsonEl) {
					jsonUrl = jsonEl.attr("template");
				}
				processFormData(jsonUrl, shortname);
			},
			error: function(){
				processFormData('','');
			}
		});
	} else {
		processFormData();
	}
} else {
	if ($("textarea:focus").length) {
		chrome.runtime.sendMessage(null, {action:"invalid search field", reason:"textarea"});
	}
	else if ($('input[type="password"]:focus').length) {
		chrome.runtime.sendMessage(null, {action:"invalid search field", reason:"password"});
	}
	else if (!$('input[type="text"]:focus, input[type="search"]:focus').length) {
		chrome.runtime.sendMessage(null, {action:"invalid search field", reason:"invalid type"});
	}
	else if (!$("input:focus").parents("form").length) {
		chrome.runtime.sendMessage(null, {action:"invalid search field", reason:"no parent form"});
	}
	else {
		chrome.runtime.sendMessage(null, {action:"invalid search field"});
	}
}
// JavaScript for the pop-up "Fauxbar: Add Search Engine" window

// http://www.somacon.com/p355.php
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
};

$(document).ready(function(){
	window.document.title = localStorage.extensionName + ': Add Search Engine';
	$("#add").text('Add to '+localStorage.extensionName);

	var bg = chrome.extension.getBackgroundPage();
	var engine = bg.newSearchEngineInfo;
	if (!engine) {
		window.close();
	}
	$("style").append('* { font-family:'+localStorage.option_font+', Ubuntu, Lucida Grande, Segoe UI, Arial, sans-serif; }');

	// Get Fauxbar's existing search engines
	var engines = [];
	bg.db.transaction(function(tx){
		tx.executeSql('SELECT shortname, keyword FROM opensearches', [], function(tx, results){
			for (var i = 0; i < results.rows.length; i++) {
				engines[i] = results.rows.item(i);
			}
		});
	});

	var params = engine.paramsString.split("&");
	for (var p in params) {
		var parts = params[p].split("=");
		if (parts[0] == engine.searchFieldName) {
			params[p] = parts[0]+"={searchTerms}";
		}
	}

	$("#url").val(engine.searchUrl+"?"+params.join("&"));
	if (engine.jsonUrl.length) {
		$("#suggestionsUrl").val(engine.jsonUrl);
	} else {
		$("tr#suggestions").remove();
		$("span").remove();
	}

	var name;
	if (engine.shortname.length) {
		name = engine.shortname;
	} else {
		name = engine.hostname.substr(0,4) == "www." ? engine.hostname.substr(4) : engine.hostname;
		name = name.substr(0,1).toUpperCase() + name.substr(1);
	}

	var checkForErrors = function() {
		var error = false;
		var shortnameError = false;
		var keywordError = false;
		if (!$("#searchEngineName").val().trim().length) {
			$("#searchEngineName").attr("title","Search engine name can not be blank.");
			shortnameError = true;
			error = true;
		}
		for (var e in engines) {
			if (engines[e].shortname.toLowerCase() == $("#searchEngineName").val().trim().toLowerCase()) {
				$("#searchEngineName").attr("title","A search engine is already using this name.");
				shortnameError = true;
				error = true;
			}
			if ($("#keyword").val().trim().length && engines[e].keyword == $("#keyword").val()) {
				keywordError = true;
				error = true;
			}
		}
		if (!$("#url").val().trim()) {
			error = true;
			$("#url").addClass("error").attr("title","Search URL can not be blank.");
		}
		else if (!strstr($("#url").val(), "{searchTerms}")) {
			error = true;
			$("#url").addClass("error").attr("title","Search URL must contain {searchTerms}");
		}
		else {
			$("#url").removeClass("error").attr("title",$("#url").val());
		}

		if ($("tr#suggestions").length) {
			if (!strstr($("#suggestionsUrl").val(),"{searchTerms}")) {
				error = true;
				$("#suggestionsUrl").addClass("error").attr("title","Suggestion URL must either contain {searchTerms} or be left completely blank.");
			}
			else {
				$("#suggestionsUrl").removeClass("error").attr("title",$("#suggestionsUrl").val());
			}
		}

		keywordError ? $("#keyword").addClass("error").attr("title","A search engine is already using this keyword.") : $("#keyword").removeClass("error").attr("title","");
		shortnameError ? $("#searchEngineName").addClass("error") : $("#searchEngineName").removeClass("error").attr("title","");
		$("#add").prop("disabled",error);
		return error;
	};

	$("#searchEngineName")
		.val(name)
		.css("background-image","url(chrome://favicon/"+engine.sourceUrl+")")
		.css("background-position", "3px " + ($("#searchEngineName").outerHeight()-17)/2 +"px")
		.select();

	$("#cancel").live("click", function(){
		window.close();
	});
	$("*").live("keydown", function(e){
		e.keyCode == 27 && window.close();
	});
	$("input").live("keyup", checkForErrors);
	$("input").live("change", checkForErrors);

	var popupHeight = $("body").outerHeight() + 45;
	chrome.windows.getCurrent(function(win){
		chrome.windows.update(win.id, {
			height: popupHeight,
			top: parseInt((window.screen.height - popupHeight) / 2),
			left: parseInt((window.screen.width - win.width) / 2)
		});
	});

	var addEngine = function(){
		if (checkForErrors()) {
			$(".error").first().focus();
			$("button").prop("disabled",false);
			return false;
		}
		$(":focus").blur();
		$("button, input").prop("disabled",true);
		$("*").css("cursor","progress");
		bg.db.transaction(function(tx) {
			tx.executeSql('DELETE FROM opensearches WHERE shortname = ?', [$("#searchEngineName").val().trim()]);
			var suggestUrl = $("#suggestionsUrl") && $("#suggestionsUrl").length ? $("#suggestionsUrl").val().trim() : '';
			tx.executeSql('INSERT INTO opensearches (shortname, iconurl, searchurl, xmlurl, xml, isdefault, method, suggestUrl, keyword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[$("#searchEngineName").val().trim(), engine.sourceUrl, $("#url").val().trim(), "", "", "0", engine.method.toLowerCase(), suggestUrl, $("#keyword").val().trim()]);
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			chrome.runtime.sendMessage(null, 'backup search engines');
			if (localStorage.option_autoSaveToCloud == 1) {
				chrome.runtime.sendMessage(null, 'Save options to cloud');
			}
			window.close();
		});
	};

	$("#add").live("click",addEngine);
	$("input").live("keyup", function(e){
		if (e.keyCode == 13) {
			addEngine();
		}
	});
	setTimeout(checkForErrors,10);
});
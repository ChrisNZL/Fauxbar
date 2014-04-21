// This file contains functions that don't need to be loaded ASAP

// Check to see if issue 47 is present and needs to be taken care of
if (localStorage.issue47 == 1) {
	var bgPage = chrome.extension.getBackgroundPage();
	if (!bgPage.reindexing) {
		var tabId = false;
		chrome.tabs.getAllInWindow(null, function(tabs){
			for (var t in tabs) {
				if (tabs[t].url == chrome.extension.getURL("/html/issue47.html")) {
					tabId = tabs[t].id;
					break;
				}
			}
			if (tabId) {
				chrome.tabs.update(tabId, {selected:true}, function(){
					chrome.tabs.getCurrent(function(tab){
						chrome.tabs.remove(tab.id);
					});
				});
			} else {
				window.location = chrome.extension.getURL("/html/issue47.html");
			}
		});
	}
}

// http://stackoverflow.com/questions/986937/javascript-get-the-browsers-scrollbar-sizes
function getScrollBarWidth () {
  var inner = document.createElement('p');
  inner.style.width = "100%";
  inner.style.height = "200px";

  var outer = document.createElement('div');
  outer.style.position = "absolute";
  outer.style.top = "0px";
  outer.style.left = "0px";
  outer.style.visibility = "hidden";
  outer.style.width = "200px";
  outer.style.height = "150px";
  outer.style.overflow = "hidden";
  outer.appendChild (inner);

  document.body.appendChild (outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = 'scroll';
  var w2 = inner.offsetWidth;
  if (w1 == w2) w2 = outer.clientWidth;

  document.body.removeChild (outer);

  return (w1 - w2);
};

// http://phpjs.org/functions/strip_tags:535
function strip_tags (input, allowed) {
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

// Tell the tab to go to a URL.
function goToUrl(url, fromClickedResult, dontResolve) {
	if (window.keywordEngine && !window.executingKeywordSearch) {
		submitOpenSearch(url);
		return;
	}
	url = url.trim();
	if ($('.result[href="'+url+'"] .result_url .switch').length > 0) {
		chrome.tabs.getAllInWindow(null, function(tabs){
			for (var t in tabs) {
				if (tabs[t].url == url) {
					chrome.tabs.update(tabs[t].id, {selected:true});

					// close tab if the tab just had Fauxbar open to switch to find a tab to switch to
					if (history.length == 1) {
						chrome.tabs.getCurrent(function(tab){
							chrome.tabs.remove(tab.id);
						});
					}
					updateHash();
					return false;
				}
			}
		});
		return false;

	// If we're editing tiles and user has pressed Enter, add tile instead of visiting URL.
	} else if (window.tileEditMode && window.tileEditMode == true) {
		if ($('.result[href="'+url+'"]').length > 0) {
			addTile($('.result[href="'+url+'"]'));
		} else {
			setTimeout(function(){
				$("#awesomeinput").focus();
			}, 10);
		}
		return false;
	}

	if (fromClickedResult) {
		$("#awesomeinput").focus();
		return true;
	}

	var urlIsValid = false;
	if (substr_count(url, " ") == 0) {
		var testUrl = url.toLowerCase();
		if (
			testUrl.substr(0,7) != 'http://' &&
			testUrl.substr(0,8) != 'https://' &&
			testUrl.substr(0,6) != 'ftp://' &&
			testUrl.substr(0,8) != 'file:///' &&
			testUrl.substr(0,9) != 'chrome://' &&
			testUrl.substr(0,6) != 'about:' &&
			testUrl.substr(0,12) != 'view-source:' &&
			testUrl.substr(0,17) != 'chrome-extension:' &&
			testUrl.substr(0,5) != 'data:' &&
			testUrl.substr(0,11) != 'filesystem:'
		) {
			if (substr_count(url, ".") == 0) {
				// it's a search!
			}
			else {
				if ($("#awesomeinput").getSelection().length > 0 && $(".autofillmatch").length == 1 && strstr($(".autofillmatch").attr("url"), url)) {
					url = $(".autofillmatch").attr("url");
				}
				else {
					url = 'http://'+url;
				}
				urlIsValid = true;
			}
		} else {
			urlIsValid = true;
		}
	} else {
		var firstPart = explode(" ", url)[0];
		if (strstr(firstPart, "://") && substr_count(firstPart, "/") >= 3) {
			urlIsValid = true;
		}
	}

	// Check database to see if input is a valid URL that has been visited before
	if (!urlIsValid && !dontResolve && ( url.split(' ').length == 1 || strstr(url.split(' ')[0],'/'))) {
		hideResults();
		window.db.readTransaction(function(tx){
			tx.executeSql('SELECT url FROM urls WHERE url LIKE ? LIMIT 1', ['http://'+url.split('/')[0]+'%'], function(tx, results){
				if (results.rows.length > 0) {
					// URL (or domain at least) exists; URL is valid
					goToUrl('http://'+url, false, true);
				} else {
					// URL seems to be invalid, do Ajax GET next to check further
					goToUrl(url, false, -1);
				}
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
		return;
	}
	
	// Use Ajax to see if input resolves to a valid URL
	if (!urlIsValid && dontResolve == -1 && ( url.split(' ').length == 1 || strstr(url.split(' ')[0],'/')) && localStorage.option_useAjaxToDetectIntranetUrls == 1) {
		hideResults();
		$.ajax({
			async: true,
			cache: true,
			timeout: 1000,
			url: 'http://'+url.split('/')[0],
			success: function(){
				// URL is valid
				goToUrl('http://'+url, false, true);
			},
			error: function(a,b,c) {
				if (c.code && c.code != 101) { // c.name == 'NETWORK_ERR'
					// URL is valid (page returned an error code but the page exists regardless)
					goToUrl('http://'+url, false, true);
				}
				else {
					// URL could not be found, URL is invalid
					goToUrl(url, false, true);
				}
			}
		});
		return;
	}

	if (!urlIsValid) {
		if (localStorage.option_fallbacksearchurl && localStorage.option_fallbacksearchurl.length && strstr(localStorage.option_fallbacksearchurl, "{searchTerms}")) {
			url = str_replace("{searchTerms}", urlencode(url), localStorage.option_fallbacksearchurl);
		} else {
			url = 'https://www.google.com/search?btnI=&q='+urlencode(url);
		}
	} else if (!window.keywordEngine && !window.usedSearchBox) {
		addTypedVisitId(url);
	}
	delete window.usedSearchBox;

	if (!window.altReturn) {
		$("#awesomeinput").change();
		hideResults();
		updateHash();
	}
	window.goingToUrl = url;

	if (window.altReturn) {
		delete window.altReturn;
		var selected = true;
		if (window.middleMouse && window.middleMouse == 1) {
			selected = false;
			delete window.middleMouse;
		}
		recordInputUrl(url);
		chrome.tabs.create({url:url, selected:selected});
		if (window.keywordEngine) {
			setTimeout(function(){
				$("#awesomeinput").focus();
			}, 100);
		}
	} else {
		chrome.tabs.getCurrent(function(tab){
			recordInputUrl(url);
			chrome.tabs.update(tab.id, {url:url});
		});
	}

	if (window.prerenderedUrl && window.prerenderedUrl == url) {
		chrome.runtime.sendMessage(null, "process prerendered page");
	}
}

function recordInputUrl(url) {
	if (window.actualUserInput && window.actualUserInput.length) {
		chrome.runtime.sendMessage(null, {action:"record input url", input:window.actualUserInput, url:url});
	}
}

function deleteHistoryUrl(url, bookmarkId) {
	if (openDb() && localStorage.option_quickdelete_confirm == 0 || confirm("Delete \""+url+"\" from your Chrome browsing history?"
	 + (bookmarkId > 0 ? "\n\nYour bookmark(s) for this URL will remain intact, though they may seem to disappear from Fauxbar for a moment." : ""))) {
		window.db.transaction(function(tx){
			tx.executeSql('DELETE FROM urls WHERE url = ? AND type = 1', [url]);
			tx.executeSql('UPDATE urls SET frecency = ? WHERE url = ?', [localStorage.option_frecency_unvisitedbookmark, url]);
			tx.executeSql('UPDATE thumbs SET frecency = -1 WHERE url = ?', [url]);
			tx.executeSql('UPDATE thumbs SET frecency = -2 WHERE url = ? AND manual != 1', [url]);
			tx.executeSql('DELETE FROM inputurls WHERE url = ?', [url]);
			chrome.history.deleteUrl({url:url});
			var nextNumber = $(".arrowed").next(".result").attr("number");
			$(".arrowed").remove();
			$('.result[number="'+nextNumber+'"]').addClass("arrowed");
		}, function(t){
			errorHandler(t, getLineInfo());
		});
		return true;
	}
}

// Record that the user is dragging the Boxes' handle separator
$("#handle").bind("mousedown", function(){
	window.handleStatus = "down";
	if (localStorage.indexComplete == 1) {
		$("*").css("cursor", "col-resize");
	}
	return false;
});

// When the user releases the mouse button...
$("*").live("mouseup", function(){
	// If the user was dragging the Boxes' handle...
	if (window.handleStatus == 'down') {
		// Save the new width setting
		if ($("#addresswrapper").parent("td").attr("id") == "leftcell") {
			localStorage.option_leftcellwidthpercentage = window.leftCellWidthPercentage;
		} else {
			localStorage.option_leftcellwidthpercentage = 100 - window.leftCellWidthPercentage;
		}
		// Resize the results/queries/suggestions containers
		if ($(".result").length > 0) {
			if ($(".historyresult").length > 0 || $(".jsonresult").length > 0) {
				$("#opensearch_results").html("").css("display","none");
				getSearchSuggestions();
			} else {
				getResults();
			}
		}
		// If we're not on the reindexing progress page, make the cursor style go back to normal
		if (localStorage.indexComplete == 1) {
			$("*").css("cursor", "");
		}
		// Finish up
		window.handleStatus = 'up';
		$("input:focus").blur();
		changeInputBoxDisplayOrder(true);
		return false;
	}

	// If we're done rearranging the search engines, save the changes and update the order
	if (window.draggingOsRow == true) {
		window.draggingOsRow = false;
		var dottedOSRowOffset = $(".dotted_os_row").offset();
		$("#dragging_os_row").animate({top:dottedOSRowOffset.top+"px", left:dottedOSRowOffset.left+"px"}, 100, function(){
			$(".dotted_os_row").after($(".opensearch_optionrow:hidden"));
			$("#dragging_os_row").remove();
			$(".opensearch_optionrow").css("display","table-row");
			$(".dotted_os_row").remove();
			if (openDb()) {
				window.db.transaction(function(tx){
					tx.executeSql('UPDATE opensearches SET position = 0', []);
					var orderCount = 0;
					$($(".opensearch_optionrow").get().reverse()).each(function() {
						orderCount++;
						tx.executeSql('UPDATE opensearches SET position = ? WHERE shortname = ?', [orderCount, $("td.shortname input",this).val()]);
					});
				}, function(t){
					errorHandler(t, getLineInfo());
				}, function(){
					chrome.runtime.sendMessage(null, "backup search engines");
				});
				populateOpenSearchMenu();
			}
		});
	}
});

// When user clicks an Address Box result, decide what to do...
window.clickResult = function(resultEl) {
	if (localStorage.option_switchToTab != "disable") {
		chrome.tabs.getAllInWindow(null, function(tabs){
			for (var t in tabs) {
				if (tabs[t].url == $(resultEl).attr("url")) {
					chrome.tabs.update(tabs[t].id, {selected:true});
					// Close current tab if the tab just had Fauxbar open to switch to find a tab to switch to
					if (history.length == 1) {
						chrome.tabs.getCurrent(function(tab){
							chrome.tabs.remove(tab.id);
						});
					}
					updateHash();
					return false;
				}
			}
		});
	}
	// Since clicking takes focus away from the Address Box, regain focus and possibly reselect auto-filled text/URL
	setTimeout(function(){
		window.dontGetResults = true;
		if ($("#awesomeinput").val().substr(0, window.actualUserInput.length) == window.actualUserInput) {
			$("#awesomeinput").focus().setSelection(window.actualUserInput.length, $("#awesomeinput").val().length);
		} else {
			$("#awesomeinput").focus();
		}
	}, 1);

	// Don't let the click go through if the result is a "Switch to tab" result
	if (strstr($(resultEl).text(), "Switch to tab")) {
		return false;
	// But if it's a normal click, let it go through
	} else {
		addTypedVisitId($(resultEl).attr("url"));
		window.goingToUrl = $(resultEl).attr("url");
		updateHash();
		return true;
	}
};

// Set the var saying that the user is not rearranging the order of the Search Box's search engines (this should probably go under / OPTIONS / below
window.draggingOsRow = false;

// When the user moves their mouse...
$(document).mousemove(function(e){

	// Chrome likes to trigger mousemove() when results appear, even if the mouse hasn't moved. Bad Chrome!
	// ^ So this incorrectly hovers over results, if the mouse cursor is over a result when it appears, even if the mouse hasn't moved. Not good!
	// So let's record the actual coordinates of the mouse, and if they change from their last recorded spot, then we know that the mouse has moved for real.
	window.mouseHasMoved = false;
	if (window.mousemovePageX && window.mousemovePageY && (window.mousemovePageX != e.pageX || window.mousemovePageY != e.pageY)) {
		window.mouseHasMoved = true;
	}
	window.mousemovePageX = e.pageX;
	window.mousemovePageY = e.pageY;

	// If search queries/suggestions are displayed but the Search Box isn't focused for some reason (maybe user just clicked on a result?), focus the Search Box.
	if ($(".historyresult, .jsonresult").length && $("#opensearchinput").val().length && !$("#opensearchinput:focus").length && !window.keywordEngine) {
		$("#opensearchinput").focus();
	}

	// If user is dragging the handle between the two Boxes, apply the new widths so the user can see what they're changing
	if (window.handleStatus == 'down') {
		var leftCellWidth = e.pageX - $("#leftcell").offset().left;
		leftCellWidth = (leftCellWidth / $(".wrapper table").first().outerWidth()) * 100;
		window.leftCellWidthPercentage = leftCellWidth;
		$("#leftcell").css("width", leftCellWidth+"%");
		$("#rightcell").css("width", "auto");
	}

	// If user is dragging a search engine from the Options page to rearrange the order, make the clicking and dragging work :)
	if (window.draggingOsRow == true && window.mouseHasMoved == true) {
		$(".opensearch_optionrow").css("opacity",1);
		$("#dragging_os_row").css("top", e.pageY-10+"px");
		$(".dotted_os_row").remove();
		$("table#opensearchoptionstable tr.opensearch_optionrow").each(function(){
			if (e.pageY < $(this).offset().top+$(this).outerHeight() && $(".dotted_os_row").length == 0) {
				$(this).before('<tr class=".opensearch_optionrow dotted_os_row" style="height:'+$(this).outerHeight()+'px;"><td colspan="4">&nbsp;</td></tr>');
			}
		});
		if ($(".dotted_os_row").length == 0) {
			var lastOptionRow = "table#opensearchoptionstable tr.opensearch_optionrow:last";
			$(lastOptionRow).after('<tr class=".opensearch_optionrow dotted_os_row" style="height:'+$(lastOptionRow).outerHeight()+'px;"><td colspan="4">&nbsp;</td></tr>');
		}
	}
});

// Submit the Search Box's input as a search to the selected search engine.
// Need to create a simple URL if it's a GET, otherwise create a form and POST it.
function submitOpenSearch(query) {
	var selectedMenuItem = '.menuitem[shortname="'+(window.keywordEngine ? window.keywordEngine.shortname : window.openSearchShortname)+'"]';
	var searchUrl = $(selectedMenuItem).attr("searchurl");
	var openSearchInputVal = query ? query : (window.keywordEngine ? $("#awesomeinput").val() : $("#opensearchinput").val());
	searchUrl = str_replace('{searchTerms}', urlencode(openSearchInputVal), searchUrl);

	if (localStorage.option_recordsearchboxqueries == 1 && openDb()){
		window.db.transaction(function(tx){
			tx.executeSql('INSERT INTO searchqueries (query) VALUES (?)', [openSearchInputVal.trim()]);
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}

	if ($(selectedMenuItem).length && $(selectedMenuItem).attr("method") && $(selectedMenuItem).attr("method").length && $(selectedMenuItem).attr("method").toLowerCase() == 'get') {
		if (window.keywordEngine) {
			window.executingKeywordSearch = true;
		} else {
			window.usedSearchBox = true;
		}
		goToUrl(searchUrl);
	}
	else {
		$("#tempform").remove();
		$("body").append('<form method="post" action="'+ searchUrl.split('?')[0] +'" id="tempform" style="position:absolute;z-index:-999;opacity:0"></form>');
		var bits = explode('?', searchUrl);
		var params = explode('&', bits[1]);
		var elName = '';
		var elVal = '';
		for (var p in params) {
			elVal = '';
			elName = params[p].split('=')[0];
			if (params[p].split('=').length == 2) {
				elVal = params[p].split('=')[1];
			}
			$('#tempform').append('<input type="hidden" name="'+elName+'" value="'+elVal+'" />\r\n');
		}
		if (window.altReturn) {
			delete window.altReturn;
			$("#tempform").attr("target","_blank");
			if (window.middleMouse) {
				chrome.tabs.getCurrent(function(tab){
					$("#tempform").submit();
					setTimeout(function() {
						chrome.tabs.update(tab.id, {selected:true});
					}, 1);
				});
			} else {
				$("#tempform").submit();
			}
		} else {
			$("#tempform").submit();
		}
	}
}

// Listen to either the background page, or the Memory Helper...
chrome.runtime.onMessage.addListener(function (request) {

	// If Fauxbar has finished indexing history and bookmarks, reload the Fauxbar page to get rid of the progress div
	if (request == "DONE INDEXING") {
		window.location.reload();
	}

	// Display error message
	else if (request.action == "displayError") {
		$("#errorLine").html(request.errorLine);
		$("#errorMessage").html(request.errorMessage);
		$("#errorBox").css("display","inline-block");
	}

	// Enter manual page tile editing mode
	else if (request.action && request.action == "editPageTiles") {
		if (!window.tileEditMode) {
			chrome.tabs.getCurrent(function(tab){
				if (request.tabId == tab.id) {
					enterTileEditMode();
				}
			});
		}
	}

	// Change to options page if user wants to open Fauxbar's options
	else if (request.action && request.action == "openOptions") {
		chrome.tabs.getCurrent(function(tab){
			if (tab.id == request.tabId) {
				window.location.reload();
			}
		});
	}

	// Update the index progress meter bar and status message
	else if (request.message && request.message == "currentStatus") {
		$("button").last().prop("disabled",true);
		$("body").css("cursor","progress");
		$("#awesomeinput").blur();
		$("#currentstatus").html(request.status);
		if (request.step) {
			window.newProgress = (request.step-1) * 100;
			window.curProgress = $("progress").attr("value");
			if (!increaseProgress) {
				function increaseProgress() {
					$("button").last().html("Please Wait...");
					if (window.curProgress < window.newProgress) {
						window.curProgress++;
						$("progress").attr("value",window.curProgress);
						setTimeout(increaseProgress, 1);
					}
				}
			}
			increaseProgress();
		}
	}

	// Update Address Box result links, mainly to show the "Switch to tab" text or not
	else if (request.message && request.message == "refreshResults" && $(".result").length > 0 && $("#awesomeinput.description").length == 0 && localStorage.option_switchToTab != "disable") {
		chrome.tabs.getAllInWindow(null, function(tabs){
			var theTabs = [];
			for (var t in tabs) {
				if (window.currentTabId != tabs[t].id) {
					theTabs[tabs[t].url] = tabs[t].url;
				}
			}
			$(".result").each(function(){
				if (theTabs[$(this).attr("url")]) {
					if (localStorage.option_switchToTab == "replace") {
						$(this).children(".result_url").html('<img src="/img/tabicon.png" style="opacity:.6" /> <span class="switch">Switch to tab</span>');
					} else {
						$(this).children(".result_url").html('<img src="/img/tabicon.png" style="opacity:.6" /> <span class="switch">Switch to tab:</span> '+$(this).children(".result_url").html());
					}
				} else {
					$(this).children(".result_url").html($(this).children(".result_url_hidden").html());
				}
			});
			setTimeout(toggleSwitchText, 1);
		});
	}
});

function enterTileEditMode() {
	var newScript = document.createElement("script");
	newScript.setAttribute('src', '/js/tilemode.js');
	document.getElementById('head').appendChild(newScript);
}

$("body").live("mousedown", function(e){
	if (e.target.className != "menuOption" && e.target.className != "menuOption disabled" && e.target.id != "contextMenu") {
		removeContextMenu();
	}
});
$(window).bind("blur", function(){
	removeContextMenu();
});
$("*").bind("keydown", function(){
	removeContextMenu();
});

function removeContextMenu() {
	$("#contextMenu").remove();
	setTimeout(function(){
		$(".glow").removeClass("glow");
	}, 1);
	$(".rightClickedTile").removeClass("rightClickedTile");
	$(".rightClickedResult").removeClass("rightClickedResult");
	$(".rightClickedApp").removeClass("rightClickedApp");
}

function showContextMenu(e) {
	// Prevent context menu from appearing on menubar bookmark folders
	if (e.target.tagName == 'A' && !e.target.href) {
		return false;
	}
	var html = '';
	var usingSuperTriangle = e.currentTarget && e.currentTarget.className && (strstr(e.currentTarget.className,"superselect") ? true : false);
	if (usingSuperTriangle == true) {
		var y = $(".superselect").first().offset().top+$(".superselect").first().outerHeight();
		var x = $(".superselect").first().offset().left;
	}
	else if ($("#opensearch_triangle .glow").length) {
		var y = $("#opensearch_triangle").offset().top+$("#opensearch_triangle").outerHeight();
		var x = $("#opensearch_triangle").offset().left;
	}
	else {
		var y = e.pageY;
		var x = e.pageX;
	}
	html += '<div id="contextMenu" style="top:'+y+'px; left:'+x+'px; opacity:0" '+(usingSuperTriangle ? 'class="supercontext"' : '')+'>';
	var cutCopyPaste = false;

	if ($('input[type="text"]:focus, textarea:focus').length) {
		var currentVal = $('input[type="text"]:focus, textarea:focus').val();
		if ($('input[type="text"]:focus, textarea:focus').getSelection().length) {
			html += '	<div class="menuOption">Cut</div>';
			html += '	<div class="menuOption">Copy</div>';
			cutCopyPaste = true;
		}

		document.execCommand("paste");
		var newVal = $('input[type="text"]:focus, textarea:focus').val();
		document.execCommand("undo");
		if (newVal != currentVal) {
			html += '	<div class="menuOption">Paste</div>';
			cutCopyPaste = true;
			if ($("#awesomeinput:focus").length && !window.keywordEngine && !window.tileEditMode) {
				html += '	<div class="menuOption">Paste &amp; Go</div>';
			} else if ($("#opensearchinput:focus").length || ($("#awesomeinput:focus").length && window.keywordEngine)) {
				html += '	<div class="menuOption">Paste &amp; Search</div>';
			}
		}

		if ($('input[type="text"]:focus, textarea:focus').getSelection().length) {
			html += '	<div class="menuOption">Delete</div>';
			cutCopyPaste = true;
		}

		if ($('input[type="text"]:focus, textarea:focus').val().length && $('input[type="text"]:focus, textarea:focus').getSelection().length != $('input[type="text"]:focus, textarea:focus').val().length) {
			if (cutCopyPaste == true) {
				html += '	<div class="menuHr"></div>';
			}
			html += '	<div class="menuOption">Select All</div>';
			cutCopyPaste = true;
		}
		if (cutCopyPaste == true) {
			html += '	<div class="menuHr"></div>';
		}
	}

	delete window.contextHref;
	delete window.linkIsApp;
	delete window.rightClickedApp;
	delete window.rightClickedResult;

	if (e.target.href && e.target.href.length) {
		window.contextHref = e.target.href;
		$(e.target).addClass("rightClickedTile");
		if (strstr(e.target.className, "result")) {
			$(e.target).addClass("rightClickedResult");
			window.rightClickedResult = e.target;
		}
		else if (strstr(e.target.className, "app")) {
			$(e.target).addClass("rightClickedApp");
			if (!strstr(e.target.href,"https://chrome.google.com/webstore")) {
				window.linkIsApp = true;
				window.rightClickedApp = e.target;
			}
		}
	} else if ($(e.target).parents('a').first().length) {
		window.contextHref = $(e.target).parents('a').first().attr("href");
		$(e.target).parents('a').first().addClass("rightClickedTile");
		if ($(e.target).parents('.result').length) {
			$(e.target).parents('.result').first().addClass("rightClickedResult");
			window.rightClickedResult = $(e.target).parents('.result').first();
		}

		$(e.target).parents('.app').first().addClass("rightClickedApp");
		if ($(e.target).parents('.app').length && !strstr($(e.target).parents('.app').first().attr("href"), "https://chrome.google.com/webstore")) {
			window.linkIsApp = true;
			window.rightClickedApp = $(e.target).parents('.app').first();
		}
	}

	if (window.contextHref && !window.tileEditMode) {
		var loadFile = "/html/loadfile.html#";
		if (window.contextHref.substr(0,loadFile.length) == loadFile) {
			window.contextHref = window.contextHref.substr(loadFile.length);
		}
		if (window.linkIsApp) {
			html += '	<div class="menuOption disabled"><b>'+$(window.rightClickedApp).attr("appname")+'</b></div>';
			html += '	<div class="menuHr"></div>';
			html += '	<div class="menuOption">Open App in New Tab</div>';
			html += '	<div class="menuOption">Open App in New Window</div>';
			html += '	<div class="menuOption">Copy Link Address</div>';
			html += '	<div class="menuHr"></div>';
			html += '	<div class="menuOption">Uninstall</div>';
		} else {
			html += '	<div class="menuOption">Open Link in New Tab</div>';
			html += '	<div class="menuOption">Open Link in New Window</div>';
			html += '	<div class="menuOption">Open Link in Incognito Window</div>';
			html += '	<div class="menuOption">Copy Link Address</div>';
			html += '	<div class="menuHr"></div>';
			if (window.rightClickedResult) {
				if ($(window.rightClickedResult).attr("bmid") > 0) {
					html += '	<div class="menuOption">Edit Bookmark...</div>';
				} else {
					html += '	<div class="menuOption">Add Bookmark</div>';
				}
				html += '	<div class="menuHr"></div>';

				html += '	<div class="menuOption">Delete from History'+(localStorage.option_quickdelete_confirm == 1 ? "..." : "")+'</div>';
				html += '	<div class="menuHr"></div>';

				if (!$(window.rightClickedResult).attr("keyword")) {
					html += '	<div class="menuOption fauxbar16">Add Keyword...</div>';
				} else {
					html += '	<div class="menuOption fauxbar16">Edit Keyword...</div>';
				}
				html += '	<div class="menuHr"></div>';
			}
		}
	}

	if (usingSuperTriangle || $("#awesomeinput:focus").length) {
		$("#super_triangle .triangle").addClass("glow");
		html += '	<div class="menuOption" style="background-image:url(chrome://favicon/null); background-repeat:no-repeat; background-position:'+(window.OS == "Mac" ? "4px 1px" : "4px 2px")+';">History &amp; Bookmarks</div>';
		html += '	<div class="menuHr"></div>';
	}

	if (($("#opensearchinput:focus, #awesomeinput:focus").length || usingSuperTriangle || $("#opensearch_triangle .glow").length) && !window.tileEditMode) {
		$(".menuitem").each(function(){
			if ($(this).attr("shortname")) {
				html += '	<div class="menuOption engine" shortname="'+$(this).attr("shortname")+'" keyword="'+$(this).attr("keyword")+'" style="background-image:url('+$(this).attr("iconsrc")+'); background-size:16px 16px; background-repeat:no-repeat; background-position:'+(window.OS == "Mac" ? "4px 1px" : "4px 2px")+';">'+
				$(this).attr("shortname")+
				($(this).attr("keyword") && !strstr($(this).attr("keyword"),"fakekeyword_") ? ' <span style="display:inline-block; opacity:.5; float:right; margin-right:-20px">&nbsp;'+$(this).attr("keyword")+'</span>' : '') +
				'</div>';
			}
		});
		html += '	<div class="menuHr"></div>';
	}

	if (localStorage.indexComplete == 1 && !window.tileEditMode && !$('input[type="text"]:focus, textarea:focus').length && !usingSuperTriangle && !$("#opensearch_triangle .glow").length && !getHashVar("options") && /*localStorage.option_pagetilearrangement == "manual"*/ (localStorage.option_showtopsites == 1 || localStorage.option_showapps == 1) && !window.contextHref) {
		html += '	<div class="menuOption fauxbar16">Edit Tiles...</div>';
	}
	else if (window.tileEditMode && !$('input:focus').length) {
		delete window.tileThumb;
		if (strstr(e.target.className,"sitetile")) {
			window.tileThumb = e.target;
		}
		else if ($(e.target).parents('.sitetile').first().length) {
			window.tileThumb = $(e.target).parents('.sitetile').first();
		}
		if (window.tileThumb) {
			html += '	<div class="menuOption fauxbar16">Rename Tile...</div>';
			html += '	<div class="menuOption fauxbar16">Remove Tile</div>';
			html += '	<div class="menuHr"></div>';
		}

		if (!window.tileThumb) {
			html += '	<div class="menuOption fauxbar16">Save Changes</div>';
			html += '	<div class="menuOption fauxbar16">Cancel Changes</div>';
			html += '	<div class="menuHr"></div>';
		}
	}

	if (($("#opensearchinput:focus, #awesomeinput:focus").length || usingSuperTriangle || $("#opensearch_triangle .glow").length) && !window.tileEditMode) {
		html += '	<div class="menuOption fauxbar16">Edit Search Engines...</div>';
	}
	if (localStorage.indexComplete == 1) {
		if (!getHashVar("options").length) {
			if (!window.tileThumb && !window.linkIsApp) {
				html += '	<div class="menuOption fauxbar16">Customize '+(localStorage.extensionName ? localStorage.extensionName : "Fauxbar")+'...</div>';
				html += '	<div class="menuHr"></div>';
			}
		} else {
			html += '	<div class="menuOption fauxbar16">Close Options</div>';
			html += '	<div class="menuHr"></div>';
		}
	}

	if (!window.linkIsApp) {
		html += '	<div class="menuOption disabled" style="">'+(localStorage.extensionName ? localStorage.extensionName : "Fauxbar")+' v'+localStorage.currentVersion+'</div>';
	}

	html += '</div>';
	$("body").append(html);

	// Position the context menu

	if ($("#contextMenu").offset().left + $("#contextMenu").outerWidth() > window.innerWidth) {
		$("#contextMenu").css("left", window.innerWidth - $("#contextMenu").outerWidth() + "px");
	}

	if ($("#contextMenu").offset().top + $("#contextMenu").outerHeight() - $(window).scrollTop() > window.innerHeight) {
		$("#contextMenu").css("top", window.innerHeight - $("#contextMenu").outerHeight() + $(window).scrollTop() + "px");
	}

	$(".menuOption.fauxbar16").first().css("background-image","url(/img/fauxbar16.png)").css("background-repeat","no-repeat").css("background-position",window.OS == "Mac" ? "4px 1px" : "4px 2px");
	$("#contextMenu").animate({opacity:1},100);
}

$(".superselect").live("mouseup",function(e){
	if (localStorage.indexComplete == 1) {
		if ($("#super_triangle .triangle.glow").length) {
			removeContextMenu();
		} else {
			removeContextMenu();
			hideResults();
			$("#opensearch_results").css("display","none").html("");
			$("#super_triangle .triangle").addClass("glow");
			$("#awesomeinput").blur();
			showContextMenu(e);
		}
	}
	return false;
});

$("body").live("contextmenu",function(e){
	if (!$(".glow").length) {
		removeContextMenu();
		if (e.button == 2 && !e.ctrlKey) {
			if (e.target.id != "addressbaricon" && !strstr(e.target.className, "triangle") && e.target.tagName != 'MENU' && e.target.tagName != 'MENUNAME') {
				showContextMenu(e);
			}
			return false;
		}
	} else {
		return false;
	}
});
$("#contextMenu").live("mouseenter", function(){
	$(".arrowed").removeClass("arrowed");
});

$("#contextMenu .menuOption").live("mousedown", function(){
	if ($("input:focus, textarea:focus").length) {
		var elId = $("input:focus, textarea:focus").attr("id");
		var len = $("input:focus, textarea:focus").val().length;
		var sel = $("input:focus, textarea:focus").getSelection();
	}

	if (!$(this).hasClass("disabled")) {
		switch ($(this).text()) {

			case "Edit Bookmark...":
				chrome.tabs.create({url:"chrome://bookmarks/?#q="+$(window.rightClickedResult).attr("url"), selected:false});
				break;

			case "Add Bookmark":
				chrome.bookmarks.getChildren("0", function(nodes){
					for (var n in nodes) {
						if (nodes[n].id != 1) {
							chrome.bookmarks.create({parentId:nodes[n].id, title:$(window.rightClickedResult).attr("origtitle"), url:$(window.rightClickedResult).attr("url")}, function(){
								setTimeout(function(){
									if ($("#awesomeinput").val().length) {
										getResults();
									} else {
										$("#awesomeinput").focus();
										getResults(true);
									}
								}, 100);
							});
							break;
						}
					}
				});
				break;

			case "Delete from History":
				$("#contextMenu").css("opacity",0);
				if (deleteHistoryUrl($(window.rightClickedResult).attr("url"), $(window.rightClickedResult).attr("bmid"))) {
					$(window.rightClickedResult).remove();
				}
				break;

			case "Delete from History...":
				$("#contextMenu").css("opacity",0);
				if (deleteHistoryUrl($(window.rightClickedResult).attr("url"), $(window.rightClickedResult).attr("bmid"))) {
					$(window.rightClickedResult).remove();
				}
				break;

			case "Add Keyword...":
				$("#contextMenu").css("opacity",0);
				var keyword = prompt('Add a keyword for '+$(window.rightClickedResult).attr("url"));
				if (keyword) {
					keyword = str_replace('"', '', keyword.trim());
					if (keyword.length && openDb()) {
						window.db.transaction(function(tx){
							tx.executeSql('UPDATE urls SET tag = ? WHERE url = ?', [keyword, $(window.rightClickedResult).attr("url")]);
							tx.executeSql('DELETE FROM tags WHERE url = ?', [$(window.rightClickedResult).attr("url")]);
							tx.executeSql('INSERT INTO tags (url, tag) VALUES (?, ?)', [$(window.rightClickedResult).attr("url"), keyword]);
						}, function(t){
							errorHandler(t, getLineInfo());
						}, function(){
							if ($("#awesomeinput").val().length) {
								getResults();
							} else {
								$("#awesomeinput").focus();
								getResults(true);
							}
							chrome.runtime.sendMessage(null, "backup keywords");
						});
					}
				}
				break;

			case "Edit Keyword...":
				$("#contextMenu").css("opacity",0);
				var keyword = prompt('Edit the keyword for '+$(window.rightClickedResult).attr("url"), $(window.rightClickedResult).attr("keyword"));
				if (keyword != null) {
					keyword = str_replace('"', '', keyword.trim());
					if (keyword.length && openDb()) {
						window.db.transaction(function(tx){
							tx.executeSql('UPDATE urls SET tag = ? WHERE url = ?', [keyword, $(window.rightClickedResult).attr("url")]);
							tx.executeSql('UPDATE tags SET tag = ? WHERE url = ?', [keyword, $(window.rightClickedResult).attr("url")]);
						}, function(t){
							errorHandler(t, getLineInfo());
						}, function(){
							if ($("#awesomeinput").val().length) {
								getResults();
							} else {
								$("#awesomeinput").focus();
								getResults(true);
							}
							chrome.runtime.sendMessage(null, "backup keywords");
						});
					}
					else if (openDb()) {
						window.db.transaction(function(tx){
							tx.executeSql('UPDATE urls SET tag = ? WHERE url = ?', ["", $(window.rightClickedResult).attr("url")]);
							tx.executeSql('DELETE FROM tags WHERE url = ?', [$(window.rightClickedResult).attr("url")]);
						}, function(t){
							errorHandler(t, getLineInfo());
						}, function(){
							if ($("#awesomeinput").val().length) {
								getResults();
							} else {
								$("#awesomeinput").focus();
								getResults(true);
							}
							chrome.runtime.sendMessage(null, "backup keywords");
						});
					}
				}
				break;

			case "Uninstall":
				removeContextMenu();
				confirm("Uninstall \""+$(window.rightClickedApp).attr("appname")+"\" from Chrome?") ? chrome.management.uninstall($(window.rightClickedApp).attr("appid")) + $(window.rightClickedApp).remove() : null;
				break;

			case "Rename Tile...":
				removeContextMenu();
				var text = prompt("Rename tile:",$(window.tileThumb).attr("origtitle"));
				if (text) {
					$(".toptitletext",window.tileThumb).text(text);
					$(window.tileThumb).attr("origtitle",text);
					truncatePageTileTitle($(".toptitle",window.tileThumb));
				}
				break;

			case "Remove Tile":
				$(window.tileThumb).animate({opacity:0}, 350, function(){
					$(this).remove();
				});
				break;

			case "Open Link in New Tab":
				chrome.tabs.create({url:window.contextHref, selected:false});
				break;

			case "Open App in New Tab":
				chrome.tabs.create({url:window.contextHref, selected:false});
				break;

			case "Open Link in New Window":
				chrome.windows.create({url:window.contextHref});
				break;

			case "Open App in New Window":
				chrome.windows.create({url:window.contextHref});
				break;

			case "Open Link in Incognito Window":
				chrome.windows.create({url:window.contextHref, incognito:true});
				break;

			case "Copy Link Address":
				$("body").append('<input id="copyLink" type="text" value="'+window.contextHref+'" style="position:absolute; z-index:-500000; opacity:0" />');
				$("#copyLink").select();
				document.execCommand('copy');
				$("#copyLink").remove();
				break;

			case "Close Options":
				closeOptions();
				break;

			case "Save Changes":
				saveSiteTiles();
				break;

			case "Cancel Changes":
				cancelTiles();
				break;

			case "Cut":
				document.execCommand("cut");
				break;

			case "Copy":
				document.execCommand("copy");
				break;

			case "Paste":
				window.justPasted = true;
				document.execCommand("paste");
				if (elId == "awesomeinput") {
					setTimeout(getResults,1);
				} else if (elId == "opensearchinput") {
					setTimeout(getSearchSuggestions,1);
				}
				break;

			case "Paste & Go":
				window.justPasted = true;
				window.navigating = true;
				$("#awesomeinput").val("");
				document.execCommand("paste");
				setTimeout(function(){
					if ($("#awesomeinput").val().trim().length) {
						if (window.keywordEngine) {
							submitOpenSearch($("#awesomeinput").val());
						} else {
							goToUrl($("#awesomeinput").val());
						}
						setTimeout(function(){
							$("#awesomeinput").blur();
						},1);
					} else {
						$("#awesomeinput").focus();
					}
				},1);
				break;

			case "Paste & Search":
				window.justPasted = true;
				window.navigating = true;
				$("#"+elId).val("");
				document.execCommand("paste");

				setTimeout(function(){
					if ($("#"+elId).val().trim().length) {
						submitOpenSearch($("#"+elId).val());
						if (elId != "awesomeinput") {
							setTimeout(function(){
								$("#"+elId).blur();
							},1);
						}
					} else {
						$("#"+elId).focus();
					}
				},1);
				break;

			case "Delete":
				window.justDeleted = true;
				document.execCommand("delete");
				break;

			case "Select All":
				document.execCommand("selectAll");
				break;

			case "History & Bookmarks":
				delete window.keywordEngine;
				$("#awesomeInsetButton").removeClass("insetButton").addClass("noInsetButton");
				$("#addressbaricon").attr("src","chrome://favicon/null");
				$(".switchtext").html("Switch to tab:").css("display","");
				$("#awesomeinput").attr("placeholder",window.placeholder).focus();
				break;

			case "Edit Search Engines...":
				localStorage.option_optionpage = "option_section_searchengines";

				// If "Edit search engines..." is selected, load the options.
				// If options are already loaded, switch to the Search Box subpage
				if (getHashVar("options") != 1) {
					if (window.location.hash.length == 0) {
						window.location.hash = "#options=1";
					} else {
						window.location.hash += "&options=1";
					}
					window.location.reload();
				} else {
					changeOptionPage("#option_section_searchengines");
				}
				break;

			case "Customize "+(localStorage.extensionName ? localStorage.extensionName : "Fauxbar")+"...":
				if (window.tileEditMode) {
					localStorage.option_optionpage = "option_section_tiles";
				}
				window.location = chrome.extension.getURL("/html/fauxbar.html#options=1");
				window.location.reload();
				break;

			case "Edit Tiles...":
				if (localStorage.option_showtopsites == 1 && localStorage.option_pagetilearrangement == "manual") {
					enterTileEditMode();
				} else {
					localStorage.option_optionpage = "option_section_tiles";
					window.location = chrome.extension.getURL("/html/fauxbar.html#options=1");
					window.location.reload();
				}
				break;

			// Search engines
			default:
				if ($(this).hasClass("engine")) {
					var doAddressBoxEngineStuff = function(el) {
						if (!window.keywordEngine) {
							if ($(el).attr("keyword").length) {
								$("#awesomeinput").val($(el).attr("keyword")+" "+$("#awesomeinput").val()).focus();
								setTimeout(getResults,1);
							}
						} else {
							var newKeyword = $(el).attr("keyword");
							$("#awesomeinput").blur().val(newKeyword+" "+$("#awesomeinput").val()).focus();
							setTimeout(getResults,1);
						}
					};
					if ($("#awesomeinput:focus").length || $(".supercontext").length) {
						doAddressBoxEngineStuff(this);
					} else if ($("#opensearchinput:focus").length || $("#opensearch_triangle .glow").length) {
						$("#opensearch_results").css("display","none").html("");
						selectOpenSearchType($('.menuitem[shortname="'+str_replace('"','&quot;',$(this).attr("shortname"))+'"]'), true);
						if ($("#opensearch_triangle .glow").length) {
							$("#opensearchinput").focus();
						}
						if ($("#opensearchinput").val().trim().length) {
							setTimeout(getSearchSuggestions,1);
						}
					} else {
						doAddressBoxEngineStuff(this);
					}
				}
				break;
		}
		removeContextMenu();
		return false;
	} else {
		return false;
	}
});

// Fill the search engine menu with the engines that have been added to Fauxbar
function populateOpenSearchMenu(force) {
	if (openDb(force)) {
		window.db.readTransaction(function (tx) {
			tx.executeSql('SELECT shortname, searchurl, method, suggestUrl, iconurl, isdefault, keyword FROM opensearches ORDER BY position DESC, shortname COLLATE NOCASE asc', [], function (tx, results) {
				var menuItems = '';
				var len = results.rows.length, i;
				var isDefault = false;
				var defaultShortname = '';
				var iconUrl = "";
				var result = "";
				var keyword = '';
				var fakecount = 1;

				for (var i = 0; i < len; i++) {
					result = results.rows.item(i);
					isDefault = result.isdefault == 1 ? true : false;
					if (isDefault == true || defaultShortname == '') {
						defaultShortname = results.rows.item(i).shortname;
					}
					iconUrl = result.iconurl;
					if (iconUrl != "google.ico" && iconUrl != "yahoo.ico" && iconUrl != "bing.ico") {
						iconUrl = "chrome://favicon/"+iconUrl;
					} else {
						iconUrl = "/img/"+iconUrl;
					}

					keyword = result.keyword.length ? result.keyword : "fakekeyword_"+date("U")+"_"+fakecount++;
					menuItems += '<div class="menuitem" shortname="'+str_replace('"',"&quot;",result.shortname)+'" iconsrc="'+iconUrl+'" searchurl="'+result.searchurl+'" method="'+result.method+'" suggesturl="'+result.suggestUrl+'" keyword="'+keyword+'">';
					menuItems += '<div class="vertline2">';
					menuItems += '<img src="'+iconUrl+'" style="height:16px;width:16px" /> ';
					menuItems += '<div class="vertline shortname">' + result.shortname;
					menuItems += '</div></div></div>\n\n';
				}

				menuItems += '<div class="menuitemline" style="border:0">';
				menuItems += '<div class="vertline2" style="">';

				menuItems += '<div class="vertline" style="line-height:1px; font-size:1px; padding:2px">&nbsp;';
				menuItems += '</div></div></div>';

				menuItems += '<div class="osMenuLine" style="border-bottom:1px solid #fff; border-top:1px solid #e2e3e3; display:block; height:0px; line-height:0px; font-size:0px; width:100%; margin-left:27px; margin-top:-3px; position:absolute; "></div>';

				menuItems += '<div class="menuitem edit"><div class="vertline2">';
				menuItems += '	<img src="/img/fauxbar16.png" style="height:16px; width:16px" /> ';
				menuItems += '	<div class="vertline">Edit search engines...</div>';
				menuItems += '</div></div>';
				var osm = $("#opensearchmenu");
				osm.html(menuItems);
				$(".osMenuLine").css("width", osm.outerWidth()-34+"px");
				if (i > 0) {
					selectOpenSearchType($('.menuitem[shortname="'+str_replace('"',"&quot;",defaultShortname)+'"]'), false);
				}
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}
}
// Populate the Search Box's list of search engines now, so that they appear instantly when the user clicks to change search engine.
populateOpenSearchMenu();

// http://phpjs.org/functions/microtime:472
function microtime (get_as_float) {
	// *     example 1: timeStamp = microtime(true);
	// *     results 1: timeStamp > 1000000000 && timeStamp < 2000000000
	var now = new Date().getTime() / 1000;
	var s = parseInt(now, 10);

	return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
}

// Focus Address Box or Search Box if allowed, stealing from Chrome's Omnibox (shortcut keys)
$("*").live("keydown", function(e){
	if (e.keyCode == 68 && e.altKey == true && !e.ctrlKey) {
		if (localStorage.option_altd == 1) {
			$("#awesomeinput").focus().select();
			return false;
		} else {
			$(this).blur();
		}
	}
	if (e.keyCode == 76 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrll == 1) {
			$("#awesomeinput").focus().select();
			return false;
		} else {
			$(this).blur();
		}
	}
	else if (e.keyCode == 75 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrlk == 1) {
			$("#opensearchinput").focus().select();
			return false;
		} else {
			$(this).blur();
		}
	}
});

// When user clicks on almost anything, hide results/suggestions/queries. Assumes the user wants to hide them this way.
$("#background, table#options, #apps, #topthumbs").live("mousedown", function(){
	$(".triangle").removeClass("glow");
	hideResults();
	$("#opensearch_results").css("display","none").html("");
});

// When user focuses the Address Box, hide search queries and suggestions
$("#awesomeinput").live("focus", function(e){
	window.navigating = false;
	if (!window.keywordEngine) {
		$("#opensearch_results").css("display","none").html("");
	}
	if (window.dontGetResults) {
		setTimeout(function(){
			delete window.dontGetResults;
		}, 50);
		return true;
	}
	if (!window.keywordEngine) {
		getResults();
	}
	setTimeout(function(){
		if (!window.justPasted && !window.justDeleted) {
			$("#awesomeinput").select();
		}
		delete window.justPasted;
		delete window.justDeleted;
	},1);
});
$("#opensearchinput").live("focus", function(e){
	setTimeout(function(){
		if (!window.justPasted && !window.justDeleted) {
			$("#opensearchinput").select();
		}
		delete window.justPasted;
		delete window.justDeleted;
	},1);
});

// When the Search Box is focused, hide Address Box results and make the Search Box look good
$("#opensearchinput").focus(function(){
	hideResults();
	$(this).attr("title","");
});

// When the Search Box loses focus, make it look faded
$("#opensearchinput").blur(function(){
	if ($(this).val() == "") {
		$(this).attr("placeholder",window.openSearchShortname);
	}
	$(this).attr("title",$(this).attr("realtitle"));
});

// When user stops selecting a new search engine to use, make the arrow/triangle lose its glow, and hide the search engine menu.
$("#opensearch_menufocus").blur(function(){
	$("#opensearchmenu").css("display","none");
	$("#opensearch_triangle .triangle").removeClass("glow");
	$(this).css("display","none");
});

// When user clicks the Search Box's triangle/arrow, show the list of selectable search engines to choose from, or close the list if it's showing
$("#opensearch_triangle").bind("mouseup", function(e){
	if (localStorage.indexComplete == 1) {
		$("#opensearch_results").html("").css("display","none");
		$("#opensearch_triangle .triangle").addClass("glow");
		showContextMenu(e);
	}
});

// When clicking the Address Box's triangle, show the user's top sites, or hide the list of results
$("#addressbox_triangle").bind("mousedown", function(){
	if (localStorage.indexComplete == 1) {
		if (($(".historyresult").length > 0 || $(".jsonresult").length > 0 ) || $(".result").length == 0 || $("#results").attr("noquery") == 0) {
			$("#addressbox_triangle .triangle").addClass("glow");
			if ($("#awesomeinput:focus").length == 0) {
				$("#awesomeinput").focus();
			}
			$(this).attr("title","");
			getResults(true);
		} else {
			$(".triangle").removeClass("glow");
			$(this).attr("title",$(this).attr("origtitle"));
			hideResults();
		}
		return false;
	}
});

// The Address Box triangle's title attribute is handy, but not when the results are already being shown!
// Blanks the title attribute when not needed, and then reinstates it.
$("#addressbox_triangle").bind("mouseenter", function(){
	if ($(".triangle.glow").length > 0) {
		$(this).attr("title","");
	} else {
		$(this).attr("title",$(this).attr("origtitle"));
	}
});

$(".result").live("mousemove", function(){
	if (window.mouseHasMoved == true) {
		$(".result").removeClass("arrowed");
		$(".result:hover").addClass("arrowed");
	}
});



// When user clicks the Address Box, hide the result links
$("#awesomeinput").bind("mousedown", function(){
	hideResults();
});

// When the Address Box is empty and the user double-clicks it, display the top results
$("#awesomeinput").dblclick(function(){
	if (!$(this).val().length) {
		$("#addressbox_triangle").mousedown();
	}
});

// When user clicks the Address Box's go arrow, go to the address if something is entered
$("#address_goarrow").bind("mousedown", function(){
	var aiVal = $("#awesomeinput").val();
	if (aiVal.length) {
		goToUrl(aiVal);
		hideResults();
	}
	return false;
});

// When user hovers over the Address Box's go arrow, make it change color slightly
$("#address_goarrow").bind("mouseenter", function(){
	if (window.tileEditMode) {
		$("#address_goarrow img").attr("src","/img/plus_dark.png");
	} else {
		$("#address_goarrow img").attr("tintedsrc",$("#address_goarrow img").attr("src")).attr("src",$("#goarrow_hovered").attr("src"));
	}
});

// When user stops hovering over the Address Box's go arrow, change the color back
$("#address_goarrow").bind("mouseleave", function(){
	if (window.tileEditMode) {
		$("#address_goarrow img").attr("src","/img/plus.png");
	} else {
		$("#address_goarrow img").attr("src",$("#address_goarrow img").attr("tintedsrc"));
	}
});

// When user clicks the Search Box's magnifying glass, submit the search if text is entered
$("#searchicon_cell").bind("mousedown", function(){
	if ($("#opensearchinput").val().trim().length) {
		submitOpenSearch();
	}
});

// When user hovers over magnifying glass, change color slightly
$("#searchicon_cell").bind("mouseenter", function(){
	$("#searchicon_cell img").attr("tintedsrc",$("#searchicon_cell img").attr("src")).attr("src",$("#searchicon_hovered").attr("src"));
});

// Change magnifying color back when user stops hovering over it
$("#searchicon_cell").bind("mouseleave", function(){
	$("#searchicon_cell img").attr("src",$("#searchicon_cell img").attr("tintedsrc"));
});

$("#awesomeinput").bind("keydown", function(e){

	var clearKeywordEngine = function() {
		delete window.keywordEngine;
		$("#awesomeInsetButton").removeClass("insetButton").addClass("noInsetButton");
		$("#addressbaricon").attr("src","chrome://favicon/null");
		$(".switchtext").html("Switch to tab:").css("display","");
		$("#awesomeinput").attr("placeholder",window.placeholder);
	};

	// Ctrl+Up and Ctrl+Down -- Switch to a search engine keyword (38 up, 40 down)
	if ((e.keyCode == 38 || e.keyCode == 40) && e.ctrlKey && !window.tileEditMode) {
		var engineToUse;
		if (!window.keywordEngine) {
			engineToUse = e.keyCode == 38 ? $('#opensearchmenu > .menuitem').last() : $('#opensearchmenu > .menuitem').first();
		} else {
			var currentEngine = $('#opensearchmenu > .menuitem[keyword="'+window.keywordEngine.keyword+'"]');
			engineToUse = e.keyCode == 38 ? $(currentEngine).prev() : $(currentEngine).next();
			if (e.keyCode == 38 && !engineToUse.length) {
				clearKeywordEngine();
			}
		}
		if (engineToUse && $(engineToUse).attr('keyword') && $(engineToUse).attr('keyword').length) {
			$("#awesomeinput").val( $(engineToUse).attr("keyword")+" "+$("#awesomeinput").val() ).focus();
			setTimeout(getResults,1);
		}
		return false;
	}

	// Ctrl+Return
	else if (e.keyCode == 13 && e.ctrlKey == true) {
		var thisVal = window.actualUserInput;
		if (!strstr(thisVal.trim(), ' ') && !strstr(thisVal, '/')) {
			if (!strstr(thisVal, '.')) {
				$(this).val('http://www.'+thisVal+'.com/');
			}
			else if (thisVal.substr(thisVal.length-3) != '.com') {
				$(this).val('http://'+thisVal+'.com/');
			}
		}
	}

	// Ctrl+K
	else if (e.keyCode == 75 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrlk == 1) {
			$("#opensearchinput").focus();
			return false;
		} else {
			$(this).blur();
		}
	}

	//  Ctrl+L
	else if (e.keyCode == 76 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrll == 1) {
			return false;
		} else {
			$(this).blur();
		}
	}
	
	// Alt+D
	else if (e.keyCode == 68 && e.altKey == true && !e.ctrlKey) {
		if (localStorage.option_altd == 1) {
			// Select all text in Address Bar
			$(this).select();
			return false;
		} else {
			$(this).blur();
		}
	}

	// Alt+Return
	else if (e.keyCode == 13 && e.altKey == true) {
		window.altReturn = true;
	}

	// Tab
	else if (e.keyCode == 9 && $(".result").length) {
		if (e.shiftKey == true) {
			navigateResults({keyCode:38});
		} else {
			navigateResults({keyCode:40});
		}
		return false;
	}

	// Pressing Backspace if search engine keyword is being used
	if (e.keyCode == 8 && window.keywordEngine && !$("#awesomeinput").val().length) {
		clearKeywordEngine();
		getResults();
		return false;
	}
});

$("#opensearchinput").bind("keydown", function(e){
	// Ctrl+K
	if (e.keyCode == 75 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrlk == 1) {
			return false;
		} else {
			$(this).blur();
		}
	}

	// Ctrl+L
	else if (e.keyCode == 76 && e.ctrlKey == true && !e.altKey) {
		if (localStorage.option_ctrll == 1) {
			$("#awesomeinput").focus();
			return false;
		} else {
			$(this).blur();
		}
	}
	
	// Alt+D
	else if (e.keyCode == 68 && e.altKey == true && !e.ctrlKey) {
		if (localStorage.option_altd == 1) {
			$("#awesomeinput").focus();
			return false;
		} else {
			$(this).blur();
		}
	}

	// Alt+Return
	else if (e.keyCode == 13 && e.altKey == true) {
		window.altReturn = true;
	}

	// Tab
	else if (e.keyCode == 9 && $(".result").length) {
		if (e.shiftKey == true) {
			navigateResults({keyCode:38});
		} else {
			navigateResults({keyCode:40});
		}
		return false;
	}
});

$("#results").bind("scroll", function() {
	window.userHasNewInput = false;
});

// When user types a key into the Address Box...
$("#awesomeinput").bind("keydown",function(e){
	window.userHasNewInput = false;
	if (!window.keywordEngine) {
		setTimeout(toggleSwitchText, 1);
	}
	// up = 38, down = 40, esc = 27, left = 37, right = 39, enter = 13, tab = 9
	// 8 = backspace, 46 = delete, tab = 9, shift = 16, ctrl = 17, alt = 18

	if (e.ctrlKey && (e.keyCode == 38 || e.keyCode == 40)) {
		return false;
	}

	// Tab, Shift, Ctrl - don't make these keys refresh results, so just return true
	if (e.keyCode == 9 || e.keyCode == 16 || e.keyCode == 17 ) {
		return true;
	}

	// Alt - nope
	if (e.keyCode == 18) {
		return false;
	}

	// Delete - if user has a result selected/hovered, delete it if Quick Delete is enabled in the options
	if (e.keyCode == 46 && localStorage.option_quickdelete && localStorage.option_quickdelete == 1) {
		if ($(".arrowed").length) {
			if ($('.arrowed.historyresult').length > 0 && localStorage.option_quickdelete && localStorage.option_quickdelete == 1) {
				if (openDb()) {
					window.db.transaction(function(tx){
						var tempNum = microtime(true);
						$(".arrowed").next(".result").attr("tempnum",tempNum);
						tx.executeSql('DELETE FROM searchqueries WHERE query = ?', [html_entity_decode($(".arrowed").attr("sug"))]);
						$(".arrowed").remove();
						$('.result[tempnum="'+tempNum+'"]').addClass("arrowed");
					}, function(t){
						errorHandler(t, getLineInfo());
					});
				}
				return false;
			}
			else if (openDb()) {
				var arrowedUrl = $(".arrowed").attr("url");
				var bmid = $(".arrowed").attr("bmid");
				if (arrowedUrl) {
					deleteHistoryUrl(arrowedUrl, bmid);
				}
				$(this).val(window.actualUserInput);
			}
			return false;
		}
	}

	// Esc - hide results and/or select all the text (user doesn't want what's currently there)
	if (e.keyCode == 27) {
		$(".arrowed").removeClass("arrowed");
		if (window.keywordEngine && $("#awesomeinput").val() == "") {
			delete window.keywordEngine;
			$("#awesomeInsetButton").removeClass("insetButton").addClass("noInsetButton");
			window.actualUserInput = '';
			$("#addressbaricon").attr("src","chrome://favicon/null");
			$(".switchtext").html("Switch to tab:").css("display","");
			$("#awesomeinput").attr("placeholder",window.placeholder);
			return false;
		}
		if (window.actualUserInput) {
			$(this).val(window.actualUserInput);
		}

		$("#opensearch_results").css("display","none").html("");
		if ($(".result").length > 0) {
			$(".triangle").removeClass("glow");
			hideResults();
		}
		else {
			$(this).select();
		}
		return false;
	}

	// Enter/Return - go to the address entered in the Address Box, or the highlighted result...
	if (e.keyCode == 13) {
		var aiVal = '';
		// If user has opted to auto-select first result, use highlighted result's URL (if user isn't pressing Ctrl+Enter)
		// Else, use Address Box input
		if (!e.ctrlKey && localStorage.option_autoAssist == 'autoSelectFirstResult' && $('.result.arrowed').length && $('.result.arrowed').attr('number') == 1) {
			aiVal = $('.result.arrowed').attr('url');
		} else {
			aiVal = $(this).val();
		}
		if (aiVal.length > 0) {
			goToUrl(aiVal);
			if (!window.keywordEngine) {
				$(this).blur();
			}
			if (window.altReturn == false) {
				hideResults();
			}
		}
		return false;
	}

	// Left, Right - user is reposition caret, so hide the results so user isn't as distracted
	if (e.keyCode == 37 || e.keyCode == 39) {
		hideResults();
		return true;
	}

	// Up, Down - navigate the result links
	if ((e.keyCode == 38 || e.keyCode == 40)) {
		if (window.keywordEngine && !$(".result").length) {
			getSearchSuggestions();
		} else {
			window.navigating = true;
			navigateResults(e);
		}
		return false;
	}

	// Hide the current results if the user has decided to show the top results instead
	if ($(".glow").length > 0) {
		hideResults();
	}

	// Since we're this far, user has entered something that should go towards getting matching history items or bookmarks as results
	window.userHasNewInput = true;
	window.lastKeyCode = e.keyCode;
	setTimeout(getResults, 1);
});

// When user releases a key with the Address Box focused...
$("#awesomeinput").bind("keyup",function(e){
	// up = 38, down = 40, 27 = esc, left = 37, right = 39
	// 8 = backspace, 46 = delete

	// Catch the release of Enter/Return
	if (e.keyCode == 13 ) {
		return false;
	}

	// Let Left and Right go through
	if (e.keyCode == 37 || e.keyCode == 39) {
		return true;
	}

	// If results are displayed and user is navigating, prevent the caret from moving
	if ((e.keyCode == 38 || e.keyCode == 40) && $(".result").length > 0 ) {
		return false;
	}
});

// When the Chrome window gets resized, get results and queries/suggestions again so their containers are resized appropriately
$(window).resize(function(){
	if ($("#awesomeinput:focus").length) {
		getResults();
	} else if ($("#opensearch_results").length) {
		getSearchSuggestions();
	}
});

// When user clicks on a Search Box query/suggestion...
$('.jsonresult, .historyresult').live("mousedown", function(e){
	var query = false;
	// If user Middle-clicks or Ctrl+Clicks, record it as such, so that submitOpenSearch() knows to do the search in a new tab
	if (event.button == 1 || e.ctrlKey == true) {
		window.middleMouse = true;
		window.altReturn = true;
		query = $(this).attr("sug");
	}

	// If user hasn't Middle-clicked or Ctrl+Clicked, hide the queries/suggestions from view
	if (!window.middleMouse) {
		if (window.keywordEngine && $("#awesomeinput:focus").length) {
			$("#awesomeinput").val($(this).attr("sug"));
		} else {
			$("#opensearchinput").val($(this).attr("sug"));
		}
		$("#opensearch_results").css("display","none").html("");
	}

	// And finally, submit the search
	submitOpenSearch(query);
	return false;
});

// When user presses a key with the Search Box focused...
$("#opensearchinput").bind("keydown", function(e){
	// up = 38, down = 40, esc = 27, left = 37, right = 39, enter = 13, tab = 9
	// 8 = backspace, 46 = delete, tab = 9, shift = 16, ctrl = 17, alt = 18
	
	// Check for Ctrl+Up and Ctrl+Down to switch search engines
	if (e.ctrlKey) {
		var newSearchEngine;
		var currentSearchEngine = $('#opensearchmenu > .menuitem.bold');
		// Up
		if (e.keyCode == 38) {
			newSearchEngine = currentSearchEngine.prev('.menuitem');
		// Down
		} else if (e.keyCode == 40) {
			newSearchEngine = currentSearchEngine.next('.menuitem');
		}
		if (newSearchEngine && newSearchEngine.length) {
			window.changeDefaultOpenSearchType = true;
			selectOpenSearchType($('.menuitem[shortname="'+str_replace('"','&quot;',$(newSearchEngine).attr("shortname"))+'"]'), false);
			$("#opensearch_results").css("display","none").html("");
			if ($(this).val().length) {
				getSearchSuggestions();
			}
		}
		if (e.keyCode == 38 || e.keyCode == 40) {
			return false;
		}
	}

	// Tab, Shift, Ctrl - return true right now, don't let the key go any further
	if (e.keyCode == 9 || e.keyCode == 16 || e.keyCode == 17) {
		return true;
	}

	// Alt - nope
	if (e.keyCode == 18) {
		return false;
	}

	// Delete - Use Quick Delete to remove a selected/hovered query from the Search Box's history
	if (e.keyCode == 46) {
		if ($('.arrowed.historyresult').length > 0 && localStorage.option_quickdelete && localStorage.option_quickdelete == 1) {
			if (openDb()) {
				window.db.transaction(function(tx){
					var tempNum = microtime(true);
					$(".arrowed").next(".result").attr("tempnum",tempNum);
					tx.executeSql('DELETE FROM searchqueries WHERE query = ?', [html_entity_decode($(".arrowed .suggestion").text())]);
					$(".arrowed").remove();
					$('.result[tempnum="'+tempNum+'"]').addClass("arrowed");
				}, function(t){
					errorHandler(t, getLineInfo());
				});
			}
			return false;
		} else {
			return true;
		}
	}

	// Esc - hide queries/suggestions and focus the input; user doesn't want what's there
	if (e.keyCode == 27) {
		$(".arrowed").removeClass("arrowed");
		if (window.actualSearchInput) {
			$("#opensearchinput").val(window.actualSearchInput);
		}
		if ($(".result").length > 0) {
			$("#opensearch_results").css("display","none").html("");
		} else {
			$("#opensearchinput").select();
		}
		return false;
	}

	// Enter/Return - execute the search, hide the results
	if (e.keyCode == 13) {
		if ($("#opensearchinput").val().trim().length) {
			$("#opensearch_results").css("display","none").html("");
			submitOpenSearch();
		}
		return false;
	}

	// Left, Right - user is moving the caret, so hide the results so they're not being a distraction
	if (e.keyCode == 37 || e.keyCode == 39) {
		$("#opensearch_results").css("display","none").html("");
		return true;
	}

	// Up, Down - navigate the queries/suggestions
	if ((e.keyCode == 38 || e.keyCode == 40)) {
		if ($(".result").length == 0) {
			getSearchSuggestions();
			return false;
		} else {
			return navigateResults(e);
		}
	}

	// This far, user has probably entered a letter or number, so get some new queries/suggestions to display
	setTimeout(function() {
		if ($("#opensearchinput").val().trim().length) {
			getSearchSuggestions();
		} else {
			$("#opensearch_results").css("display","none").html("");
		}
	}, 1);
});

$("#awesomeinput").live("blur", function(){
	if (window.keywordEngine) {
		setTimeout(function(){
			if (!$("#awesomeinput:focus").length) {
				if (window.keywordEngine) {
					$("#opensearch_results").css("display","none").html("");
				}
			}
		}, 1);
	}
});

// If we're reindexing the database, display the progress box
if (localStorage.indexComplete != 1) {
	$.get("/html/indexinginfo.html", function(response){
		window.curProgress = 0;
		$("#maindiv").after(response);
		
		if (localStorage.extensionName == "Fauxbar Lite") {
			window.document.title = "Fauxbar Lite";
			$(".fauxbar").html('Fauxbar Lite');
		}

		// Focus the button for usability reasons
		setTimeout(function(){
			$("button").focus();
		}, 50);
		if (window.OS == "Mac") {
			$("button").css("font-family", "Lucida Grande, Segoe UI, Arial, sans-serif");
		}
		
		$("#addresswrapper").css("cursor","wait");
		$("#apps").remove();
		if (localStorage.reindexForMaintenance == 1) {
			$("#indexinginfo b").html(localStorage.extensionName+" needs to reindex for maintenance");
			$("#indexinginfo span#indexingInfo2").html(localStorage.extensionName+" needs to reindex your Chrome data to correct a bookmark-naming issue that was present in the previous version of "+localStorage.extensionName+".");
			$("#currentstatus").html("Click <b>Start Indexing</b> to begin.");
		} else if (localStorage.needToReindex && localStorage.needToReindex == 1) {
			$("#indexinginfo b").html(localStorage.extensionName+" needs to reindex your Chrome data");
			$("#indexinginfo span#indexingInfo2").html(localStorage.extensionName+"'s database structure has been modified, so "+localStorage.extensionName+" needs to reindex your Chrome data. On the plus side, indexing is now approximately 70% faster than&nbsp;before.");
			$("#currentstatus").html("Click <b>Start Indexing</b> to begin.");
		} else if (localStorage.indexedbefore == 1) {
			$("#indexinginfo b").html(localStorage.extensionName+" is reindexing");
			$("#indexinginfo span#indexingInfo2").html(localStorage.extensionName+" is reindexing your history items and bookmarks.");
			$("#currentstatus").html("Reindexing...");
			$("button").last().prop('disabled',true).html('Please Wait...').blur();
		} else if (localStorage.issue47 == 1) {
			$("#indexinginfo b").html(localStorage.extensionName+" is rebuilding");
			$("#indexinginfo span#indexingInfo2").html(localStorage.extensionName+" is rebuilding its database, and reindexing your history items and bookmarks. Any custom keywords and search engines you had will also be restored shortly after.");
			$("#currentstatus").html("Rebuilding...");
			$("button").last().prop('disabled',true).html('Please Wait...').blur();
		}
		$("#indexinginfo").css("display","block");
		$("#awesomeinput").css("cursor","wait");
		$("#searchwrapper *").css("cursor","wait");
		setTimeout(function(){
			$("#awesomeinput").prop("disabled",true);
			$("#opensearchinput").prop("disabled",true);
			if (localStorage.indexedbefore != 1) {
				$("#opensearchinput").attr("placeholder","Search");
			}
		}, 100);
	});
}



// Resize the holding container for the Search Box's queries/suggestions that get displayed
function resizeSearchSuggestions() {
	var resultHeight = $(".result").first().outerHeight();
	window.resultsAreScrollable = false;
	if (resultHeight > 0) {
		var maxHeight = Math.floor($(window).height() - $(".wrapper").outerHeight() - 80);
		var maxVisibleRows = Math.floor(maxHeight / resultHeight);
		var defaultMaxVisible = 10;
		if (localStorage.option_maxsuggestionsvisible) {
			if (localStorage.option_maxsuggestionsvisible < maxVisibleRows) {
				maxVisibleRows = localStorage.option_maxsuggestionsvisible;
			}
		} else if (defaultMaxVisible < maxVisibleRows) {
			maxVisibleRows = defaultMaxVisible;
		}

		var newResultsHeight = 0;
		for (var x = 0; x < maxVisibleRows; x++) {
			newResultsHeight += resultHeight;
		}
		var borderHeight = 0;
		if ($(".jsonresult").length > 0 && $(".historyresult").length > 0) {
			borderHeight = 1;
		}
		$("#opensearch_results").css("max-height", (newResultsHeight+borderHeight)+"px");
		if ($(".result").length > maxVisibleRows) {
			window.resultsAreScrollable = true;
		}
	}
	if ((window.keywordEngine && $("#awesomeinput:focus").length) || (!window.keywordEngine && $("#awesomeinput:focus").length)) {
		$("#opensearch_results").css("display","block")
			.css("margin-left","0px")
			.css("margin-top","0px")
			.css("width", $("#awesomeinputwrapper2").outerWidth()-2+"px")
			.css("top",$("#awesomeinput").offset().top+$("#awesomeinput").outerHeight()+5+"px")
			.css("left",$("#awesomeinput").offset().left-1+"px")
			.css("position","fixed")
		;
	} else {
		$("#opensearch_results").css("display","block").
			css("width", $("#opensearchwrapper2").outerWidth()- 2 +"px").
			css("margin-left","0px").
			css("margin-top","0px").
			css("position","absolute").
			css("left",$("#opensearchwrapper2").offset().left+"px").
			css("top",$("#searchwrapper").offset().top+$("#searchwrapper").outerHeight()+1+"px");
	}
}

// Fetch and display queries/suggestions related to the user's Search Box input
function getSearchSuggestions(dontActuallyGet) {
	window.mouseHasMoved = false;

	if (window.keywordEngine) {
		window.actualUserInput = $("#awesomeinput").val();
	}

	if (dontActuallyGet) {
		return false;
	}

	if ($("#opensearchinput:focus").length && $("#opensearchinput").val().length) {
		$(".menuitem").each(function(){
			if ($(this).attr("keyword") && $("#opensearchinput").val() == $(this).attr("keyword")+" ") {
				$("#opensearchinput").val("");
				window.dontActuallyGetSearchResults = true;
				selectOpenSearchType(this, true);
				return false;
			}
		});
	}

	// If user has opted to show queries or suggestions...
	if (($("#opensearchinput:focus").length && (localStorage.option_showqueryhistorysuggestions == 1 || localStorage.option_showjsonsuggestions == 1)) || (window.keywordEngine) || (!window.keywordEngine && $("#awesomeinput:focus").length)) {

		// Set up the SQL select statement for Fauxbar's `searchqueries` database table
		window.actualSearchInput = window.keywordEngine && $("#awesomeinput:focus").length ? $("#awesomeinput").val() : $("#opensearchinput").val();
		if (openDb()) {
			window.db.readTransaction(function(tx){
				var osWords = explode(" ", window.actualSearchInput.trim());
				var queryLikes = [];
				var statementParts = [];
				for (w in osWords) {
					if (osWords[w].length > 0) {
						queryLikes[queryLikes.length] = ' query LIKE ? ';
						statementParts[statementParts.length] = "%"+osWords[w]+"%";
					}
				}
				if (queryLikes.length == 0) {
					queryLikes[0] = ' query LIKE ? ';
					statementParts[0] = "%";
				}

				var limit = localStorage.option_maxretrievedsuggestions ? localStorage.option_maxretrievedsuggestions : 20;
				statementParts[statementParts.length] = limit;

				// Execute the SQL select statement
				tx.executeSql('SELECT DISTINCT query FROM searchqueries WHERE '+implode(" AND ",queryLikes)+' ORDER BY query ASC LIMIT ?', statementParts, function(tx, results){

					// Get the JSON OpenSearch suggestions from the selected search engine suggestion URL if possible, otherwise just default to a fake URL so we can at least continue.
					// Doing it this way so that it's more streamlined here, rather than me trying to worry about dealing with asynchronus results; I think it'd be messier. This way seems cleaner.
					var suggestUrl = window.keywordEngine ? window.keywordEngine.suggestUrl : $('#opensearchmenu .menuitem[shortname="'+str_replace('"','&quot;',window.openSearchShortname)+'"]').attr("suggesturl");
					var actualSuggestUrl = "http://0.0.0.0/";
					if (((!window.keywordEngine && localStorage.option_showjsonsuggestions == 1) || (window.keywordEngine && localStorage.option_showSuggestionsViaKeyword == 1)) && suggestUrl != "null" && suggestUrl != "" && suggestUrl.length > 0) {
						actualSuggestUrl = suggestUrl;
					}
					var osVal = window.keywordEngine && $("#awesomeinput:focus").length ? $("#awesomeinput").val() : $("#opensearchinput").val();

					// Setup the JSON URL get...
					$.getJSON(str_replace("{searchTerms}", urlencode(osVal), actualSuggestUrl)).complete(function(response){
						response = validateJson(response.responseText) ? jQuery.parseJSON(response.responseText) : '';
						var historyResults = '';
						var jsonResults = '';

						// If user has opted to show past queries, make it so
						if ((localStorage.option_showqueryhistorysuggestions == 1) || (window.keywordEngine && localStorage.option_showQueriesViaKeyword == 1)) {

							var len = results.rows.length, i;
							if (len > 0 || $(".result").length) {
								var openResults = '';
								var entQuery = '';
								for (var i = 0; i < len; i++) {
									entQuery = str_replace('<', '&lt;', results.rows.item(i).query);
									entQuery = str_replace('>', '&gt;', entQuery);
									entQuery = str_replace('"', '&quot;', entQuery);
									historyResults += '<div class="result historyresult" queryid="'+results.rows.item(i).id+'" sug="'+entQuery+'"><span class="suggestion">'+entQuery+'</span></div>\n';
								}
							}
						}

						// If we have received JSON suggestions, display them
						if (response && response[1] && response[1].length) {
							var suggestionsText = false;
							var html = "";
							for (var r in response[1]) {
								html = '<span class="suggestion">'+response[1][r]+'</span>';
								if (suggestionsText == false) {
									html = '<span class="sugText" style="float:right; font-size:10px;opacity:.5">Suggestions&nbsp;</span>' + html;
									suggestionsText = true;
								}
								jsonResults += '<div class="result jsonresult" sug="'+str_replace('"','&quot;',response[1][r])+'">'+html+'</div>\n';
							}
						}

						if (window.dontActuallyGetSearchResults) {
							$("#opensearch_results").css("display","none").html("");
							delete window.dontActuallyGetSearchResults;
							return;
						}

						// Display the queries and suggestions, if any
						if (osVal == (window.keywordEngine && $("#awesomeinput:focus").length ? $("#awesomeinput").val() : $("#opensearchinput").val())) {
							if (historyResults.length > 0 || jsonResults.length > 0) {

								$("#opensearch_results").html(historyResults+jsonResults).css("opacity",1).css("display","block");
								if (historyResults.length > 0) {
									$(".jsonresult").first().css("border-top","1px solid "+localStorage.option_separatorcolor);
								}
								resizeSearchSuggestions();

								// Truncate suggestions if needed
								var w = $("#opensearch_results").outerWidth()-20;
								var s = 0;
								$(".suggestion").each(function(){
									s = $(this).prev(".sugText").length ? $(this).prev(".sugText").outerWidth()+5 : 0;
									while ($(this).outerWidth()+s > w) {
										$(this).parent().attr("title",$(this).parent().attr("sug"));
										$(this).text($(this).text().substr(0,$(this).text().length-4)+"...");
									}
								});
							} else {
								$("#opensearch_results").css("display","none").html("");
							}
						}
					});
				});
			}, function(t){
				errorHandler(t, getLineInfo());
			});
		}
	}
}

// If Address Box input is a URL that has the "Switch to tab" text as a result below it, add a faded "Switch to text" bit in front of the Address Box's input box
function toggleSwitchText() {
	if (window.keywordEngine) {
		return false;
	}
	var switchUrl = $(".switch").parent('.result_url').parent('.result').attr("url");
	if ($('.switch').length > 0 && $("#awesomeinput").val() == switchUrl) {
		$(".switchtext").css("font-size",localStorage.option_inputfontsize+"px").css("display","table-cell");
		$("#super_triangle").css("display","none");
	}
	else if (window.tileEditMode && window.tileEditMode && $("#awesomeinput").val().length > 0 && $(".result[url='"+$("#awesomeinput").val()+"']").length > 0) {
		$(".switchtext").text("Add tile:").css("font-size",localStorage.option_inputfontsize+"px").css("display","table-cell");
		$("#super_triangle").css("display","none");
	}
	else {
		$(".switchtext").css("display","none");
		$("#super_triangle").css("display","");
	}
}

// When user presses Up, Down, Shift or Shift+Tab to navigate through Address Box results or Search Box queries/suggestions
function navigateResults(e) {
	window.mouseHasMoved = false;

	// If user has pressed Up or Down (or Shift+Tab or Shift)...
	if ((e.keyCode == 38 || e.keyCode == 40)) {

		// If some results/queries/suggestions are currently displayed...
		if ($(".result").length > 0) {
			var anotherResultExists = true;

			// Highlight the appropriate result/query/suggestion
			if (e.keyCode == 40) { // down
				if ($(".arrowed").length == 0) {
					$(".result").first().addClass("arrowed");
				}
				else if ($(".arrowed").next().length > 0) {
					$(".arrowed").removeClass("arrowed").next().addClass("arrowed");
				} else {
					anotherResultExists = false;
				}
			}
			else if (e.keyCode == 38) { // up
				if ($(".arrowed").length == 0) {
					$(".result").last().addClass("arrowed");
				} else if ($(".arrowed").prev().length > 0) {
					$(".arrowed").removeClass("arrowed").prev().addClass("arrowed");
				} else {
					anotherResultExists = false;
				}
			}

			// Scroll the results automatically if needed. Uses scrollTop() a bit; using an anchor would probably be faster...
			if (anotherResultExists == true) {
				if ($(".arrowed").position().top < 0) {
					var stopScrolling = false;
					var lastScrollPosition = null;

					// If page size has been changed via ctrl+ or ctrl-, top result position can sometimes always be < 0, so need to prevent infinite loop
					while ($(".arrowed").position().top < 0 && stopScrolling == false) {
						if ($("#awesomeinput:focus").length) {
							$("#results").scrollTop($("#results").scrollTop()-1);
						} else if ($("#opensearchinput:focus").length) {
							$("#opensearch_results").scrollTop($("#opensearch_results").scrollTop()-1);
						}
						if (lastScrollPosition && $(".arrowed").position().top == lastScrollPosition) {
							stopScrolling = true;
						}
						lastScrollPosition = $(".arrowed").position().top;
					}
				}
				else {
					if ($(".arrowed").next(".result").length == 0) {
						if ($("#awesomeinput:focus").length) {
							$("#results").scrollTop(99999);
						} else if ($("#opensearchinput:focus").length) {
							$("#opensearch_results").scrollTop(99999);
						}
					}
					else {
						if ($("#awesomeinput:focus").length && !window.keywordEngine && $("#results .result").length) {
							var resultBottomPadding = 4; // taken from css file (.result)
							while ( ($("#results").position().top+$(".arrowed .result_bottom").position().top+resultBottomPadding) > ($("#results").position().top+$("#results").height()) ) {
								$("#results").scrollTop($("#results").scrollTop()+1);
							}
						} else if ($("#opensearchinput:focus").length || window.keywordEngine || (!window.keywordEngine && $("#awesomeinput:focus").length)) {
							var resultBottomPadding = 4; // taken from css file (.result)
							while ( ($("#opensearch_results").position().top+$(".arrowed").next(".result").position().top) > ($("#opensearch_results").position().top+$("#opensearch_results").height()) ) {
								$("#opensearch_results").scrollTop($("#opensearch_results").scrollTop()+1);
							}
						}
					}
				}

				// Update the appropriate input box with the highlighted result's URL or search query
				if ($("#awesomeinput:focus").length) {
					if (window.keywordEngine) {
						$("#awesomeinput").val(html_entity_decode($(".arrowed .suggestion").text()));
					} else {
						$("#awesomeinput").val($(".arrowed").attr("url"));
					}
				} else if ($("#opensearchinput:focus").length) {
					$("#opensearchinput").val(html_entity_decode($(".arrowed").attr("sug")));
				}
				if (window.keywordEngine) {
					setTimeout(function(){
						$("#awesomeinput").setSelection($("#awesomeinput").val().length);
					},1);
				}
				return false;
			}
			else {
				if ($("#awesomeinput:focus").length) {
					$("#results").scrollTop(0);
					$("#awesomeinput").val(window.actualUserInput);
				} else if ($("#opensearchinput:focus").length) {
					$("#opensearch_results").scrollTop(0);
					$("#opensearchinput").val(window.actualSearchInput);
				}
				$(".arrowed").removeClass("arrowed");
				return false;
			}
		}
		// But if no results are displayed, display some
		else if ($("#awesomeinput").val() == "" && $("#awesomeinput:focus").length && !window.keywordEngine) {
			getResults(true); // get the top pages
			return false;
		}
		else if ($("#awesomeinput:focus").length) {
			getResults(); // get results based on the input box's input
			return false;
		}
	}
}

function focusAddressBox () {
	$("#opensearchinput").blur();
	$("#awesomeinput").focus().setSelection(0,$("#awesomeinput").val().length);
}

function focusSearchBox () {
	setTimeout(function(){
		$("#awesomeinput").blur();
		$("#opensearchinput").focus().setSelection(0,$("#opensearchinput").val().length);
	}, 1);
}

// Enter text into the Address Box or Search Box if window.location.hash has input to use.
// Handy when using Chrome's Back/Forward navigation buttons
function refillInputs() {
	if (window.goingToUrl) {
		return false;
	}
	
	if (window.location.hash == '') {
		if (localStorage.option_openfauxbarfocus && localStorage.option_openfauxbarfocus != 'chrome') {
			chrome.tabs.getCurrent(function(currentTab){
				chrome.tabs.getSelected(null, function(selectedTab){
					if (currentTab.id == selectedTab.id) {
						chrome.tabs.update(currentTab.id, {selected:true}, function(){
							window.actualUserInput = '';
							hideResults();
						});
					}
				});
			});
		}
	}
	else {
		// Nullify F+Spacebar default value bug
		var ai = getHashVar('ai');
		if (ai == 'f ') {
			ai = '';
		}
		// Populate Address Box
		if (ai && ai.length) {
			$("#awesomeinput").val(ai);
			window.actualUserInput = ai;
		}
		// Populate Search Box
		if (getHashVar('os')) {
			$("#opensearchinput").val(getHashVar('os'));
		}

		// Keyword search engine
		if (getHashVar('ke')) {
			$("#awesomeinput").val(getHashVar("ke")+" "+ai);
		}

		// Focus/select a Box
		setTimeout(function(){
			if (getHashVar("ke")) {
				setTimeout(getResults, 100);
			} else if (getHashVar('ai') && !getHashVar('sel')) {
				$("#awesomeinput").setSelection($("#awesomeinput").val().length);
				setTimeout(getResults, 1);
			}
			if (getHashVar('sel')) {
				if (getHashVar('sel') == 'ai') { // "if selection == #awesomeinput/AddressBox"
					focusAddressBox();
				} else if (getHashVar('sel') == 'os') { // "if selection == #opensearchinput/SearchBox"
					focusSearchBox();
				} else if (getHashVar('ai')) {
					focusAddressBox();
				}
			}
		}, 10);
	}
	return true;
}

$(window).bind('hashchange', refillInputs);

// Load text into the Address Box or Search Box if needed, and if we aren't reindexing the database
if (localStorage.indexComplete == 1) {
	refillInputs();
}

// Apply custom icon tint colors
if (localStorage.option_iconcolor && localStorage.option_iconcolor.length) {
	changeTintColors();
}

///////// OPTIONS //////////////

// If Fauxbar's hash value says to open display the Options page, and the user isn't reindexing the database, let's initialize and show the options!
// And I decided to show the Options page inline with the normal Fauxbar page, because a lot of the options alter the Fauxbar on the fly, so wanted to have both visible at once,
// rather than making a whole new options page by itself.
if (getHashVar("options") == 1 && localStorage.indexComplete == 1) {
	var newScript = document.createElement("script");
	newScript.setAttribute("src", "/js/options.js");
	document.getElementById('head').appendChild(newScript);
}

//////// END OPTIONS ////////


// Switch to a new Options subpage
function changeOptionPage(el) {
	$("#option_menu div").removeClass("section_selected");
	$(el).addClass("section_selected");
	$("div.optionbox").css("display","none");
	$("#"+$(el).attr("optionbox")).css("display","block");
	localStorage.option_optionpage = $(el).attr("id");
	if ($(el).attr("id") == "option_section_support" && !window.clickedSupportMenu) {
		window.clickedSupportMenu = true;

		// Twitter follow button
		$("head").append('<script src="https://platform.twitter.com/widgets.js" type="text/javascript"></script>');

		// Facebook Like button
		$("#likeBox").html('<iframe src="http://www.facebook.com/plugins/like.php?app_id=112814858817841&amp;href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FFauxbar%2F147907341953576&amp;send=false&amp;layout=standard&amp;width=450&amp;show_faces=false&amp;action=like&amp;colorscheme=light&amp;font=arial&amp;height=35" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:35px;" allowTransparency="true"></iframe>');
		
		// Google+
		//$('head').append('<script type="text/javascript" src="https://apis.google.com/js/plusone.js"></script>');
	}
}

function validateJson(string) {
	try {
		jQuery.parseJSON(string);
		return true;
	} catch(e) {
		return false;
	}
}

// Retrieves the value of the Address Box's input, excluding any selected text. Basically gets what the user has typed, and not what has also been automatically auto-filled for them.
function getAiSansSelected() {
	var aiValLength = $("#awesomeinput").val().length;
	if (aiValLength > 0 && $("#awesomeinput").getSelection().length == aiValLength) {
		return $("#awesomeinput").val();
	} else {
		return $("#awesomeinput").val().substr(0, $("#awesomeinput").val().length - $("#awesomeinput").getSelection().length);
	}
}

// Get the user's Address Box input, search Fauxbar's database for matching history items and bookmarks, display the results, and auto-fill the Address Box input with a matching URL.
function getResults(noQuery) {
	if (noQuery && $("#contextMenu").length) {
		removeContextMenu();
	}

	// Get an array of tabs in the current Chrome window, so we can examine them soon to see if we need to use the "Switch to tab" text/functionality anywhere
	if (!window.keywordEngine && !$(".glow").length) {
		chrome.tabs.getAllInWindow(null, function(tabs){
			window.currentTabs = tabs;
		});
	}

	// As we are getting new results, remove any indiction from any existing result URLs that have been used to auto-fill the Address Box's input for the user.
	$(".autofillmatch").removeClass("autofillmatch");

	// Define what the user has actually typed
	window.actualUserInput = getAiSansSelected();

	var thisQuery = window.actualUserInput;

	if (thisQuery.length == 1 && !window.oneChar) {
		window.oneChar = true;
		setTimeout(function(){
			if (window.actualUserInput == thisQuery) {
				getResults();
			}
		},200);
		return;
	}
	delete window.oneChar;

	if ($(".glow").length) {
		delete window.keywordEngine;
	} else {

		// Search engine keyword?
		var keywordMatch = false;
		if (!window.tileEditMode) {
			if (!window.keywordEngine) {
				var justEnabledKeywordEngine = true;
			}
			var usingKeyword = '';
			$(".menuitem").each(function(){
				var keyword = $(this).attr("keyword");
				if (keyword && thisQuery && thisQuery.substr(0,keyword.length+1) == keyword+" ") {
					keywordMatch = true;
					usingKeyword = keyword;
					$("#awesomeinput").attr("placeholder","Search");
					window.keywordEngine = {shortname:$(this).attr("shortname"), keyword:$(this).attr("keyword"), suggestUrl:$(this).attr("suggesturl")};
					$("#addressbaricon").attr("src",$("img",this).attr("src")).css("opacity",1);
					hideResults();
				}
			});
			if (!keywordMatch && !window.keywordEngine) {
				$("#addressbaricon").attr("src","chrome://favicon/null");
				$(".switchtext").html("Switch to tab:").css("display","");
			}
		}

		if (window.keywordEngine) {
			$("#awesomeInsetButton").addClass("insetButton").removeClass("noInsetButton");
			if (noQuery) {
				$("#opensearch_results").css("display","none").html("");
			} else {
				$(".switchtext").html(window.keywordEngine.shortname).css("display","table-cell");
				if ($("#awesomeinput").val().substr(0,window.keywordEngine.keyword.length+1) == window.keywordEngine.keyword+" ") {
					$("#awesomeinput").val($("#awesomeinput").val().substr(window.keywordEngine.keyword.length+1));
				}
				if ($("#awesomeinput").val().length) {
					if (justEnabledKeywordEngine) {
						getSearchSuggestions(true);
					} else {
						getSearchSuggestions();
					}
				} else {
					$("#opensearch_results").css("display","none").html("");
				}
				return;
			}
		} else {
			$("#awesomeInsetButton").removeClass("insetButton").addClass("noInsetButton");
			$("#opensearch_results").css("display","none").html("");
		}
	}

	// If the user has entered text into the Address Box, or if the user is just getting the top results...
	if ( ($("#awesomeinput").length > 0 && $("#awesomeinput").val().length) || noQuery ) {

		// If results exist right now, auto-fill the Address Box's input with a matching URL if possible
		if ($(".result").length > 0) {
			autofillInput();
		}

		// Get ready for the results
		var sHI = {};

		if (openDb()) {
			// has to be transaction instead of readTransaction for FTS table (not currently implemented, but just for the record)
			window.db.readTransaction(function(tx) {

				// If Address Box input exists, sort out how the SQL select statement should be crafted
				if (!noQuery) {
					var actualText = getAiSansSelected();
					actualText = actualText.trim();
					var words = explode(" ", actualText);
					var urltitleWords = new Array();
					var urltitleQMarks2 = new Array();
					var modifiers = '';

					urltitleWords[urltitleWords.length] = thisQuery+"%";

					for (var w in words) {
						if (words[w] != "") {
							if (words[w].toLowerCase() == 'is:fav') {
								modifiers += ' AND type = 2 ';
							}
							else {
								urltitleWords[urltitleWords.length] = '%'+str_replace("_","¸_",str_replace("%","¸%",words[w]))+'%';
								urltitleQMarks2[urltitleQMarks2.length] = ' urltitletag LIKE ? ESCAPE "¸" ';
							}
						}
					}
				}

				// If actual words exist in the Address Box's input (or if we're getting just getting the top results)...
				if (noQuery || urltitleWords.length > 0 || modifiers != "") {
					var selectStatement = '';

					// Specify the max amount of results to get
					if (noQuery) {
						var resultLimit = 12;
					} else {
						var resultLimit = localStorage.option_maxaddressboxresults ? localStorage.option_maxaddressboxresults : 12;
					}
					resultLimit = resultLimit * 2;

					// Normal SQLite table search

					// Specify for the SQL statement if we're to be getting history items and/or bookmarks
					var typeOptions = new Array;
					if (localStorage.option_showmatchinghistoryitems && localStorage.option_showmatchinghistoryitems == 1) {
						typeOptions[typeOptions.length] = ' type = 1 ';
					}
					if (localStorage.option_showmatchingfavs && localStorage.option_showmatchingfavs == 1) {
						typeOptions[typeOptions.length] = ' type = 2 ';
					}
					typeOptions[typeOptions.length] = ' type = -1 ';
					typeOptions = implode(" OR ", typeOptions);

					// Ignore titleless results if user has opted. But still keep proper files like .js, .php, .pdf, .json, .html, etc.
					var titleless = localStorage.option_ignoretitleless == 1 ? ' AND (title != "" OR urls.url LIKE "%.__" OR urls.url LIKE "%.___" OR urls.url LIKE "%.____" OR urls.url LIKE "%/") ' : "";

					// If user is editing site tiles, don't show results for tiles that have already been added.
					var editModeUrls = '';
					if (window.tileEditMode && window.tileEditMode == true) {
						$("#topthumbs a").each(function(){
							editModeUrls += ' AND urls.url != "'+$(this).attr("url")+'" ';
						});
					}

					// And now to create the statement.
					// If we're just getting the top sites...
					if (noQuery) {
						selectStatement = 'SELECT url, title, type, id, tag FROM urls WHERE url != "" AND ('+typeOptions+') AND queuedfordeletion = 0 '+ titleless + editModeUrls +' ORDER BY frecency DESC, type DESC LIMIT '+resultLimit;
					}

					// If we're searching using the words from the Address Box's input...
					else if (urltitleWords.length > 0) {
						selectStatement = ''
						+ ' SELECT urls.url, title, type, frecency, urls.id, urls.tag, (urls.url||" "||title||" "||urls.tag) AS urltitletag, tags.url*0 as tagscore'
						+ ' FROM urls '
						+ ' LEFT JOIN tags '
						+ ' ON urls.url = tags.url AND tags.tag LIKE ? ' 																  //OR tags.tag LIKE ?
						+ ' WHERE urls.url != "" AND ('+typeOptions+') AND queuedfordeletion = 0 '+modifiers+' '+(urltitleQMarks2.length ? ' AND '+implode(" AND ", urltitleQMarks2) : ' ')+' ' + titleless + editModeUrls
						+ ' ORDER BY tagscore DESC, frecency DESC, type DESC LIMIT '+resultLimit;
					}

					// Not sure if this actually ever gets used.
					else {
						selectStatement = 'SELECT url, title, type, id, tag FROM urls WHERE url != "" AND ('+typeOptions+') AND queuedfordeletion = 0 '+ modifiers + titleless + editModeUrls +' ORDER BY frecency DESC, type DESC LIMIT '+resultLimit;
					}


					// If the user's computer is lagging and taking a while to retrieve the results, display a loading on the left side of the Address Box
					window.waitingForResults = true;
					window.fetchResultStartTime = microtime(true);
					setTimeout(function(){
						if (window.waitingForResults == true && microtime(true) - window.fetchResultStartTime > 1 && $("#awesomeinput:focus").length == 1 && $("#awesomeinput").getSelection().length != $("#awesomeinput").val().length) {
							$("#addressbaricon").attr("src","/img/throbber.svg");
						} else if ($("#addressbaricon").attr("src") == "/img/throbber.svg") {
							$("#addressbaricon").attr("src","chrome://favicon/null");
						}
					}, 1000);

					// If, in the time it's taken to do the above, the user has entered new input that does not match what we're about to search for, cancel.
					// The new call of getResults() that's most likely occurred will take priority over this one.
					if (thisQuery != window.actualUserInput || !noQuery && $(".glow").length == 1) {
						if (localStorage.option_timing == "delayed") {
							return false;
						}
					}

					// Get the results from Fauxbar's database
					window.selectStatement = selectStatement;
					window.thisQuery = thisQuery;

					if (clearMenus) {
						clearMenus();
					}
					!window.goingToUrl && tx.executeSql(selectStatement, urltitleWords, function (tx, results) {

						window.waitingForResults = false;
						var len = results.rows.length, i;

						// If there's no matching results that have been returned, cancel.
						if (len == 0) {
							hideResults();
							return false;
						}
						var newItem = {};

						// Create each returned row into a new object
						// Don't process "javascript" items
						var jsTest = 'javascript:';
						for (var i = 0; i < len; i++) {
							newItem = {};
							if (results.rows.item(i).url.toLowerCase().substring(0,jsTest.length) != jsTest) {
								newItem.url = results.rows.item(i).url;
								newItem.title = results.rows.item(i).title;
								newItem.id = results.rows.item(i).id;
								newItem.tag = results.rows.item(i).tag;
								if (results.rows.item(i).type == 2) {
									newItem.isBookmark = true;
								}
								sHI[i] = newItem;
							}
						}

						var maxRows = resultLimit / 2;
						var currentRows = 0;

						// If entered input has changed, or user is now longer looking for their top sites, cancel.
						if (thisQuery != window.actualUserInput || !noQuery && $(".glow").length == 1) {
							if (localStorage.option_timing == "delayed") {
								return false;
							}
						}

						// If user has navigated to a result, or scrolled #results, stop - don't display anything more.
						if (!window.userHasNewInput && (($(".arrowed").length == 1 && window.actualUserInput.length > 0) || $("#results").scrollTop() != 0) ) {
							return false;
						}

						// Getting ready to make matching words appear bold/underlined
						var text = getAiSansSelected();

						// The ¸ cedilla character will largely act as a special/unique character for our bold/underline character replacement method below, so make it be a space if user happens to use it (sorry to anyone who actually uses it!)
						text = str_replace("¸", " ", text);

						// Replace other special characters with their HTML equivalents (or is it the other way around...?)
						text = replaceSpecialChars(text);

						var resultHtml = "";
						var titleText = "";
						var urlText = "";
						var tagText = "";
						var urlTextAttr = "";
						var regEx = "";
						var matchClasses = "";
						var spanOpen = "";
						var spanClose = "";
						var hI = "";
						var resultIsOkay = true;
						var arrowedClass = '';
						var urlExplode = '';
						var newHref = '';

						if (window.tileEditMode) {
							var resultOnClick = 'addTileThis';
							var addTileText = 'Add tile: ';
						} else {
							var resultOnClick = 'clickResultThis';
							var addTileText = '';
						}

						// Another chance to cancel... don't want to waste processing time!
						if (thisQuery != window.actualUserInput || !noQuery && $(".glow").length == 1) {
							if (localStorage.option_timing == "delayed") {
								return false;
							}
						}

						// Process the blacklist
						if (localStorage.option_blacklist && localStorage.option_blacklist.length) {
							var blacksites = explode(",", localStorage.option_blacklist);
						} else {
							var blacksites = new Array;
						}

						// As we're close to showing the new results, hide any currently shown results.
						hideResults();

						// For each history item and bookmark we've retrieved that matches the user's text...
						for (var ii in sHI) {
							if (currentRows < maxRows) {
								hI = sHI[ii];
								resultIsOkay = true;

								// Check to see if site is on the blacklist
								if (resultIsOkay && blacksites.length) {
									for (var b in blacksites) {
										var bs = blacksites[b].trim();
										var blackparts = explode("*",bs);
										var partsMatched = 0;
										for (var p in blackparts) {
											if (strstr(hI.url, blackparts[p])) {
												partsMatched++;
											}
										}
										if (partsMatched == blackparts.length) {
											resultIsOkay = false;
											break;
										}
									}
								}

								// When searching the database, Fauxbar returns both history and bookmarks. <strike>History items</strike> Bookmarks come first.
								// If this is a bookmark result, add a bookmark icon to the existing history result.
								// Then, cancel continuing on with this result.
								if (resultIsOkay && $('.result[url="'+hI.url+'"]').length > 0) {
									if ($('.result[url="'+hI.url+'"] img.favstar').length == 0) {
										if (!strstr(getAiSansSelected().toLowerCase(), "is:fav")) {
											if (hI.isBookmark && !noQuery) { // bookmark
												//$('.result_title[url="'+hI.url+'"]').html('<img class="result_favicon" src="chrome://favicon/'+hI.url+'" />'+titleText);
												//$('.result[url="'+hI.url+'"]').prepend('<img class="favstar" />');
											}
											resultIsOkay = false;
										}
									} else if (localStorage.option_consolidateBookmarks && localStorage.option_consolidateBookmarks == 1) {
										resultIsOkay = false;
									}
								}

								if (resultIsOkay) {

									// Get each word the user has entered
									if (!noQuery) {
										words = explode(" ", text);
									}

									// Sort words from longest length to shortest
									if (words) {
										words.sort(compareStringLengths);
									}

									// If result is titleless, make its URL be the title
									if (hI.title == "") {
										urlExplode = explode("/", hI.url);
										titleText = urldecode(urlExplode[urlExplode.length-1]);
										if (titleText.length == 0) {
											titleText = urldecode(hI.url);
										}
									} else {
										titleText = hI.title;
									}

									urlText = urldecode(hI.url);

									// Remove "http://" from the beginning of URL if user has opted for it in the Options
									if (urlText.substring(0,7) == 'http://' && localStorage.option_hidehttp && localStorage.option_hidehttp == 1) {
										urlText = urlText.substr(7);
										if (substr_count(urlText, '/') == 1 && urlText.substr(urlText.length-1) == '/') {
											urlText = urlText.substr(0, urlText.length-1);
										}
									}

									tagText = hI.tag;

									// Replace special characters with a bunch of % symbols
									titleText = replaceSpecialChars(titleText);
									urlText = replaceSpecialChars(urlText);
									tagText = replaceSpecialChars(tagText);

									// Wrap each word with some funky characters
									for (var iii in words) {
										if (words[iii] != "") {
											regEx = new RegExp(words[iii], 'gi');
											titleText = titleText.replace(regEx, '¸%%%%%¸$&¸%%%%¸');
											urlText = urlText.replace(regEx, '¸%%%%%¸$&¸%%%%¸');
											tagText = tagText.replace(regEx, '¸%%%%%¸$&¸%%%%¸');
										}
									}

									// Replace those funky percent symbols back to normal.
									// This is all in an effort to make RegExp work, so that the user can use full character searching :)
									titleText = replacePercents(titleText);
									urlText = replacePercents(urlText);
									tagText = replacePercents(tagText);

									// Prep the CSS classes to uses
									matchClasses = " match ";
									if (localStorage.option_underline && localStorage.option_underline == 1) {
										matchClasses += " underline ";
									}
									if (localStorage.option_bold && localStorage.option_bold == 1) {
										matchClasses += " bold ";
									}

									spanOpen = '<span class="'+matchClasses+'">';
									spanClose = '</span>';

									// Replace the last percent symbols with their original texts
									titleText = str_replace("¸%%%%%¸", spanOpen, titleText);
									titleText = str_replace("¸%%%%¸", spanClose, titleText);
									urlText = str_replace("¸%%%%%¸", spanOpen, urlText);
									urlText = str_replace("¸%%%%¸", spanClose, urlText);
									tagText = str_replace("¸%%%%%¸", spanOpen, tagText);
									tagText = str_replace("¸%%%%¸", spanClose, tagText);

									titleText = str_replace('&', '&amp;', titleText);
									urlText = str_replace('&', '&amp;', urlText);
									tagText = str_replace('&', '&amp;', tagText);

									titleText = str_replace(spanOpen, "¸%%%%%¸", titleText);
									titleText = str_replace(spanClose, "¸%%%%¸", titleText);
									urlText = str_replace(spanOpen, "¸%%%%%¸", urlText);
									urlText = str_replace(spanClose, "¸%%%%¸", urlText);
									tagText = str_replace(spanOpen, "¸%%%%%¸", tagText);
									tagText = str_replace(spanClose, "¸%%%%¸", tagText);

									titleText = str_replace(">", "&gt;", titleText);
									titleText = str_replace("<", "&lt;", titleText);

									urlText = str_replace(">", "&gt;", urlText);
									urlText = str_replace("<", "&lt;", urlText);

									tagText = str_replace(">", "&gt;", tagText);
									tagText = str_replace("<", "&lt;", tagText);

									titleText = str_replace("¸%%%%%¸", spanOpen, titleText);
									titleText = str_replace("¸%%%%¸", spanClose, titleText);
									urlText = str_replace("¸%%%%%¸", spanOpen, urlText);
									urlText = str_replace("¸%%%%¸", spanClose, urlText);
									tagText = str_replace("¸%%%%%¸", spanOpen, tagText);
									tagText = str_replace("¸%%%%¸", spanClose, tagText);

									// Make the URL display the "Switch to tab" text if tab is already open in current window
									urlTextAttr = urlText;
									if (!window.tileEditMode && !window.keywordEngine && localStorage.option_switchToTab != "disable") {
										for (var ct in window.currentTabs) {
											if (currentTabs[ct].url == hI.url && currentTabs[ct].id != window.currentTabId) {
												if (localStorage.option_switchToTab == "replace") {
													urlText = '<img src="/img/tabicon.png" style="opacity:.6" /> <span class="switch">Switch to tab</span>';
												} else {
													urlText = '<img src="/img/tabicon.png" style="opacity:.6" /> <span class="switch">Switch to tab</span>: '+urlText;
												}
											}
										}
									}

									// Render the result's HTML
									if (resultIsOkay) {
										resultHtml = "";
										arrowedClass = '';

										// If URL starts with file:/// handle the URL with Fauxbar, since Chrome doesn't interpret it as a link.
										if (hI.url.length >= 8 && hI.url.substring(0, 8) == "file:///") {
											newHref = "/html/loadfile.html#"+hI.url;
										} else {
											newHref = hI.url;
										}

										resultHtml += '<a class="result '+arrowedClass+'" url="'+hI.url+'" href="'+newHref+'" origtitle="'+str_replace('"','&quot;',hI.title)+'" number="'+(currentRows+1)+'" '+resultOnClick+' bmid="'+hI.id+'" keyword="'+hI.tag+'">';
										if (hI.isBookmark) {
											resultHtml += '<img class="favstar" style="position:absolute;" />';
										}
										resultHtml += '	';
										if (hI.tag) {
											resultHtml += '<span class="resultTag" style="white-space:nowrap; position:absolute; display:block; font-size:'+localStorage.option_urlsize+'px; text-decoration:none">'+tagText+'</span>';
										}
										resultHtml += '	<div class="result_title" url="'+hI.url+'"><img class="result_favicon" src="chrome://favicon/'+hI.url+'" />'+titleText+'</div><br />';
										resultHtml += '	<div class="result_url">'+addTileText+urlText+'</div>';
										resultHtml += ' <div class="visitinfo" id="hi_'+hI.id+'" url="'+hI.url+'"></div>';
										resultHtml += ' <div class="result_url_hidden">'+urlTextAttr+'</div>';
										resultHtml += ' <div class="result_bottom" height="1px"></div>';
										resultHtml += '</a>\r\n';

										if (!noQuery && $("#awesomeinput").getSelection().length == $("#awesomeinput").val().length) {
											if (!window.navigating) {
												return false;
											}
										}

										$("#results").append(resultHtml);
										autofillInput(thisQuery);
										currentRows++;
									}
								}
							}
						}
						delete window.navigating;

						// Remove the Address Box's loading icon
						window.fetchResultStartTime = microtime(true);
						if ($("#addressbaricon").attr("src") == "/img/throbber.svg") {
							$("#addressbaricon").attr("src","chrome://favicon/null");
						}

						// If there's no results, hide any existing ones.
						if ($("#results").html() == "") {
							hideResults();
						}
						// Otherwise, display the results!
						else {

							// However, if Fauxbar has told Chrome to go to a URL just now, don't get results for the moment
							if (window.goingToUrl) {
								setTimeout(function(){
									delete window.goingToUrl;
								}, 200);
								return false;
							}

							// If user has deleted their query, hide and return.
							if (window.actualUserInput == "" && !noQuery) {
								hideResults();
								return;
							}

							// Display results.
							$("#results").css("display","block").css("opacity",0)
								.css("position","fixed")
								.css("top",$("#awesomeinput").offset().top+$("#awesomeinput").outerHeight()+4+"px")
								.css("left",$("#addresswrapper").offset().left-2+"px")
								.css("width", $("#addresswrapper").outerWidth()-2+"px")
							;

							// "Truncate" result titles and urls with "..." if they're too long.
							// This is kind of dodgy because it's just creating a <span> containing "..." on top of the right side of the results.
							// Might be better to actually truncate, though it would be slower.
							window.cutoff = 70;
							if (!window.resultsAreScrollable) {
								window.cutoff = window.cutoff - getScrollBarWidth();
							}

							$("#results .result_url").each(function(){
								if ($(this).innerWidth() > $("#results").innerWidth() - 67) {
									$(this).css("width", ($("#results").innerWidth() - 67) + "px").prepend('<span class="dotdotdot">...</span>');
								}
							});

							var starWidth = 0;

							$("#results .result_title").each(function(){
								starWidth = 32; //16*2
								tagWidth = $(this).prev(".resultTag").innerWidth() + ($(this).prev(".resultTag").length * -6);

								if ($(this).offset().left+$(this).outerWidth() > $("#results").offset().left+$("#results").innerWidth() - 10 - starWidth - tagWidth) {
									$(this)
										.css("width", ($("#results").outerWidth()-16-starWidth-tagWidth)+"px")
										.prepend('<span class="dotdotdot">...</span>')
									;
								}
							});

							// Resize height of #results so no results get uglily cut in half
							var resultHeight = $(".result").first().outerHeight();
							window.resultsAreScrollable = false;
							if (resultHeight > 0) {
								var maxHeight = Math.floor($(window).height() - $(".wrapper").outerHeight() - 80);
								var maxVisibleRows = Math.floor(maxHeight / resultHeight);
								var defaultMaxVisible = 8;
								if (noQuery) {
									maxVisibleRows = 12;
								} else if (localStorage.option_maxaddressboxresultsshown) {
									if (localStorage.option_maxaddressboxresultsshown < maxVisibleRows) {
										maxVisibleRows = localStorage.option_maxaddressboxresultsshown;
									}
								} else if (defaultMaxVisible < maxVisibleRows) {
									maxVisibleRows = defaultMaxVisible;
								}

								var newResultsHeight = 0;
								for (x = 0; x < maxVisibleRows; x++) {
									newResultsHeight += resultHeight;
								}
								$("#results").css("max-height", (newResultsHeight-1)+"px");
								if ($(".result").length > maxVisibleRows) {
									window.resultsAreScrollable = true;
								}
							}

							// Show the results
							$("#results .result").last().css("border-bottom",0);

							var scrollbarWidth = window.resultsAreScrollable ? getScrollBarWidth() : 0;

							$("#results .favstar").attr("src", $("#fauxstar").attr("src")).css("margin-left",($("#results").innerWidth()-25-scrollbarWidth)+"px").css("margin-top","2px");
							$(".resultTag").each(function(){
								$(this).css("left", $("#results").offset().left + $("#results").outerWidth() - $(this).outerWidth() - $(this).offset().left - ($(this).prev(".favstar").length*16) - scrollbarWidth);
							});

							if (!keywordMatch && thisQuery == window.actualUserInput && !window.keywordEngine) {
								toggleSwitchText();
							}
							window.mouseHasMoved = false;

							if (window.keywordEngine && !noQuery) {
								hideResults();
								return;
							}
							if (thisQuery.length || thisQuery == window.actualUserInput || (!noQuery && $(".glow").length == 1)) {
								$("#results").attr("noquery",(noQuery?1:0)).css("opacity",1);
							}

							// Ask Chrome to possibly pre-render a best-guess result for the user, based on the user's Address Box habits
							if (!noQuery && localStorage.option_prerender == 1 && /*$(".switch").length == 0 &&*/ !window.tileEditMode && thisQuery == window.actualUserInput) {
								window.db.transaction(function(tx){
									tx.executeSql('SELECT url FROM inputurls WHERE input = ? LIMIT 1', [thisQuery.toLowerCase()], function(tx, results){
										if (results.rows.length == 1 && thisQuery == window.actualUserInput) {
											console.log("Requesting pre-render for "+results.rows.item(0).url);
											$("body").append('<link rel="prerender" href="'+results.rows.item(0).url+'">');
											window.prerenderedUrl = results.rows.item(0).url;
										}
									});
								});
							}

							// Auto append Address Box input with a best-guess URL.
							// But won't autofill if user pressed backspace, delete, or if user has selected with ctrl+a
							autofillInput(thisQuery);

							///////////////////////////////////////////////////////
							// commenting out but DON'T DELETE.
							// the code below shows which type of page transition Chrome has attached to each site's history visit.
							// see getTransitions() function below for more info

							/*window.infoDivs = new Array();
							$("div.visitinfo").each(function(i,el){
								window.infoDivs[window.infoDivs.length] = el;
							});
							window.infoDivs.reverse();
							getTransitions();*/

							///////////////////////////////////////////////////////
						}
					});
				}
			}, function(t){
				if (!window.goingToUrl) {
					errorHandler(t, getLineInfo());
				}
			});
		}
	}
	else {
		hideResults();
	}
}

// resultOnClick
$('[addTileThis]').live('click', function(){
	addTile(this);
	return false;
});
$('[clickResultThis]').live('click', function(){
	return window.clickResult(this);
});


// Hide the Address Box's currently displayed results.
function hideResults() {
	if ($(".result").length > 0) {
		$(".glow").removeClass("glow");
	}
	$("#results").css("display","none").html("");
}

// Update the tab's hash value with what's currently in the Address and Search Boxes, so that the input can be restored if the user navigates pages back/forth.
function updateHash() {
	var ai = 'ai='+urlencode(window.actualUserInput ? window.actualUserInput : $("#awesomeinput").val());
	var os = '&os='+urlencode($("#opensearchinput").val());
	var sel = '&sel=';
	var ke = '&ke=';
	var options = "";
	if ($("#awesomeinput:focus").length || window.goingToUrl) {
		sel += 'ai';
	} else if ($("#opensearchinput:focus").length) {
		sel += 'os';
	}
	if (getHashVar("options") == 1) {
		options = "&options=1";
	}
	if (window.keywordEngine) {
		ke += window.keywordEngine.keyword;
	}
	var hash = '#'+ai+os+sel+ke+options;
	if (hash != window.location.hash) {
		window.location.hash = hash;
	}
	return true;
}

// http://www.somacon.com/p355.php
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}

// http://phpjs.org/functions/get_html_translation_table:416
function get_html_translation_table (table, quote_style) {
    // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
    // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
    var entities = {},
        hash_map = {},
        decimal = 0,
        symbol = '';
    var constMappingTable = {},
        constMappingQuoteStyle = {};
    var useTable = {},
        useQuoteStyle = {};

    // Translate arguments
    constMappingTable[0] = 'HTML_SPECIALCHARS';
    constMappingTable[1] = 'HTML_ENTITIES';
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
    constMappingQuoteStyle[2] = 'ENT_COMPAT';
    constMappingQuoteStyle[3] = 'ENT_QUOTES';

    useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
    useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

    if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
        throw new Error("Table: " + useTable + ' not supported');
        // return false;
    }

    entities['38'] = '&amp;';
    if (useTable === 'HTML_ENTITIES') {
        entities['160'] = '&nbsp;';
        entities['161'] = '&iexcl;';
        entities['162'] = '&cent;';
        entities['163'] = '&pound;';
        entities['164'] = '&curren;';
        entities['165'] = '&yen;';
        entities['166'] = '&brvbar;';
        entities['167'] = '&sect;';
        entities['168'] = '&uml;';
        entities['169'] = '&copy;';
        entities['170'] = '&ordf;';
        entities['171'] = '&laquo;';
        entities['172'] = '&not;';
        entities['173'] = '&shy;';
        entities['174'] = '&reg;';
        entities['175'] = '&macr;';
        entities['176'] = '&deg;';
        entities['177'] = '&plusmn;';
        entities['178'] = '&sup2;';
        entities['179'] = '&sup3;';
        entities['180'] = '&acute;';
        entities['181'] = '&micro;';
        entities['182'] = '&para;';
        entities['183'] = '&middot;';
        entities['184'] = '&cedil;';
        entities['185'] = '&sup1;';
        entities['186'] = '&ordm;';
        entities['187'] = '&raquo;';
        entities['188'] = '&frac14;';
        entities['189'] = '&frac12;';
        entities['190'] = '&frac34;';
        entities['191'] = '&iquest;';
        entities['192'] = '&Agrave;';
        entities['193'] = '&Aacute;';
        entities['194'] = '&Acirc;';
        entities['195'] = '&Atilde;';
        entities['196'] = '&Auml;';
        entities['197'] = '&Aring;';
        entities['198'] = '&AElig;';
        entities['199'] = '&Ccedil;';
        entities['200'] = '&Egrave;';
        entities['201'] = '&Eacute;';
        entities['202'] = '&Ecirc;';
        entities['203'] = '&Euml;';
        entities['204'] = '&Igrave;';
        entities['205'] = '&Iacute;';
        entities['206'] = '&Icirc;';
        entities['207'] = '&Iuml;';
        entities['208'] = '&ETH;';
        entities['209'] = '&Ntilde;';
        entities['210'] = '&Ograve;';
        entities['211'] = '&Oacute;';
        entities['212'] = '&Ocirc;';
        entities['213'] = '&Otilde;';
        entities['214'] = '&Ouml;';
        entities['215'] = '&times;';
        entities['216'] = '&Oslash;';
        entities['217'] = '&Ugrave;';
        entities['218'] = '&Uacute;';
        entities['219'] = '&Ucirc;';
        entities['220'] = '&Uuml;';
        entities['221'] = '&Yacute;';
        entities['222'] = '&THORN;';
        entities['223'] = '&szlig;';
        entities['224'] = '&agrave;';
        entities['225'] = '&aacute;';
        entities['226'] = '&acirc;';
        entities['227'] = '&atilde;';
        entities['228'] = '&auml;';
        entities['229'] = '&aring;';
        entities['230'] = '&aelig;';
        entities['231'] = '&ccedil;';
        entities['232'] = '&egrave;';
        entities['233'] = '&eacute;';
        entities['234'] = '&ecirc;';
        entities['235'] = '&euml;';
        entities['236'] = '&igrave;';
        entities['237'] = '&iacute;';
        entities['238'] = '&icirc;';
        entities['239'] = '&iuml;';
        entities['240'] = '&eth;';
        entities['241'] = '&ntilde;';
        entities['242'] = '&ograve;';
        entities['243'] = '&oacute;';
        entities['244'] = '&ocirc;';
        entities['245'] = '&otilde;';
        entities['246'] = '&ouml;';
        entities['247'] = '&divide;';
        entities['248'] = '&oslash;';
        entities['249'] = '&ugrave;';
        entities['250'] = '&uacute;';
        entities['251'] = '&ucirc;';
        entities['252'] = '&uuml;';
        entities['253'] = '&yacute;';
        entities['254'] = '&thorn;';
        entities['255'] = '&yuml;';
    }

    if (useQuoteStyle !== 'ENT_NOQUOTES') {
        entities['34'] = '&quot;';
    }
    if (useQuoteStyle === 'ENT_QUOTES') {
        entities['39'] = '&#39;';
    }
    entities['60'] = '&lt;';
    entities['62'] = '&gt;';


    // ascii decimals to real symbols
    for (decimal in entities) {
        symbol = String.fromCharCode(decimal);
        hash_map[symbol] = entities[decimal];
    }

    return hash_map;
}

// http://phpjs.org/functions/html_entity_decode:424
function html_entity_decode (string, quote_style) {
    // *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
    // *     returns 1: 'Kevin & van Zonneveld'
    // *     example 2: html_entity_decode('&amp;lt;');
    // *     returns 2: '&lt;'
    var hash_map = {},
        symbol = '',
        tmp_str = '',
        entity = '';
    tmp_str = string.toString();

    if (false === (hash_map = this.get_html_translation_table('HTML_ENTITIES', quote_style))) {
        return false;
    }

    // fix &amp; problem
    // http://phpjs.org/functions/get_html_translation_table:416#comment_97660
    delete(hash_map['&']);
    hash_map['&'] = '&amp;';

    for (symbol in hash_map) {
        entity = hash_map[symbol];
        tmp_str = tmp_str.split(entity).join(symbol);
    }
    tmp_str = tmp_str.split('&#039;').join("'");

    return tmp_str;
}


// When typing in the Address Box, this function appends the input box's text with the rest of a matching URL from the results, and selects it.
// So the user could go to a whole URL by just typing the first few letters, and the rest of the URL will be auto-filled automatically for them.
// Since v1.2.10, also attempts to auto-select the first result instead if user has opted for this auto-assist option.
function autofillInput(thisQuery) {
	if (
		//(!localStorage.option_autofillurl || localStorage.option_autofillurl == 1) && !window.tileEditMode &&
		(!localStorage.option_autoAssist || localStorage.option_autoAssist == 'autoFillUrl') && !window.tileEditMode &&
		window.lastKeyCode != 8 && window.lastKeyCode != 46 && $("#awesomeinput").getSelection().length != $('#awesomeinput').val().length
	) {
		var ai = $("#awesomeinput").val();
		var fru = '';
		var tu = '';
		$(".result").each(function(){
			if (fru == '') {
				tu = $(this).attr("url");
				if (tu && ('http://'+ai == tu.substr(0,('http://'+ai).length) || 'http://www.'+ai == tu.substr(0,('http://www.'+ai).length) || ai == tu.substr(0,ai.length) || 'https://'+ai == tu.substr(0,('https://'+ai).length) || 'https://www.'+ai == tu.substr(0,('https://www.'+ai).length)) ) {
					fru = html_entity_decode(strip_tags($(".result_url",this).html()));
					$(this).addClass("autofillmatch");
				}
			}
		});

		if (fru != '') {
			var newVal = ai + explode(ai, fru, 2)[1];
			if (substr_count(newVal, '/') == 1 && newVal.substr(newVal.length-1) == '/' && $("#awesomeinput").val().substr(-1) != '/') {
				newVal = newVal.substr(0, newVal.length-1);
			}
			if ($("#awesomeinput").getSelection().length == 0) {
				//if ((!localStorage.option_autofillurl || localStorage.option_autofillurl == 1) && !window.tileEditMode) {
					$("#awesomeinput").val(newVal).setSelection(ai.length, $("#awesomeinput").val().length);
				//}
			}
		}
	}
	else if (
		//(!localStorage.option_autofillurl || localStorage.option_autofillurl == 1) && !window.tileEditMode &&
		(!localStorage.option_autoAssist || localStorage.option_autoAssist == 'autoSelectFirstResult') && !window.tileEditMode &&
		window.lastKeyCode != 8 && window.lastKeyCode != 46 && $("#awesomeinput").getSelection().length != $('#awesomeinput').val().length
	) {
		$(".result").first().addClass("arrowed");
	}
}

var reindexingBookmarksMessage = '<div id="editmodeContainer" class="reindexingBookmarksMessage" style="box-shadow:0 2px 2px rgba(0,0,0,.3);"><div id="manualmode"><img src="/img/fauxbar48.png" /> Since a bookmark folder was recently deleted, Fauxbar is currently reindexing your bookmarks. Address Box results may seem delayed during this time. Once complete, this message will disappear.</div></div>';
if (localStorage.reindexingBookmarks) {
	$("#maindiv").before(reindexingBookmarksMessage);
}

chrome.runtime.onMessage.addListener(function(request){
	if (request == "reindexing bookmarks") {
		$("#maindiv").before(reindexingBookmarksMessage);
	}
	else if (request == "done reindexing bookmarks") {
		$(".reindexingBookmarksMessage").remove();
	}
});

// Make chrome:// links work
$('a').live('mouseup', function(e){
	if (substr($(this).attr('href'), 0, 9) == 'chrome://') {
		console.log(e);
		var link = $(this);
		if ($(this).hasClass('forceNewTab')) {
			if (e.shiftKey == true && e.button == 0) { // Left-click
				chrome.windows.create({ url:$(this).attr('href'), focused:true });
			} else {
				chrome.tabs.getCurrent(function(currentTab){
					chrome.tabs.create({ url:$(link).attr('href'), active:e.shiftKey||$(link).hasClass('makeActive')?true:false, index:currentTab.index+1 });
				});
			}
		} else {
			if (e.shiftKey == true && e.button == 0) {
				chrome.windows.create({ url:$(this).attr('href'), focused:true });
			} else if (e.button == 0) {
				chrome.tabs.getCurrent(function(currentTab){
					if (e.ctrlKey) {
						chrome.tabs.create({ url:$(link).attr('href'), active:e.shiftKey?true:false, index:currentTab.index+1 });
					} else {
						chrome.tabs.update(currentTab.id, { url:$(link).attr('href') });
					}
				});
			} else if (e.button == 1) {
				chrome.tabs.getCurrent(function(currentTab){
					chrome.tabs.create({ url:$(link).attr('href'), active:e.shiftKey?true:false, index:currentTab.index+1 });
				});
			}
		}
	}
});
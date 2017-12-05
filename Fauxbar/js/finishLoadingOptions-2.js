$(window).bind("resize", function(){
	$("#options").css("position","absolute").css("top",$(".wrapper").offset().top+$(".wrapper").outerHeight()+30+"px").css("margin","0");
	if (window.innerWidth >= 1100) {
		$("#options").css("width","1000");
	} else {
		$("#options").css("width",window.innerWidth - 50 + "px");
	}
	$("#options").css("left", window.innerWidth/2 - $("#options").outerWidth()/2 + "px" );
}).trigger("resize");

// Update the page/tab title
document.title = (localStorage.extensionName ? localStorage.extensionName : "Fauxbar")+": Options";

// Make the Address Box lose focus
$("#awesomeinput").blur();

// Apply input masks/restrictions on some of the number-only inputs, as a simple form of form validation.
// I haven't really enforced any strict form of form validation anywhere, frankly.
function doMasking() {
	try {
		$(".color").mask("#***?***", {placeholder:""});
		$(".fontsize, .upto").mask("9?99", {placeholder:""});
		$("#option_maxwidth").mask("9?999", {placeholder:""});
		$(".opacity").mask("9?99", {placeholder:""});
	} catch(e) {
		setTimeout(doMasking, 500);
	}
}
doMasking();

// Stop animating the Fauxbar's Address Box and Search Box reordering/fading animation when the user presses a key to change it to something else (so there's no animation queueing)
$("select").live("keyup", function(){
	$("#thefauxbar").children("table").first().stop();
	$(this).change();
});

// Apply some Options page CSS automatically, sice I'm too lazy to keep on top of hard-coding the styles myself as I change the order of the HTML elements here and there.
$("table#options td").each(function(){
	$(this).children("label.legend").last().css("margin-bottom","0");
});

// Some more automatic HTML insertion, making my life easier
$("label.legend:not(.noBreak)").after("<br />");

// When user changes the Fallback URL option, disable the preset buttons if needed (usability design)
$("#option_fallbacksearchurl").live("change", function(){
	$(".fallback").prop("disabled",false).each(function(){
		if ($(this).attr("url") == $("#option_fallbacksearchurl").val()) {
			$(this).prop("disabled",true);
		}
	});
});

// When user clicks the little down or up arrow on a number input, trigger that the value has change()'d
$('input[type="number"]').live("click",function(){
	$(this).change();
});
$('input[type="number"]').live("keyup",function(){
	$(this).change();
});

// When the Chrome window is resized, resize the Options page appropriately
$(window).bind("resize", function(){
	$(".optionbox").css("height", $(window).height()-150-$("#thefauxbar").height()-$('#menubar').outerHeight()+"px");
});
// And trigger it too here, so that the Option page's dimensions are correct from the getgo
$(window).resize();

// When the user clicks to change to a different Options page, make it so
$("#option_menu div").bind("mousedown", function(){
	changeOptionPage(this);
});

// Change to the last Options page the user was on
changeOptionPage($("#" + (localStorage.option_optionpage ? localStorage.option_optionpage : "option_section_general")));

// Load the list of search engines for the Search Box Options page
getSearchEngines();

//////////////////////////////////////////////////////
// Drag open search engine to change position/order //
//////////////////////////////////////////////////////

// When user begins to click and drag a search engine to rearrange the order, make it liftable
$(".osicon").live("mousedown", function() {
	window.mouseHasMoved = false;
	var thisParent = $(this).parent();
	var thisOffset = $(this).offset();
	$("body").append('<table id="dragging_os_row" style="width:'+thisParent.width()+'px; top:'+thisOffset.top+"px"+'; left:'+thisOffset.left+"px"+';"><tr class="opensearch_optionrow">'+thisParent.html()+'</tr></table>');
	$("#dragging_os_row tr td.shortname input").val($(this).nextAll("td.shortname").children("input").val());
	$("#dragging_os_row tr td.keyword input").val($(this).nextAll("td.keyword").children("input").val());
	$("#dragging_os_row tr td.searchurl input").val($(this).nextAll("td.searchurl").children("input").val());
	$(this).parent().before('<tr class=".opensearch_optionrow dotted_os_row" style="height:'+$(this).parent().outerHeight()+'px;"><td colspan="5">&nbsp;</td></tr>');
	$(this).parent().css("display","none");
	window.draggingOsRow = true;
	return false;
});

// When user presses Enter/Return in an input box, make the input box lose focus, since the user is done making changes
$('table#options input[type="text"], table#options input[type="number"]').live("keyup", function(e){
	if (e.keyCode == 13) {
		$(this).blur();
	}
});

// When the user edits one of the search engines (like its name or URL), update the database
$("tr.opensearch_optionrow td input").live("change", function(){
	$(this).val(str_replace('"','',$(this).val()));
	if (openDb()) {
		var osRow = $(this).parent().parent();
		window.db.transaction(function(tx){
			tx.executeSql('UPDATE opensearches SET shortname = ?, searchurl = ?, keyword = ? WHERE shortname = ?', [str_replace('"','',$('.shortname > input',osRow).val().trim()), $('.searchurl > input',osRow).val().trim(), $('.keyword > input',osRow).val().trim(), $('.shortname > input',osRow).attr("origvalue")]);
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			$("#opensearchoptionstable > tbody > tr > td.shortname > input, #opensearchoptionstable > tbody > tr > td.searchurl > input").each(function(){
				$(this).attr("origvalue",$(this).val());
			});
			populateOpenSearchMenu();
			chrome.runtime.sendMessage(null, "backup search engines");
		});
	}
});

// When user clicks the cross next to a search engine, remove it from the database and from the screen
$(".opensearchcross").live("mousedown", function(){
	if (openDb()) {
		var theCell = this;
		window.db.transaction(function(tx){
			tx.executeSql('DELETE FROM opensearches WHERE shortname = ?', [$(theCell).prevAll('td.shortname').children('input').first().val()]);
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			chrome.runtime.sendMessage(null, "backup search engines");
		});
		$(theCell).parent().animate({opacity:0}, 0, function() {
			$(this).remove();
			populateOpenSearchMenu();
			getSearchEngines();
		});
	}
});

// Retrieve and set saved options from localStorage, loading the values into input boxes and checking checkboxes as needed
var thisAttrId = "";
$("table#options input").each(function(){
	thisAttrId = $(this).attr("id");
	switch ($(this).attr("type")) {
		case "checkbox":
			if (thisAttrId) {
				$(this).prop("checked", localStorage[thisAttrId] == 1 ? "checked" : "");
			}
			break;
		default: //"text", "number"
			var defaultVal = '';
			if (thisAttrId == "option_maxaddressboxresults") {
				defaultVal = 16;
			} else if (thisAttrId == "option_maxaddressboxresultsshown") {
				defaultVal = 8;
			}
			$(this).val(localStorage[thisAttrId] && localStorage[thisAttrId].length > 0 ? localStorage[thisAttrId] : defaultVal);
			break;
	}
});

// Disable one of the Fallback URL preset buttons if needed
$("#option_fallbacksearchurl").change();

// Set each <select> element with the appropriate stored option
$("table#options select").each(function(){
	$(this).val(localStorage[$(this).attr("id")]);
});

// If user clicks one of the 3 preset search engine buttons, restore the clicked engine by adding it to the database and have it appear on screen
$(".searchenginebutton").live("click", function(){
	if (openDb()) {
		var button = this;
		window.db.transaction(function(tx) {
			tx.executeSql('DELETE FROM opensearches WHERE searchurl = ?', [$(button).attr("searchurl")]);
			tx.executeSql('INSERT INTO opensearches (shortname, iconurl, searchurl, xmlurl, xml, isdefault, method, suggestUrl, keyword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [$(button).attr("shortname"), $("img",button).attr("src").substr(5), $(button).attr("searchurl"), "", "", "0", "get", $(button).attr("suggesturl"), $(button).attr("keyword")]);
			$(button).css("display","none");
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			chrome.runtime.sendMessage(null, "backup search engines");
		});
		getSearchEngines();
		populateOpenSearchMenu();
	}
});

// When user adjusts localStorage.option_memoryIdleReloadMinutes, make it so
$('#option_memoryIdleReloadMinutes').live('change', function(){
	if (!$(this).val().length) {
		localStorage.option_memoryIdleReloadMinutes = 10;
	}
	localStorage.option_memoryIdleReloadMinutes = $(this).val();
	chrome.idle.setDetectionInterval(localStorage.option_memoryIdleReloadMinutes * 60);
});

// When the Page Background options are changed, make it so
$("#option_bgcolor").live("change", function(){
	$("body").css("background-color", $(this).val());
});
$("#option_bgimg").live("change", function(){
	$("body").css("background-image", 'url('+$(this).val()+')');
});
$("#option_bgpos").live("change", function(){
	$("body").css("background-position", $(this).val());
});
$("#option_bgrepeat").live("change", function(){
	$("body").css("background-repeat", $(this).val());
});
$("#option_bgsize").live("change", function(){
	$("body").css("background-size", $(this).val());
});

// When user selects to change the order/visibility of the Address Box and/or Search Box, make it so
$("#option_inputboxdisplayorder").live("change", function() {
	changeInputBoxDisplayOrder();
});

// Apply font change
$("#option_font").live("change", function(){
	var newFont = $(this).val().trim();
	if (newFont) {
		$("#customstyle").append('#thefauxbar *, #options .resultpreview *, #menubar, #results *, #opensearch_results, #opensearch_results *, #contextMenu * { font-family:'+newFont+', Ubuntu, Helvetica Neue, Segoe UI, Arial, sans-serif; }');
	} else {
		var lucida = window.OS == "Mac" ? "Helvetica Neue, " : "";
		$("#customstyle").append('#thefauxbar *, #options .resultpreview *, #menubar, #results *, #opensearch_results, #opensearch_results *, #contextMenu * { font-family:'+lucida+' Ubuntu, Helvetica Neue, Segoe UI, Arial, sans-serif; }');
	}
});

// Apply font size change
$("#option_inputfontsize").live("change", function(){
	changeInputFontSize();
});

// When various CSS options change, apply them
$("#option_titlecolor").live("change", function(){
	insertCustomStyles();
});
$("#option_urlcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_resultbgcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_selectedtitlecolor").live("change", function(){
	insertCustomStyles();
});
$("#option_selectedurlcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_selectedresultbgcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_titlesize").live("change", function(){
	insertCustomStyles();
});
$("#option_urlsize").live("change", function(){
	insertCustomStyles();
});
$("#option_separatorcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_iconcolor").live("change", function(){
	setTimeout(changeTintColors,10);
});
$("#option_inputbgcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_topgradient").live("change", function(){
	changeFauxbarColors();
});
$("#option_bottomgradient").live("change", function(){
	changeFauxbarColors();
});
$("#option_topopacity").live("change", function(){
	changeFauxbarColors();
});
$("#option_bottomopacity").live("change", function(){
	changeFauxbarColors();
});
$("#option_fauxbarfontcolor").live("change", function(){
	insertCustomStyles();
});
$("#option_maxwidth").live("change", function(){
	insertCustomStyles();
});
$("#option_highlightedWordColor_normal").live("change", function(){
	insertCustomStyles();
});
$("#option_highlightedWordColor_highlighted").live("change", function(){
	insertCustomStyles();
});

// When the drop shadow option changes, apply it
$("#option_shadow").live("change", function(){
	$("#customstyle").append(".wrapper { box-shadow:" + (localStorage.option_shadow == 1 ? "0 5px 7px rgba(0,0,0,.25);" : "none;") + " }");
});

// Update favorite/bookmark icon if user changes it
$("#option_favopacity").live("change", function(){
	$("#fauxstar").addClass("filter-tint").attr("src","/img/fauxstar.png").attr("data-pb-tint-opacity", $(this).val() / 100);
	if (processFilters) {
		processFilters();
	}
	$(".favstar").attr("src",$("#fauxstar").attr("src"));
});
$("#option_favcolor").live("change", function(){
	$("#fauxstar").addClass("filter-tint").attr("src","/img/fauxstar.png").attr("data-pb-tint-colour",$(this).val());
	if (processFilters) {
		processFilters();
	}
	$(".favstar").attr("src",$("#fauxstar").attr("src"));
});

// If user is sorting out the Page Background options, and they have an image set, make the Options be semi-transparent when the mouse goes near edge of screen,
// so that user can see how the background looks
$("table#options").bind("mouseleave", function(){
	if ($("#option_section_background").hasClass("section_selected") && $("#option_bgimg").val().length) {
		$(this).stop().animate({opacity:.2}, 250)
	}
});
$("table#options").bind("mouseenter", function(){
	$(this).stop().animate({opacity:1}, 250)
});

// The function that applies all the live changes to the CSS options set above
function insertCustomStyles() {
	var toAppend = "";
	toAppend += ".wrapper { max-width:"+$("#option_maxwidth").val()+"px; }";
	toAppend += ".result_title, .result, .result_title .dotdotdot, #options .result_title, .resultTag { color:"+$("#option_titlecolor").val()+"; font-size:"+$("#option_titlesize").val()+"px; }";
	toAppend += ".resultTag { font-size:"+$("#option_urlsize").val()+"px; }";
	toAppend += ".result_url, .result_url .dotdotdot, #options .result_url, .historyresult, .jsonresult { color:"+$("#option_urlcolor").val()+"; font-size:"+$("#option_urlsize").val()+"px; }";
	toAppend += ".result, .resultpreview, .dotdotdot { background-color:"+$("#option_resultbgcolor").val()+"; }";
	toAppend += ".arrowed .result_title, #options .arrowed .result_title, #opensearch_results .arrowed, .rightClickedResult .result_title, .arrowed .resultTag, .rightClickedResult .resultTag { color:"+$("#option_selectedtitlecolor").val()+"; }";
	toAppend += ".arrowed .result_url, #options .arrowed .result_url, .rightClickedResult .result_url { color:"+$("#option_selectedurlcolor").val()+"; }";
	toAppend += ".arrowed, #options .arrowed .dotdotdot, .rightClickedResult { background-color:"+$("#option_selectedresultbgcolor").val()+"; }";
	toAppend += ".result { border-color:"+$("#option_separatorcolor").val()+"; }";
	toAppend += "#contextMenu .menuHr { background-color:"+$("#option_separatorcolor").val()+"; }";
	toAppend += ".inputwrapper { background-color:"+$("#option_inputbgcolor").val()+"; }";
	toAppend += ".inputwrapper input { color:"+$("#option_fauxbarfontcolor").val()+"; }";
	toAppend += ".highlight { background-color:"+$("#option_highlightedWordColor_normal").val()+"; }";
	toAppend += ".result.arrowed .highlight { background-color:"+$("#option_highlightedWordColor_highlighted").val()+"; }";

	// Menu bar styles
	toAppend += '#menubar { font-size:'+$('#option_urlsize').val()+'px; }';
	toAppend += 'menu item { color:'+$('#option_titlecolor').val()+'; }';
	toAppend += 'menu items > item:not(.faded):hover, menu items > group > item:not(.faded):hover, menu item:not(.faded).hovering { color:'+$('#option_selectedtitlecolor').val()+'; background-color:'+$('#option_selectedresultbgcolor').val()+'; }';
	toAppend += 'menu items item:not(.faded):hover > items, menu item.hovering > items { color:'+$('#option_titlecolor').val()+'; background-color:'+$('#option_resultbgcolor').val()+'; }';
	toAppend += '#menubar hr { border-color:'+$('#option_separatorcolor').val()+'; }';
	toAppend += '#menubar item[faded] { color:'+$('#option_titlecolor').val()+'; }';

	var placeholderRGBA = hexToR(localStorage.option_fauxbarfontcolor)+','+hexToG(localStorage.option_fauxbarfontcolor)+','+hexToB(localStorage.option_fauxbarfontcolor);
	toAppend += "input::-webkit-input-placeholder, .triangle { color:rgba("+placeholderRGBA+",.5); }";
	toAppend += "#addressbox_triangle:hover .triangle, #opensearch_triangle:hover .triangle, #super_triangle:hover .triangle { color:rgba("+placeholderRGBA+",.59); }";
	$("#customstyle").append(toAppend);
}

// Update localStorage with the chosen option when an input element changes
$("table#options input").bind("change", function(){
	switch ($(this).attr("type")) {
		case "checkbox":
			localStorage[$(this).attr("id")] = $(this).prop("checked") ? 1 : 0;
			break;
		case "text":
			localStorage[$(this).attr("id")] = $(this).val();
			break;
		case "number":
			localStorage[$(this).attr("id")] = $(this).val();
			break;
		default:
			break;
	}
});
$("table#options select").bind("change", function(){
	localStorage[$(this).attr("id")] = $(this).val();
});

// Change New Tab overriding text
var fauxbarExtension = '';
$("#enableFauxbar").live("click", function(){
	chrome.management.setEnabled(fauxbarExtension.id, true);
});
if (localStorage.extensionName == "Fauxbar Lite") {
	$('#overrideNewTab input[type="checkbox"]').prop("checked", false);
	$('#overrideNewTabDescription').html('To turn on this option, please install <a href="https://chrome.google.com/webstore/detail/hibkhcnpkakjniplpfblaoikiggkopka" target="blank">Fauxbar</a>.');
	chrome.management.getAll(function(extensions){
		for (var e in extensions) {
			if (extensions[e].name == "Fauxbar" && !extensions[e].enabled) {
				fauxbarExtension = extensions[e];
				$('#overrideNewTabDescription').html('To turn on this option, please <a id="enableFauxbar" title="Click here to enable Fauxbar and disable Fauxbar Lite.">enable Fauxbar</a>.');
			}
		}
	});
}
else if (localStorage.extensionName == "Fauxbar") {
	chrome.management.getAll(function(extensions){
		for (var e in extensions) {
			if (extensions[e].name == "Fauxbar Lite" && !extensions[e].enabled) {
				fauxbarExtension = extensions[e];
				$('#overrideNewTabDescription').html('To turn off this option, please <a id="enableFauxbar" title="Click here to enable Fauxbar Lite and disable Fauxbar.">enable Fauxbar Lite</a>.');
			}
		}
	});
}

// Menu bar options

$('#option_showMenuBar').live('change', function(){
	$('#menubar, .menuOptions').css('display', $(this).prop('checked') == 1 ? '' : 'none');
	$(window).resize();
}).change();

$('#option_menuBarDateFormat option').each(function(){
	$(this).html(date($(this).attr('value')));
});
$('#option_menuBarDateFormat').prevAll('br').first().remove();
$('#option_menuBarDateFormat').live('change', function(){
	$('menuDate').html(date($('#option_menuBarDateFormat').val()));
});
$('#option_showMenuBarDate').live('change', function(){
	if ($(this).prop("checked") == 1) {
		$('.menuBarDate').css('opacity',1);
		$('#option_menuBarDateFormat').prop('disabled',0);
		$('menuDate').css('display','');
	} else {
		$('.menuBarDate').css('opacity',0);
		$('#option_menuBarDateFormat').prop('disabled',1);
		$('menuDate').css('display','none');
	}
}).change();

$('#option_menuBarBackgroundColor').live('change', function(){
	$('#menubar').css('background-color',$(this).val());
}).change();

$('#option_showTabsMenu').live('change', function(){
	$('menu[tabs], label.tabsMenu, td.tabsMenu br, td.tabsMenu .optionstip').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showHistoryMenu').live('change', function(){
	$('menu[history], label.historyMenu, td.historyMenu br, td.historyMenu .optionstip').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showBookmarksMenu').live('change', function(){
	$('menu[bookmarks], label.bookmarksMenu, td.bookmarksMenu br, td.bookmarksMenu .optionstip, div.bookmarksMenu').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showAppsMenu').live('change', function(){
	$('menu[apps], label.appsMenu, td.appsMenu br, td.appsMenu .optionstip, div.appsMenu').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showExtensionsMenu').live('change', function(){
	$('menu[extensions], label.extensionsMenu, td.extensionsMenu br, td.extensionsMenu .optionstip, div.extensionsMenu').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showChromeMenu').live('change', function(){
	$('menu[chrome], label.chromeMenu, td.chromeMenu br, td.chromeMenu .optionstip, div.chromeMenu').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('#option_showFauxbarMenu').live('change', function(){
	$('menu[fauxbar], label.fauxbarMenu, td.fauxbarMenu br, td.fauxbarMenu .optionstip, div.fauxbarMenu').css('display', $(this).prop('checked') == 1 ? 'inline-block' : 'none');
}).change();

$('.recentBookmarks').next('br').remove();
$('#option_bookmarksMenu_showRecentBookmarks').live('change', function(){
	$('#option_bookmarksMenu_numberOfRecentBookmarks').prop('disabled', $(this).prop('checked') == false);
}).change();

$('#option_menuBarFontColor').live('change', function(){
	$('menuName, menuDate').css('color', $(this).val());
}).change();

// Toggle menu items
$('.menuOptions input').live('change', function(){
	refreshAllMenus && refreshAllMenus();
});

// Update the Options Management page with the database stats
loadDatabaseStats();
loadOptionsJS();

// All the Options have been loaded and primed, so let's show the Options page now
$("#options").css("display","block");

$('.fallback.google').live('click', function(){
	$('#option_fallbacksearchurl').val('https://www.google.com/search?q={searchTerms}').change();
});
$('.fallback.yahoo').live('click', function(){
	$('#option_fallbacksearchurl').val('https://search.yahoo.com/search?p={searchTerms}').change();
});
$('.fallback.bing').live('click', function(){
	$('#option_fallbacksearchurl').val('https://www.bing.com/search?q={searchTerms}').change();
});
$('.fallback.duckduckgo').live('click', function(){
	$('#option_fallbacksearchurl').val('https://duckduckgo.com/?q={searchTerms}').change();
});

$('button[addManually]').live('click', addEngineManually);

$('button[editSiteTiles]').live('click', editSiteTiles);

$('button[applyColorsChrome]').live('click', function(){
	applyColors('chrome');
});
$('button[applyColorsFirefox]').live('click', function(){
	applyColors('firefox');
});
$('button[applyColorsFauxbar]').live('click', function(){
	applyColors('fauxbar');
});

$('#resultpreview').live('mouseover', function(){ $(this).addClass('arrowed'); }).live('mouseout', function(){ $(this).removeClass('arrowed'); });

$('button[clearBackgroundImage]').live('click', function(){
	$('#option_bgimg').val('').change();
	return false;
});

$('button[reindex]').live('click', function(){
	if (confirm('Reindex '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s history items and bookmarks?\n\n' +
		'If '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s Address Box results seem stale, or if you\'ve just altered the frecency options, click OK - reindexing will ensure '+
		(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s database is up to date.\n')) {
		tellBgToReindex();
	}
});

$('#button_clearsearchhistory').live('click', function(){
	if (confirm('Clear '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s Search Box queries?')) {
		clearSearchHistory();
	}
});
$('#button_clearinputurls').live('click', function(){
	if (confirm('Clear '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s list of pre-renderable URLs?')) {
		clearUsageHabits();
	}
});
$('#button_rebuild').live('click', function(){
	if (confirm('Rebuild '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+'\'s database?\n\nThis should only be used if '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+' feels like it\'s become completely broken.')) {
		rebuildDatabase();
	}
});

$('button[showBackupInfo]').live('click', showBackupInfo);
$('button[showRestoreInfo]').live('click', showRestoreInfo);
$('button[resetButton]').live('click', function(){
	$('#restoreinfo, #backupinfo').css('display','none');
	if (confirm('Reset your local '+(localStorage.extensionName?localStorage.extensionName:'Fauxbar')+' options back to their default values?\n\nYour history items, bookmarks, search engines, search queries and keywords will remain intact.\n')) {
		resetOptions();
		window.location.reload();
	}
});
$('button#applyrestore').live('click', restoreOptions);

$('a[sortSearchEnginesAlphabetically]').live('click', sortSearchEnginesAlphabetically);

$('#speechtip').prev('br').remove();

$('#option_speech').live('change', function(){
	$('#speechtip').css('display','inline-block');
});

$('#speechtip a').live('click', function(){
	window.location.reload();
	return false;
});

$('#backupinfo').live('click', function(){
	$('#backup').select();
});

$('[enableHelper]').live('click', enableHelper);

$('[addressBoxOptions]').live('mouseup', function(){
	$("#option_menu div").removeClass("section_selected");
	$("#option_section_addressbox").addClass("section_selected");
	$("div.optionbox").css("display","none");
	$("#addressoptions").css("display","block");
	localStorage.option_optionpage = "option_section_addressbox";
});

$('[keyboardShortcutOptions]').live('mouseup', function(){
	$("#option_menu div").removeClass("section_selected");
	$("#option_section_keyboardshortcuts").addClass("section_selected");
	$("div.optionbox").css("display","none");
	$("#shortcutoptions").css("display","block");
	localStorage.option_optionpage = "option_section_keyboardshortcuts";
});

// Remove options that aren't used by Fauxbar Lite
if (localStorage.extensionName == 'Fauxbar Lite') {
	$('tr.defaultShortcuts, span#whenFauxbarOpens, tr.tabOverride').remove();
}

function hideCloudButtons (message) {
	$('div#cloudButtons').css('display','none');
	$('div#cloudStatus').text(message).css('display','block');
}

function showCloudButtons () {
	$('div#cloudButtons').css('display','block');
	$('div#cloudStatus').css('display','none');
}

function tellBackgroundToSaveToCloud () {
	if (localStorage.option_autoSaveToCloud == 1) {
		chrome.runtime.sendMessage(null, 'Save options to cloud');
	}
}

$('button[saveToCloud]').live('click', saveOptionsToCloud);

$('button[retrieveFromCloud]').live('click', function(){
	$("#restoreinfo, #backupinfo").css("display","none");
	if (confirm("Retrieve "+localStorage.extensionName+" options from your Google account?\n\nYour local "+localStorage.extensionName+" options will be overwritten.\n")) {
		hideCloudButtons('Retrieving...');
		setTimeout(function(){
			chrome.storage.sync.get(null, function(items){
				if (chrome.runtime.lastError) {
					alert('Failed to retrieve options from your Google account because:\n\n'+chrome.runtime.lastError.message);
					showCloudButtons();
				} else {
					for (var prop in items) {
						if (prop.substr(0,7) == 'option_' || prop == 'sapps') {
							localStorage[prop] = items[prop];
						}
					}
					
					// Apply site tiles
					if (items['totalSiteTiles']) {
						var siteTiles = [];
						for (var st = 0; st < items['totalSiteTiles']; st++) {
							var tile = items['siteTile_'+st];
							siteTiles.push({url:tile.url, title:tile.title});
						}
						localStorage.siteTiles = JSON.stringify(siteTiles);
					}
					
					var finishRetrieving = function () {
						if (confirm(localStorage.extensionName+' options from your Google account have been retrieved, and your local '+localStorage.extensionName+' options have been overwritten.\n\n' +
								'To complete this operation, '+localStorage.extensionName+' needs to be reloaded.\n\n' +
								'Reload '+localStorage.extensionName+' now? Any open '+localStorage.extensionName+' tabs will be closed.')) {
							localStorage.justRetrievedFromCloud = 1;
							chrome.runtime.reload();
						} else {
							hideCloudButtons('Please disable and re-enable '+localStorage.extensionName+' to finish applying your retrieved options.');
						}
					};
					
					// Load search engines
					if ((items['totalSearchEngines'] || items['totalTags']) && openDb()) {
						window.db.transaction(function(tx){
							if (items['totalSearchEngines']) {
								tx.executeSql('DELETE FROM opensearches');
								for (var x = 0; x < items['totalSearchEngines']; x++) {
									var se = items['searchEngine_'+x];
									if (se) {
										tx.executeSql('INSERT INTO opensearches (shortname, iconurl, searchurl, xmlurl, xml, isdefault, method, suggestUrl, keyword, encoding) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
										[se.shortname, se.iconurl, se.searchurl, se.xmlurl, se.xml, se.isdefault, se.method, se.suggestUrl, se.keyword, se.encoding]);
									}
								}
							}
							if (items['totalTags']) {
								tx.executeSql('DELETE FROM tags');
								tx.executeSql('UPDATE urls SET tag = ?', ['']);
								for (var y = 0; y < items['totalTags']; y++) {
									var tag = items['tag_'+y];
									if (tag) {
										tx.executeSql('INSERT INTO tags (url, tag) VALUES (?, ?)', [tag.url, tag.tag]);
										tx.executeSql('UPDATE urls SET tag = ? WHERE url = ?', [tag.tag, tag.url]);
									}
								}
							}
						}, function(t){
							errorHandler(t, getLineInfo());
						}, finishRetrieving);
					} else {
						alert('No search engines were found.');
						finishRetrieving();
					}
				}
			});
		}, 1000);
	}
});

$('button[clearCloud]').live('click', function(){
	$("#restoreinfo, #backupinfo").css("display","none");
	if (confirm("Clear all "+localStorage.extensionName+" options that are stored on your Google account?\n\nYour local "+localStorage.extensionName+" options will remain intact.\n")) {
		hideCloudButtons('Clearing...');
		setTimeout(function(){
			chrome.storage.sync.clear(function(){
				if (chrome.runtime.lastError) {
					alert('Failed to clear your '+localStorage.extensionName+' from your Google account because:\n\n'+chrome.runtime.lastError.message);
				} else {
					alert('All '+localStorage.extensionName+' options that were stored on your Google account have been cleared.');
				}
				$('div#cloudButtons').css('display','block');
				$('div#cloudStatus').css('display','none');
			});
		}, 1000);
	}
});

$('#restoreSearchEngineIcons button').live('click', function(){
	if (confirm('Are your search engine icons showing blank white page icons instead of their normal ones?\n\nIf so, click OK; '+localStorage.extensionName+
				' will load your search engines in a new window, allowing Chrome to retrieve their favicons again.\n\nThis will take a moment. '+localStorage.extensionName+
				' will automatically reload itself once the operation is complete.')) {
		$(this).text('Restoring...').prop('disabled','disabled');
		setTimeout(function(){
			if (openDb()) {
				window.db.readTransaction(function(tx){
					tx.executeSql('select * from opensearches', [], function(tx, results){
						if (results.rows.length) {
							var urlsToGet = new Array();
							for (var i = 0; i < results.rows.length; i++) {
								var searchEngine = results.rows.item(i);
								if (strstr(searchEngine.iconurl, ':')) {
									urlsToGet.push(searchEngine.iconurl);
								}
							}
							if (urlsToGet.length) {
								var newWindowId;
								var tabsRemoved = 0;
								chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
									if (tab.windowId == newWindowId && changeInfo.status && changeInfo.status == 'complete' && tab.url != chrome.runtime.getURL('/html/restoreSearchEngineIcons.html')) {
										// Wait 2 seconds before removing tab, to ensure Chrome has retrieved the site's favicon
										setTimeout(function(){
											chrome.tabs.remove(tabId);
											tabsRemoved++;
											if (tabsRemoved == urlsToGet.length) {
												chrome.windows.remove(newWindowId, function(){
													setTimeout(function(){
														localStorage.justRestoredSearchEngineIcons = 1;
														chrome.runtime.reload();
													}, 500);
												});
											}
										}, 1000);
									}
								});
								chrome.windows.create({ focused:true, url:chrome.runtime.getURL('/html/restoreSearchEngineIcons.html') }, function(newWindow){
									newWindowId = newWindow.id;
									for (i in urlsToGet) {
										chrome.tabs.create({ windowId:newWindowId, url:urlsToGet[i], active:false });
									}
								});
							}
						}
					}, function(t){
						errorHandler(t, getLineInfo());
					});
				}, function(t){
					errorHandler(t, getLineInfo());
				});
			}
		}, 500);
	}
});

// When user closes the options, sync the options
window.onbeforeunload = function () {
	if (localStorage.option_autoSaveToCloud == 1) {
		chrome.runtime.sendMessage(null, 'Save options to cloud');
	}
};

// 1.5.0 - Adding a fix. There's an issue where, if you open a Fauxbar tab, go Fauxbar > Options, then open another Fauxbar tab, then switch back to the first tab, some of the icons/images in the Options page are hidden.
// I don't know if this is a Chrome bug or what. I assume the new Fauxbar tab is sending a message to the Options tab that's mucking something up, but I can't figure it out.
// So, we'll reload the page to ensure images aren't hidden and resized incorrectly.
chrome.tabs.onActivated.addListener(function(activeInfo){
	chrome.tabs.getCurrent(function(thisTab){
		if (thisTab.id == activeInfo.tabId) {
			chrome.tabs.reload(thisTab.id);
		}
	});
});
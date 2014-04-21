// Monitor which options should be synced
window.optionsToSync = new Array();

// Prevent CSS caching while the options are open
setInterval(function(){
	delete localStorage.customStyles;
}, 2000);

// If and when Fauxbar Memory Helper is un/installed or disabled/enabled, update the text on the Management page
chrome.management.onEnabled.addListener(function(extension) {
	setTimeout(updateHelperStatus, 100);
});
chrome.management.onDisabled.addListener(function(extension) {
	setTimeout(updateHelperStatus, 100);
});
chrome.management.onInstalled.addListener(function(extension) {
	setTimeout(updateHelperStatus, 100);
});
chrome.management.onUninstalled.addListener(function(extension) {
	setTimeout(updateHelperStatus, 100);
});

// Clear the blue "info bar" from the top of the page that wanted the user to open the options, since they have done so now
localStorage.showintro = 0;
$("#optionsintro").remove();

// Hide the site tiles and Chrome apps since the Options page overlaps them anyway
$("#topthumbs, #apps, #sapps").remove();

// Load the Options page HTML
$.get("/html/options.html", function(response){
	var optionsDiv = document.createElement("div");
	optionsDiv.innerHTML = response;
	document.getElementById('body').appendChild(optionsDiv);
	
	var scriptsToLoad = ['jscolor/jscolor.js', 'jquery.maskedinput-1.3.min.js', 'finishLoadingOptions.js', 'finishLoadingOptions-2.js']
	var head = document.getElementById('head');
	for (var s in scriptsToLoad) {
		var newScript = document.createElement("script");
		newScript.setAttribute('src', '/js/'+scriptsToLoad[s]);
		head.appendChild(newScript);
	}
});

// Update the Fauxbar Memory Helper status text on the Options page
function updateHelperStatus() {

	// Link to Memory Helper on the Chrome Web Store
	var link = 'https://chrome.google.com/webstore/detail/domhiadbdhomljcdankobiglghedagkm';

	var status = 'not installed. <a style="color:#06c" target="_blank" href="'+link+'">Click here to install.</a>';
	chrome.management.getAll(function(extensions){
		for (var e in extensions) {
			if (extensions[e].name == "Fauxbar Memory Helper") {
				if (extensions[e].enabled == true) {
					status = 'installed and enabled <span style="color:#090">&#10004;</span>';
				} else {
					status = 'installed but disabled. <span class="fakelink" style="color:#06c;cursor:pointer;text-decoration:underline" enableHelper>Click here to enable.</span>';
				}
			}
		}
		$("#helperstatus").html(status);
	});
}

// Enables Fauxbar Memory Helper, called from the Options page
function enableHelper() {
	chrome.management.getAll(function(extensions){
		for (var e in extensions) {
			if (extensions[e].name == "Fauxbar Memory Helper") {
				chrome.management.setEnabled(extensions[e].id, true);
			}
		}
	});
}

// Fill the Management Options' "Backup..." textarea with the user's localStorage options in JSON format
function showBackupInfo() {
	if (openDb()) {
		window.db.readTransaction(function(tx) {
			tx.executeSql('SELECT * FROM opensearches', [], function(tx, results) {
				tx.executeSql('SELECT * FROM tags', [], function(tx, results2) {
					var backup = {};
					backup.options = {};
					var ls = localStorage;
					var keys = sortKeys(ls).sort();
					for (var key in keys) {
						if (keys[key] != "customStyles") {
							backup.options[keys[key]] = localStorage[keys[key]];
						}
					}

					backup.searchengines = [];
					var len = results.rows.length, i;
					if (len > 0) {
						var i = 0;
						for (i = 0; i < len; i++) {
							backup.searchengines[i] = results.rows.item(i);
						}
					}

					backup.tags = [];
					var len2 = results2.rows.length, i2;
					if (len2 > 0) {
						var i2 = 0;
						for (i2 = 0; i2 < len2; i2++) {
							backup.tags[i2] = results2.rows.item(i2);
						}
					}

					$("#restoreinfo").css("display","none");
					$("#backupinfo").css("display","block");
					var backupText = JSON.stringify(backup);
					backupText = str_replace('","', '",\n"', backupText);
					backupText = str_replace('":{"', '": {\n"', backupText);
					backupText = str_replace('"},"', '"},\n\n"', backupText);
					backupText = str_replace('":[{"', '": [\n{"', backupText);
					backupText = str_replace('"shortname":', '\n\n"shortname":', backupText);
					backupText = str_replace(',"tags": [', ',\n\n"tags": [', backupText);
					backupText = str_replace('"},{"url":"', '"},\n{"url":"', backupText);
					backupText = str_replace('",\n"tag":"', '","tag":"', backupText);
					$("#backup").text(backupText).select();
				});
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}
}

// Show the Management Options' "Restore..." box prompt
function showRestoreInfo() {
	$("#backupinfo").css("display","none");
	$("#restoreinfo").css("display","block");
	$("#restore").focus();
}

// Process the user's input from the "Restore..." box and overwrite the localStorage options and the odd database option with what the user has entered
function restoreOptions() {
	if ($("#restore").val().trim().length == 0) {
		alert("Oops! The import box appears to be empty.\n\nPaste your exported options text into the box, then click Apply again.");
		$("#restore").focus();
		return false;
	}
	$("#applyrestore").prop("disabled",true);
	setTimeout(function(){
		if (window.restoreIsOkay == false) {
			alert("Oops! Fauxbar was unable to process your backup.\n\nPlease ensure the pasted text is a well-formed JSON string.");
			$("#applyrestore").prop("disabled",false);
		}
	}, 500);
	window.restoreIsOkay = false;
	var text = jQuery.parseJSON($("#restore").val());
	if (text && text.options && text.searchengines) {
		window.restoreIsOkay = true;
		for (var o in text.options) {
			if (o != "extensionName") {
				localStorage[o] = text.options[o];
			}
		}
		if (openDb()) {
			window.db.transaction(function(tx){
				tx.executeSql('DELETE FROM opensearches');
				for (var s in text.searchengines) {
					var se = text.searchengines[s];
					tx.executeSql('INSERT INTO opensearches (shortname, iconurl, searchurl, xmlurl, xml, isdefault, method, position, suggestUrl, keyword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
						[se.shortname, se.iconurl, se.searchurl, se.xmlurl, se.xml, se.isdefault, se.method, se.position, se.suggestUrl, se.keyword]);
				}
				for (var t in text.tags) {
					var tag = text.tags[t];
					tx.executeSql('DELETE FROM tags WHERE url = ?', [tag.url]);
					tx.executeSql('UPDATE urls SET tag = ? WHERE url = ?', [tag.tag, tag.url]);
					tx.executeSql('INSERT INTO tags (url, tag) VALUES (?, ?)', [tag.url, tag.tag]);
				}
			}, function(t){
				errorHandler(t, getLineInfo());
			}, function(){
				chrome.runtime.sendMessage(null, "backup keywords");
				chrome.runtime.sendMessage(null, "backup search engines");
				alert("The import was successful.\n\nFauxbar will now restore your options.");
				window.location.reload();
			});
		} else {
			alert("Uh-oh! Fauxbar is unable to open its database to restore your search engines, but your other options will be restored.");
			window.location.reload();
		}
	}
}

// When the user clicks one of the preset color buttons to apply, apply the colors.
function applyColors(browser) {
	switch (browser) {
		case "chrome":
			document.getElementById('option_titlecolor').color.fromString('000000');
			document.getElementById('option_urlcolor').color.fromString('0E860E');
			document.getElementById('option_resultbgcolor').color.fromString('FFFFFF');
			document.getElementById('option_separatorcolor').color.fromString('E3E3E3');
			document.getElementById('option_selectedtitlecolor').color.fromString('000000');
			document.getElementById('option_selectedurlcolor').color.fromString('0E860E');
			document.getElementById('option_selectedresultbgcolor').color.fromString('CBE3FC');
			break;
		case "firefox":
			document.getElementById('option_titlecolor').color.fromString('000000');
			document.getElementById('option_urlcolor').color.fromString('0066CC');
			document.getElementById('option_resultbgcolor').color.fromString('FFFFFF');
			document.getElementById('option_separatorcolor').color.fromString('E3E3E3');
			document.getElementById('option_selectedtitlecolor').color.fromString('FFFFFF');
			document.getElementById('option_selectedurlcolor').color.fromString('FFFFFF');
			document.getElementById('option_selectedresultbgcolor').color.fromString('3399FF');
			break;
		case "fauxbar":
			document.getElementById('option_titlecolor').color.fromString('000000');
			document.getElementById('option_urlcolor').color.fromString('0066CC');
			document.getElementById('option_resultbgcolor').color.fromString('FFFFFF');
			document.getElementById('option_separatorcolor').color.fromString('E3E3E3');
			document.getElementById('option_selectedtitlecolor').color.fromString('000000');
			document.getElementById('option_selectedurlcolor').color.fromString('0066CC');
			document.getElementById('option_selectedresultbgcolor').color.fromString('CBE3FC');
			break;
	}
	$("#option_titlecolor").change();
	$("#option_urlcolor").change();
	$("#option_resultbgcolor").change();
	$("#option_separatorcolor").change();
	$("#option_selectedtitlecolor").change();
	$("#option_selectedurlcolor").change();
	$("#option_selectedresultbgcolor").change();
	$("#option_favopacity").val("0").change();
}

// Clear the saved queries from the Search Box's "history"
function clearSearchHistory() {
	if (openDb()) {
		window.db.transaction(function(tx) {
			tx.executeSql('DELETE FROM searchqueries');
		}, function(t){
			errorHandler(t, getLineInfo());
		});
		$("#button_clearsearchhistory").prop("disabled",true);
		loadDatabaseStats();
	}
}

// Remove any custom ordering of the Search Box's search engines, and sort them alphabetically
function sortSearchEnginesAlphabetically() {
	if (openDb()) {
		window.db.transaction(function(tx){
			tx.executeSql('UPDATE opensearches SET position = 0');
			getSearchEngines();
			populateOpenSearchMenu();
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			chrome.runtime.sendMessage(null, "backup search engines");
		});
	}
}

// Update the list of search engines in the Search Box Options page
function getSearchEngines() {
	if (openDb()){
		window.db.readTransaction(function(tx){
			tx.executeSql('SELECT iconurl, shortname, searchurl, keyword FROM opensearches ORDER BY position DESC, shortname COLLATE NOCASE ASC', [], function(tx,results){
				var openEngines = '';
				var len = results.rows.length, i;
				var iconUrl = "";
				var keyword = "";
				if (len > 0) {
					for (var i = 0; i < len; i++) {
						iconUrl = results.rows.item(i).iconurl;
						if (iconUrl != "google.ico" && iconUrl != "yahoo.ico" && iconUrl != "bing.ico") {
							iconUrl = "chrome://favicon/"+iconUrl;
						} else {
							iconUrl = "/img/"+iconUrl;
						}
						openEngines += '<tr class="opensearch_optionrow">';
						openEngines += '<td class="osicon" style="width:1px; padding:0px 0px 0 5px"><img src="'+iconUrl+'" style="height:16px; width:16px" /></td>';
						openEngines += '<td style="width:25%" class="shortname"><input class="inputoption" type="text" value="'+str_replace('"', '&quot;', results.rows.item(i).shortname)+'" origvalue="'+str_replace('"', '&quot;', results.rows.item(i).shortname)+'" /></td>';
						openEngines += '<td style="width:13%" class="keyword"><input class="inputoption" type="text" value="'+results.rows.item(i).keyword+'" origvalue="'+results.rows.item(i).keyword+'" /></td>';
						openEngines += '<td style="width:75%" class="searchurl"><input class="inputoption" type="text" value="'+results.rows.item(i).searchurl+'" origvalue="'+results.rows.item(i).searchurl+'" style="color:rgba(0,0,0,.52)" spellcheck="false" autocomplete="off" /></td>';
						if (len > 1) {
							openEngines += '<td style="width:1px; padding:0 5px 0 4px" class="opensearchcross" title="Remove &quot;'+str_replace('"','&quot;',results.rows.item(i).shortname)+'&quot; from Fauxbar"><img class="crossicon" src="/img/cross.png" /></td>';
						} else {
							openEngines += '<td></td>';
						}
						openEngines += '</tr>\n';
					}

					$("#opensearchengines").html('<table id="opensearchoptionstable" class="opensearchoptionstable" style="width:100%" cellpadding="2" cellspacing="0" style="border-collapse:collapse">'+
													'<tr style="opacity:.55"><td colspan="2" style="font-size:12px;font-weight:bold; padding-left:4px">Name</td>'+
														'<td style="font-size:12px; font-weight:bold; padding-right:15px; padding-left:4px">Keyword</td><td colspan="2" style="padding-left:4px; text-align:left; font-size:12px; font-weight:bold">URL</td></tr>'+
													openEngines+'</table>');
				}
				var visibleSEButtons = 0;
				$(".searchenginebutton").each(function(){
					if ($('td.searchurl input[value="'+$(this).attr("searchurl")+'"]').length > 0) {
						$(this).css("display","none");
					} else {
						$(this).css("display","inline-block");
						visibleSEButtons++;
					}
				});
				if (visibleSEButtons == 0) {
					$("#restorebig3").css("display","none");
				} else {
					$("#restorebig3").css("display","block");
				}
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}
}

function editSiteTiles() {
	chrome.tabs.getAllInWindow(null, function(tabs){
		for (var t in tabs) {
			if (tabs[t].title == "Fauxbar: Edit Tiles" && (strstr(tabs[t].url, chrome.extension.getURL("/html/fauxbar.html")) || strstr(tabs[t].url, "chrome://newtab"))) {
				chrome.tabs.update(tabs[t].id, {selected:true});
				return;
			}
		}
		chrome.tabs.create({url:chrome.extension.getURL("/html/fauxbar.html#edittiles=1")});
	});
}

function toggleSiteTileOptions(el) {
	if ($(el).val() == "manual") {
		$("#option_topsiterows").css("display","none");
		$("#infiniterows").html("&nbsp;&#8734;").css("display","");
		$("#siteTileCheckboxes").css("display","none");
		$("#siteTileEditInfo").css("display","");
	} else {
		$("#option_topsiterows").css("display","");
		$("#infiniterows").css("display","none");
		$("#siteTileCheckboxes").css("display","");
		$("#siteTileEditInfo").css("display","none");
	}
}

function loadOptionsJS() {
	$("#option_showtopsites").live("change", function(){
		if ($("#option_showtopsites").prop("checked") == true) {
			$("#topSiteOptions").css("display","");
		} else {
			$("#topSiteOptions").css("display","none");
		}
	});
	$("#option_pagetilearrangement").live("change", function(){
		toggleSiteTileOptions(this);
	});

	$("#option_pagetilearrangement").trigger("change");
	$("#option_showtopsites").trigger("change");

	$(".favstar").attr("src", $("#fauxstar").attr("src"));

	var total = localStorage.unreadErrors;
	if (total > 0) {
		var words = total == 1 ? 'There is ~1 error to report.' : 'There are ~'+total+' errors to report.';
		$("#errorLabel").css("font-weight","bold").find("span").html(words);
	} else {
		$("#errorLabel span").html('There are no errors to report.');
	}

	// Error count beside Management menu option
	$("#option_showErrorCount").bind("change", function(){
		if ($(this).prop("checked") == 1 && localStorage.unreadErrors && localStorage.unreadErrors > 0) {
			$("#errorCount").css("display","");
		} else {
			$("#errorCount").css("display","none");
		}
	});
	$("#errorCount").html(total);
	if (!localStorage.option_showErrorCount || localStorage.option_showErrorCount == 0 || !localStorage.unreadErrors || localStorage.unreadErrors == 0) {
		$("#errorCount").css("display","none");
	}

	updateHelperStatus();

	if (localStorage.option_customscoring != 1) {
		$(".customscoring").css("display","none");
	}
	$("#option_customscoring").bind("change", function(){
		if ($(this).prop("checked") == true) {
			$(".customscoring").css("display","table-row");
		} else {
			$(".customscoring").css("display","none");
		}
	});

	chrome.runtime.onMessage.addListener(function(r){
		if (r == "reload options") {
			window.location.reload();
		}
	});

	// Get Fauxbar's Twitter RSS feed, find the first non-reply, and use it as a news message
	// If there's no cache or if cache is more than 24 hours old, fetch news
	// EDIT: Twitter has killed off RSS feeds.
	/*if (!localStorage.latestNewsTime || !localStorage.latestNews || parseFloat(date("U")) - parseFloat(localStorage.latestNewsTime) > 86400) {
		$.ajax({
			type: "GET",
			url: "http://twitter.com/statuses/user_timeline/Fauxbar.rss",
			dataType: "xml",
			success: function(data){
				var newText = '';
				$("title",data).each(function(){
					if (newText.length == 0 && $(this).text().substr(0,9) == "Fauxbar: " && $(this).text().substr(0,10) != "@") {
						var text = $(this).text().substr(9);
						var words = explode(" ", text);
						if (words.length) {
							var newWords = new Array;
							for (var w in words) {
								if (words[w].substr(0,4) == "http") {
									newWords[newWords.length] = '<a href="'+words[w]+'" target="_blank" style="color:#06c">'+words[w]+'</a>';
								} else {
									newWords[newWords.length] = words[w];
								}
							}
							text = implode(" ",newWords);
						}
						newText = text;
					}
					if (newText.length > 0) {
						localStorage.latestNewsTime = date("U");
						localStorage.latestNews = newText;
						$("#latestNews").html(newText);
					} else {
						$("#latestNews").html('Please view <a href="http://twitter.com/Fauxbar" target="_blank" style="color:#06c">Fauxbar\'s Twitter account</a> for the latest news.');
					}
				});
			},
			error: function(){
				$("#latestNews").html('Please view <a href="http://twitter.com/Fauxbar" target="_blank" style="color:#06c">Fauxbar\'s Twitter account</a> for the latest news.');
			}
		});

	// Otherwise just use existing news cache
	} else {
		$("#latestNews").html(localStorage.latestNews);
	}*/
}

// Initialize the reindexing process
function tellBgToReindex() {
	chrome.runtime.sendMessage(null, {action:"reindex"});
	$("button").prop("disabled",true);
	$("body").css("cursor","progress");
	window.location.reload();
}

// Hide the Options container/page
function closeOptions() {
	var hash = window.location.hash;
	hash = str_replace("&options=1","",hash);
	hash = str_replace("options=1&","",hash);
	hash = str_replace("options=1","",hash);
	if (hash == '#') {
		window.location.hash = '';
	} else {
		window.location.hash = hash;
	}
	window.location.reload();
}

// Populate the Options' Management page with database table stats
function loadDatabaseStats() {
	if (openDb()) {
		window.db.readTransaction(function(tx){
			tx.executeSql('SELECT count(distinct url) as historyitems FROM urls WHERE type = 1 AND queuedfordeletion = 0', [], function(tx, results){
				$("#stats_historyitems").html(number_format(results.rows.item(0).historyitems));
				if (results.rows.item(0).historyitems == 1) {
					$("#itemsplural").html('item');
				}
			});
			tx.executeSql('SELECT count(url) as bookmarks FROM urls WHERE type = 2', [], function(tx, results){
				$("#stats_bookmarks").html(number_format(results.rows.item(0).bookmarks));
				if (results.rows.item(0).bookmarks == 1) {
					$("#bookmarksplural").html('bookmark');
				}
			});
			tx.executeSql('SELECT count(*) as searchengines FROM opensearches', [], function(tx, results){
				$("#stats_searchengines").html(number_format(results.rows.item(0).searchengines));
				if (results.rows.item(0).searchengines == 1) {
					$("#enginesplural").html('engine');
				}
			});
			tx.executeSql('SELECT count(distinct query) as searchqueries FROM searchqueries', [], function(tx, results){
				$("#stats_searchqueries").html(number_format(results.rows.item(0).searchqueries));
				if (results.rows.item(0).searchqueries == 1) {
					$("#queriesplural").html('query');
				} else {
					$("#queriesplural").html('queries');
				}
			});

			tx.executeSql('SELECT count(distinct url) as tags FROM tags', [], function(tx, results){
				$("#stats_tags").html(number_format(results.rows.item(0).tags));
				if (results.rows.item(0).tags == 1) {
					$("#tagsplural").html('keyword');
				} else {
					$("#tagsplural").html('keywords');
				}
			});

			// Turning off the thumbnail count because the counting algorithm is usually incorrect; it's merely a "possible" amount of thumbnails, and isn't necessarily true.
			/*tx.executeSql('SELECT count(distinct url) as thumbs FROM thumbs', [], function(tx, results){
				$("#stats_thumbs").html(number_format(results.rows.item(0).thumbs));
				if (results.rows.item(0).thumbs == 1) {
					$("#thumbsplural").html('thumbnail');
				} else {
					$("#thumbsplural").html('thumbnails');
				}
			});*/

			tx.executeSql('SELECT count(distinct url) as urls FROM inputurls', [], function(tx, results){
				$("#stats_inputurls").html(number_format(results.rows.item(0).urls));
				if (results.rows.item(0).urls == 1) {
					$("#inputurlsplural").html('URL');
				} else {
					$("#inputurlsplural").html('URLs');
				}
			});
		}, function(t){
			errorHandler(t, getLineInfo());
		});
	}
}

// Let user add a search engine manually
function addEngineManually() {
	if (openDb()) {
		window.db.transaction(function(tx){
			tx.executeSql('INSERT INTO opensearches (shortname, searchurl, keyword) VALUES (?, ?, ?)', ['Untitled', '', '']);
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			getSearchEngines();
			chrome.runtime.sendMessage(null, "backup search engines");
		});
	}
}

// Save background image from user's computer
$("#bgFile").live("change",function(e){
	var file = e.target.files[0];
	if (!strstr(file.type, "image/")) {
		alert("Error: File is not an image.");
		return;
	}
	var reader = new FileReader();
	reader.onload = (function(theFile) {
		return function(e) {
			window.requestFileSystem(window.PERSISTENT, 50*1024*1024, function(fs){
				fs.root.getFile('/background.image', {create:true}, function(fileEntry) {
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.write(dataURItoBlob(e.target.result));
						$("#option_bgimg").val("").change();
						setTimeout(function(){
							$("#option_bgimg").val('filesystem:'+chrome.extension.getURL("persistent/background.image")).change();
						},1);
						window.location.reload();
					}, fileErrorHandler);
				}, fileErrorHandler);
			}, fileErrorHandler);
		};
	})(file);
	reader.readAsDataURL(file);
});

$(document).ready(function(){
	if (window.OS == "Mac") {
		setTimeout(function(){
			$("h1").css("font-size","18px");
		},100);
	}
});

function clearUsageHabits() {
	if (openDb()) {
		window.db.transaction(function(tx){
			tx.executeSql('DELETE FROM inputurls');
		}, function(t){
			errorHandler(t, getLineInfo());
		}, function(){
			window.location.reload();
		});
	}
}

function rebuildDatabase() {
	$("button").prop("disabled",true);
	$("body").css("cursor","progress");
	localStorage.indexedbefore = 0;
	localStorage.unreadErrors = 0;
	localStorage.issue47 = 1;
	chrome.runtime.sendMessage(null, {action:"reindex"});
	setTimeout(function(){
		chrome.tabs.create({selected:true, url:chrome.extension.getURL("html/fauxbar.html")}, function(){
			chrome.tabs.getCurrent(function(tab){
				chrome.tabs.remove(tab.id);
			});
		});
	}, 1);
}

$('.closeoptions').live('click', closeOptions);

// Hide "Restore missing favicons..." button if user hasn't added any custom search engines
if (openDb()) {
	window.db.readTransaction(function(tx){
		tx.executeSql('select * from opensearches', [], function(tx, results){
			var userHasCustomSearchEngines = false;
			if (results.rows.length) {
				for (var i = 0; i < results.rows.length; i++) {
					var searchEngine = results.rows.item(i);
					if (strstr(searchEngine.iconurl, ':')) {
						userHasCustomSearchEngines = true;
					}
				}
			}
			if (!userHasCustomSearchEngines) {
				$('#restoreSearchEngineIcons').remove();
			}
		});
	});
}
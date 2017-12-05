function saveOptionsToCloud () {
	var clickedButton = window.document.title == localStorage.extensionName +': Options' ? true : false;
	if (!clickedButton && localStorage.option_autoSaveToCloud != 1) {
		return false;
	}
	clickedButton && $("#restoreinfo, #backupinfo").css("display","none");
	!clickedButton && console.log('Options page closed. Beginning process to save local options to your Google account cloud.');
	if (!clickedButton || confirm("Save your local "+localStorage.extensionName+" options to your Google account?\n\nAny existing "+localStorage.extensionName+" options that are stored on your Google account will be overwritten.\n")) {
		clickedButton && hideCloudButtons('Saving...');
		setTimeout(function(){
			var localKeyNames = new Array();
			var keyName;
			for (keyName in localStorage) {
				if ((substr(keyName, 0, 7) == 'option_' || keyName == 'sapps') && !strstr(keyName,'font') && !strstr(keyName,'color') && keyName != 'option_bgimg' && keyName != 'option_autoSaveToCloud') {
					localKeyNames.push(keyName);
				}
			}

			var continueSaving = function(totalSearchEngines, searchEngines, totalTags, tags) {
				chrome.storage.sync.get(localKeyNames, function(items){
					var optionsToPush = {};
					for (var i in localKeyNames) {
						keyName = localKeyNames[i];
						if (!items[keyName] || items[keyName] != localStorage[keyName]) {
							optionsToPush[keyName] = localStorage[keyName];
						}
					}
					
					// Site tiles
					if (localStorage.siteTiles) {
						var siteTiles = JSON.parse(localStorage.siteTiles);
						optionsToPush['totalSiteTiles'] = siteTiles.length;
						for (var st in siteTiles) {
							optionsToPush['siteTile_'+st] = siteTiles[st];
						}
						
					}
					
					// Set a var to say how many search engines there are
					optionsToPush['totalSearchEngines'] = totalSearchEngines;
					// Set each search engine as its own var, eg: searchEngine_0, searchEngine_1, etc
					for (var se in searchEngines) {
						optionsToPush['searchEngine_'+se] = searchEngines[se];
					}
					
					// Set a var to say how many tags there are
					optionsToPush['totalTags'] = totalTags;
					// Set each tag as its own var, eg: tag_0, tag_1, etc
					for (var t in tags) {
						optionsToPush['tag_'+t] = tags[t];
					}
					
					if (Object.keys(optionsToPush).length > 0) {
						chrome.storage.sync.set(optionsToPush, function(){
							if (chrome.runtime.lastError) {
								var errorMessage = 'Failed to save your '+localStorage.extensionName+' options to your Google account because:\n\n' + chrome.runtime.lastError.message;
								clickedButton ? alert(errorMessage) : console.warn(errorMessage);
							} else {
								var successMessage = 'Your local '+localStorage.extensionName+' options have been saved to your Google account.';
								clickedButton ? alert(successMessage) : console.log(successMessage);
							}
							clickedButton && showCloudButtons();
						});
					}
				});
			};
			
			// Get search engines and URL keyword tags
			if (openDb()) {
				window.db.readTransaction(function(tx){
					tx.executeSql('SELECT * FROM opensearches ORDER BY position DESC, shortname ASC', [], function(tx, results){
						var totalSearchEngines = results.rows.length;
						var searchEngines = new Array();
						for (var s = 0; s < results.rows.length; s++) {
							var searchEngine = results.rows.item(s);
							searchEngines.push(searchEngine);
						}
						tx.executeSql('SELECT * FROM tags', [], function(tx, results2){
							var totalTags = results2.rows.length;
							var tags = new Array();
							for (var t = 0; t < results2.rows.length; t++) {
								var tag = results2.rows.item(t);
								tags.push(tag);
							}
							continueSaving(totalSearchEngines, searchEngines, totalTags, tags);
						});
					});
				}, function(t){
					errorHandler(t, getLineInfo());
				});
			} else {
				var dbError = 'Error: Unable to open database to process your search engines.';
				clickedButton ? alert(dbError) : console.warn(dbError);
				clickedButton && showCloudButtons();
			}
		}, clickedButton ? 1000 : 1);
	}
}

// Tell Fauxbar to record the next visit to a URL as a "typed" transition instead of "link"
function addTypedVisitId(url) {
	var len = localStorage.option_fallbacksearchurl ? localStorage.option_fallbacksearchurl.length : 0;
	if (url.substr(0,len) != len) {
		if (document.title == "fauxbar.background") {
			addTypedUrl(url);
		} else {
			chrome.runtime.sendMessage(null, {action:"add typed visit id", url:url});
		}
	}
	return true;
}

// Define characters that RegExp can't handle.
specialChars = "%_^$|&*.()+[\\?><";

// Replace each special character in a string with ¸%%%%%%¸ (varying lengths of %%%%%%%%%)
function replaceSpecialChars(text) {
	var p = "";
	for (var x=0; x<specialChars.length; x++) {
		p = "";
		while (p.length < specialChars.length+5-x) {
			p += '%';
		}
		//console.log("Replacing "+specialChars[x]+" with "+p);
		text = str_replace(specialChars[x], "¸"+p+"¸", text);
	}
	return text;
}

// Revert the ¸%%%%%%%%¸ strings back to their appropriate characters
function replacePercents(text) {
	var p = "";
	for (var x=0; x<specialChars.length; x++) {
		p = "";
		while (p.length < specialChars.length+5-x) {
			p += '%';
		}
		//console.log("Replacing "+specialChars[x]+" with "+p);
		text = str_replace("¸"+p+"¸", specialChars[x], text);
	}
	return text;
}

// http://phpjs.org/functions/strstr:551
function strstr (haystack, needle, bool) {
	var pos = 0;

	haystack += '';
	pos = haystack.indexOf(needle);
	if (pos == -1) {
		return false;
	} else {
		if (bool) {
			return haystack.substr(0, pos);
		} else {
			return haystack.slice(pos);
		}
	}
}

// https://github.com/kvz/phpjs/raw/master/functions/strings/implode.js
function implode (glue, pieces) {
    var i = '',
        retVal = '',
        tGlue = '';
    if (arguments.length === 1) {
        pieces = glue;
        glue = '';
    }
    if (typeof(pieces) === 'object') {
        if (Object.prototype.toString.call(pieces) === '[object Array]') {
            return pieces.join(glue);
        } else {
            for (i in pieces) {
                retVal += tGlue + pieces[i];
                tGlue = glue;
            }
            return retVal;
        }
    } else {
        return pieces;
    }
}

// http://phpjs.org/functions/substr_count:559
function substr_count (haystack, needle, offset, length) {
    var pos = 0,
        cnt = 0;

    haystack += '';
    needle += '';
    if (isNaN(offset)) {
        offset = 0;
    }
    if (isNaN(length)) {
        length = 0;
    }
    offset--;

    while ((offset = haystack.indexOf(needle, offset + 1)) != -1) {
        if (length > 0 && (offset + needle.length) > length) {
            return false;
        } else {
            cnt++;
        }
    }

    return cnt;
}

// Sort longest string length to shortest
function compareStringLengths (a, b) {
  if ( a.length < b.length )
    return 1;
  if ( a.length > b.length )
    return -1;
  return 0; // a and b are the same length
}

// Set localStorage vars with default Fauxbar values.
// Used when first loading Fauxbar, or when user chooses to reset all the values.
function resetOptions() {
	delete localStorage.customStyles;
	
	localStorage.option_enableMemoryManagement = 1;			// Whether to reload Fauxbar or not after a few minutes to free up memory
	localStorage.option_memoryIdleReloadMinutes = 10;		// Number of minutes to check for computer idleness to safely/quietly reload Fauxbar
	
	localStorage.option_stealFocusFromOmnibox = chrome.runtime.getManifest().name == 'Fauxbar' ? 1 : 0;	// Shift focus from Chrome's Omnibox to Fauxbar by creating a new Fauxbar tab and closing the New Tab Page.
	localStorage.option_overrideMethod = 2;					// New Tab button override method: 1 is better for older hardware; 2 is better for newer hardware
	
	localStorage.option_autoSaveToCloud = 0;				// Whether or not to automatically save Fauxbar's local options to the user's Google account when Chrome starts up
	
	localStorage.option_alert = 1; 							// Show a message when there's a database error.
	//localStorage.option_altd = localStorage.extensionName == "Fauxbar Lite" ? 0 : 1; // Use Alt+D functionality.
	localStorage.option_autoAssist = 'autoSelectFirstResult';	// Auto Assist for Address Box. 'autoFillUrl', 'autoSelectFirstResult', or 'dontAssist'
	localStorage.option_bgcolor = "#F0F0F0"; 				// Page background color.
	localStorage.option_bgimg = ""; 						// Page background image.
	localStorage.option_bgpos = "center"; 					// Page background image position.
	localStorage.option_bgrepeat = "no-repeat"; 			// Page background image repeat.
	localStorage.option_bgsize = "auto"; 					// Page background image size.
	localStorage.option_blacklist = ""; 					// Blacklisted sites to exclude from Address Box results
	localStorage.option_bold = 1; 							// Bolden matching words in results.
	localStorage.option_bottomgradient = "#000000"; 		// Fauxbar wrapper bottom gradient color.
	localStorage.option_bottomopacity = "50"; 				// Fauxbar wrapper bottom gradient opacity.
	localStorage.option_consolidateBookmarks = 1; 			// Consolidate bookmarks in Address Box results. Means extra duplicate bookmarks won't be shown.
	//localStorage.option_ctrlk = localStorage.extensionName == "Fauxbar Lite" ? 0 : 1; // Use Ctrl+K functionality.
	//localStorage.option_ctrll = localStorage.extensionName == "Fauxbar Lite" ? 0 : 1; // Use Ctrl+L functionality.
	localStorage.option_customscoring = 0; 					// Use custom frecency scoring.
	localStorage.option_cutoff1 = 4; 						// Frecency bucket cutoff days #1
	localStorage.option_cutoff2 = 14; 						// Frecency bucket cutoff days #2
	localStorage.option_cutoff3 = 31; 						// Frecency bucket cutoff days #3
	localStorage.option_cutoff4 = 90; 						// Frecency bucket cutoff days #4
	localStorage.option_enableSearchContextMenu = 1;		// Right-click context menu for search input boxes on webpages
	localStorage.option_fallbacksearchurl = "https://www.google.com/search?q={searchTerms}";	// Fallback URL for Address Box.
	localStorage.option_fauxbarfontcolor = "#000000";		// Address Box and Search Box input box font color.
	localStorage.option_favcolor = "#FFFFFF";				// Bookmark icon tint color.
	localStorage.option_favopacity = "0";					// Bookmark icon tint opacity.

	localStorage.option_frecency_auto_bookmark = 75;		// Frecency bonus scores
	localStorage.option_frecency_form_submit = 0;
	localStorage.option_frecency_generated = 0;
	localStorage.option_frecency_keyword = 0;
	localStorage.option_frecency_link = 100;
	localStorage.option_frecency_reload = 0;
	localStorage.option_frecency_start_page = 0;
	localStorage.option_frecency_typed = 2000;
	localStorage.option_frecency_unvisitedbookmark = 1;

	localStorage.option_font = window.OS == "Mac" ? "Helvetica Neue" : window.OS == "Linux" ? "Ubuntu" : "Segoe UI";	// Global font name(s).
	localStorage.option_hidehttp = 1;						// Hide "http://" from the beginning of URLs.
	localStorage.option_hidefiletiles = 1;					// Prevent top site tiles from displaying file:/// URLs.
	localStorage.option_hideopentiles = 0;					// Prevent top site tiles from displaying opened URLs. Disabled by default.
	localStorage.option_hidepinnedtiles = 1;				// Prevent top site tiles from displaying pinned URLs.
	localStorage.option_highlightMatchingWords = 0; 		// Highlight matching words in results. Added in 1.6.0.
	localStorage.option_iconcolor = "#3374AB";				// Go Arrow and Magnifying Glass icon color.
	localStorage.option_ignoretitleless = 1;				// Ignore titleless Address Box results.
	localStorage.option_inputbgcolor = "#FFFFFF";			// Address Box and Search Box background color.
	localStorage.option_inputboxdisplayorder = "addressleft_searchright";	// Order of which Box comes first.
	localStorage.option_inputfontsize = window.OS == "Mac" ? 13 : 15;	// Address & Search Box font size (px).
	localStorage.option_leftcellwidthpercentage = 66;		// Width percentage of the Address Box.
	localStorage.option_launchFauxbar = "newTab";			// Open Fauxbar upon clicking browser action icon. newTab, currentTab or newWindow
	localStorage.option_maxaddressboxresults = 10;			// Max Address Box results to display to the user at a time.
	localStorage.option_maxaddressboxresultsshown = 10;		// Max Address Box results to be shown at a time; extra results will have to be scrolled to see.
	localStorage.option_maxretrievedsuggestions = 5;		// Max Search Box saved queries to retrieve. This option name is misleading; suggestions are generally JSON results from the search engine.
	localStorage.option_maxsuggestionsvisible = 15;			// Max queries/suggestions to display before needing to scroll. So with these 2 default options, 10 JSON suggestions will probably be displayed.
	localStorage.option_maxwidth = 1200;					// Max-width for the Fauxbar('s wrapper).
	localStorage.option_omniboxurltruncate = 55;			// Truncate Omnibox+Fauxbar URLs so that the titles can still be seen (hopefully).
	localStorage.option_openfauxbarfocus = "addressbox";	// What to focus when Fauxbar opens. Can be "chrome", "addressbox" or "searchbox"
	localStorage.option_optionpage = "option_section_general";	// Option section/subpage to load when Options are shown.
	localStorage.option_pagetilearrangement = "frecency";	// Page tile arrangement. Possible values: "frecency" "visitcount" "manual" "bookmarkbar"
	localStorage.option_prerender = 1;						// Let Chrome pre-render the first Address Box result if possible.
	localStorage.option_quickdelete = 1;					// Don't enable Quick Delete by default. Don't want the user randomly deleting their history without knowing it.
	localStorage.option_quickdelete_confirm = 1;			// Prompt user to confirm before deleting a history result using Quick Delete.
	localStorage.option_recentvisits = 10;					// Number of recent visits to sample when calculating frecency scores for URLs.
	localStorage.option_recordErrors = 1;					// Write errors to Fauxbar's error log.
	localStorage.option_recordsearchboxqueries = 1;			// Keep a record of the user's Search Box queries, to suggest them to the user later on if they search for something similar.
	localStorage.option_resultbgcolor = "#FFFFFF";			// Background color for results and suggestions/queries.
	localStorage.option_sappsfontsize = 13;					// Font size (px) for main page tiles for top sites and installed apps.
	localStorage.option_selectedresultbgcolor = "#3399FF";	// Background color for .arrowed/highlighted/selected/navigated-to results/queries/suggestions.
	localStorage.option_selectedtitlecolor = "#FFFFFF";		// Title font color for .arrowed/highlighted/selected/navigated-to results/queries/suggestions.
	localStorage.option_selectedurlcolor = "#FFFFFF";		// URL font color for .arrowed/highlighted/selected/navigated-to results/queries/suggestions.
	localStorage.option_separatorcolor = "#E3E3E3";			// Color of the 1px separator line between results.
	localStorage.option_highlightedWordColor_normal = "#F8FFBF";	// Highlighted color for matching words - normal result style. Added in 1.6.0.
	localStorage.option_highlightedWordColor_highlighted = "#79BCFF";	// Highlighted color for matching words - highlighted result style. Added in 1.6.0.
	localStorage.option_shadow = 1;							// Drop shadow for the Fauxbar.
	localStorage.option_showapps = 1;						// Display app tiles.
	localStorage.option_showNewlyInstalledApps = 1;			// Re-enable localStorage.option_showapps when an app is installed.
	localStorage.option_showErrorCount = 0;					// Show an error count on the Options' side menu.
	localStorage.option_showjsonsuggestions = 1;			// Show Search Box suggestions from the selected search engine when user is typing a query.
	localStorage.option_showmatchingfavs = 1;				// Search for and display matching bookmarks from the Address Box.
	localStorage.option_showmatchinghistoryitems = 1;		// Search for and display matching history items from the Address Box.
	localStorage.option_showQueriesViaKeyword = 1;			// Show previous search queries when seaching via keyword in the Address Box.
	localStorage.option_showqueryhistorysuggestions = 1;	// Show Search Box past queries when user is typing a query into the Search Box.
	localStorage.option_showStarInOmnibox = 1;				// Show a star in Omnibox bookmark results if possible.
	localStorage.option_showSuggestionsViaKeyword = 1;		// Show suggestions from search engine when using keywords in the Address Box.
	localStorage.option_showtopsites = 1;					// Show top site tiles.
	localStorage.option_speech = "0";						// Show speech input icons in the Address Box and Search Box.
	localStorage.option_switchToTab = "replace";			// Toggleable switch to tab functionality. Possible values: "replace", "before", "disable"
	localStorage.option_timing = "immediately";				// Only show Address Box results once the user has stopped typing. "immediately" shows results after every keystroke instead.
	localStorage.option_titlecolor = "#000000";				// Result title and query/suggestion font color.
	localStorage.option_titlesize = window.OS == "Mac" ? 12 : 14;	// Result title font size (px).
	localStorage.option_topgradient = "#000000";			// Fauxbar wrapper top gradient background color.
	localStorage.option_topopacity = 12;					// Fauxbar wrapper top gradient background opacity.
	localStorage.option_topsitecols = 4;					// Top site tiles, max columns.
	localStorage.option_topsiterows = 2;					// Top site titles, max rows.
	localStorage.option_underline = "0";					// Underline matching words in Address Box results. Off by default, looks a bit too busy/messy.
	localStorage.option_urlcolor = "#0066CC";				// Result URL font color.
	localStorage.option_urlsize = window.OS == "Mac" ? 11 : window.OS == "Linux" ? 13 : 12;		// Result URL font size (px).
	localStorage.option_useAjaxToDetectIntranetUrls = 1;
	localStorage.option_weight1 = 100;						// Frecency bucket cutoff weight #1
	localStorage.option_weight2 = 70;						// Frecency bucket cutoff weight #2
	localStorage.option_weight3 = 50;						// Frecency bucket cutoff weight #3
	localStorage.option_weight4 = 30;						// Frecency bucket cutoff weight #4
	localStorage.option_weight5 = 10;						// Frecency bucket cutoff weight #5
	resetMenuBarOptions();
}

function resetMenuBarOptions() {
	localStorage.option_showMenuBar = 1;
	localStorage.option_menuBarBackgroundColor = '#F0F0F0';
	localStorage.option_showMenuBarDate = 1;
	localStorage.option_menuBarDateFormat = 'l, F j, Y';
	localStorage.option_showTabsMenu = 1;
	localStorage.option_tabsMenu_showReloadAllTabs = 1;
	localStorage.option_tabsMenu_showNewWindow = 1;
	localStorage.option_tabsMenu_showNewIncognitoWindow = 1;
	localStorage.option_tabsMenu_showSubMenus = 0;
	localStorage.option_showHistoryMenu = 1;
	localStorage.option_historyMenu_showHistoryPageLink = 1;
	localStorage.option_historyMenu_showClearDataLink = 1;
	localStorage.option_historyMenu_numberOfItems = 15;
	localStorage.option_showBookmarksMenu = 1;
	localStorage.option_bookmarksMenu_foldersFirst = 1;
	localStorage.option_bookmarksMenu_showBookmarkManagerLink = 1;
	localStorage.option_bookmarksMenu_showRecentBookmarks = 1;
	localStorage.option_bookmarksMenu_numberOfRecentBookmarks = 15;
	localStorage.option_showAppsMenu = 1;
	localStorage.option_showExtensionsMenu = 1;
	localStorage.option_extensionsMenu_showExtensionsLink = 1;
	localStorage.option_showChromeMenu = 1;
	localStorage.option_chromeMenu_showBookmarks = 1;
	localStorage.option_chromeMenu_showDownloads = 1;
	localStorage.option_chromeMenu_showExtensions = 1;
	localStorage.option_chromeMenu_showHistory = 1;
	localStorage.option_chromeMenu_showOptions = 1;
	localStorage.option_chromeMenu_showExperiments = 1;
	localStorage.option_chromeMenu_showWebStore = 1;
	localStorage.option_showFauxbarMenu = 1;
	localStorage.option_menuBar_useHistory2 = 1;
	localStorage.option_menuBarFontColor = '#000000';
	delete localStorage.hideTabTips;
}

window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
function fileErrorHandler(e) {
  var msg = '';
  var securityErr = 0;
  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'Fauxbar\'s thumbnail file storage limit has been reached.';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'Fauxbar is unable to access one or more thumbnail files.\n\nYou may need to reinstall Fauxbar and/or Chrome.';
      break;
    case FileError.SECURITY_ERR:
      //msg = 'Fauxbar has encountered a security error. Unable to access thumbnail files.';
	  securityErr = 1;
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'Fauxbar is unable to modify its thumbnail files.';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'Fauxbar is unable to access its thumbnail files (invalid state).';
      break;
    default:
      msg = 'Fauxbar has encountered an unknown thumbnail file error.';
      break;
  }
  if (securityErr == 1) {
		chrome.tabs.create({url:chrome.runtime.getURL('/html/notification_fileSecurityErr.html')});
		return;
  }
  if (localStorage.option_alert == 1) {
  	alert(msg);
  }
  console.log(msg);
}


// canvas.toBlob is not implemented in Chrome yet! So we have to build the blob ourselves.
// http://mustachified.com/master.js
// via http://lists.whatwg.org/pipermail/whatwg-whatwg.org/2011-April/031243.html
// via https://bugs.webkit.org/show_bug.cgi?id=51652
// via http://code.google.com/p/chromium/issues/detail?id=67587
function dataURItoBlob(dataURI, callback) {
	// convert base64 to raw binary data held in a string
	// doesn't handle URLEncoded DataURIs
	var byteString = atob(dataURI.split(',')[1]);

	// separate out the mime component
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

	// write the bytes of the string to an ArrayBuffer
	var ab = new ArrayBuffer(byteString.length);
	var ia = new Uint8Array(ab);
	for (var i = 0; i < byteString.length; i++) {
	    ia[i] = byteString.charCodeAt(i);
	}

	// write the ArrayBuffer to a blob, and you're done
	// From http://stackoverflow.com/questions/10412299/whats-the-difference-between-blobbuilder-and-the-new-blob-constructor
	var dataView = new DataView(ab);
	var blob = new Blob([dataView], { type: mimeString });
	return blob;
}


// http://phpjs.org/functions/urlencode:573
function urlencode (str) {
    str = (str + '').toString();

    // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
    // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
    replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}

// http://phpjs.org/functions/substr/
function substr (str, start, len) {
  var i = 0,
    allBMP = true,
    es = 0,
    el = 0,
    se = 0,
    ret = '';
  str += '';
  var end = str.length;

  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ini = this.php_js.ini || {};
  // END REDUNDANT
  switch ((this.php_js.ini['unicode.semantics'] && this.php_js.ini['unicode.semantics'].local_value.toLowerCase())) {
  case 'on':
    // Full-blown Unicode including non-Basic-Multilingual-Plane characters
    // strlen()
    for (i = 0; i < str.length; i++) {
      if (/[\uD800-\uDBFF]/.test(str.charAt(i)) && /[\uDC00-\uDFFF]/.test(str.charAt(i + 1))) {
        allBMP = false;
        break;
      }
    }

    if (!allBMP) {
      if (start < 0) {
        for (i = end - 1, es = (start += end); i >= es; i--) {
          if (/[\uDC00-\uDFFF]/.test(str.charAt(i)) && /[\uD800-\uDBFF]/.test(str.charAt(i - 1))) {
            start--;
            es--;
          }
        }
      } else {
        var surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
        while ((surrogatePairs.exec(str)) != null) {
          var li = surrogatePairs.lastIndex;
          if (li - 2 < start) {
            start++;
          } else {
            break;
          }
        }
      }

      if (start >= end || start < 0) {
        return false;
      }
      if (len < 0) {
        for (i = end - 1, el = (end += len); i >= el; i--) {
          if (/[\uDC00-\uDFFF]/.test(str.charAt(i)) && /[\uD800-\uDBFF]/.test(str.charAt(i - 1))) {
            end--;
            el--;
          }
        }
        if (start > end) {
          return false;
        }
        return str.slice(start, end);
      } else {
        se = start + len;
        for (i = start; i < se; i++) {
          ret += str.charAt(i);
          if (/[\uD800-\uDBFF]/.test(str.charAt(i)) && /[\uDC00-\uDFFF]/.test(str.charAt(i + 1))) {
            se++; // Go one further, since one of the "characters" is part of a surrogate pair
          }
        }
        return ret;
      }
      break;
    }
    // Fall-through
  case 'off':
    // assumes there are no non-BMP characters;
    //    if there may be such characters, then it is best to turn it on (critical in true XHTML/XML)
  default:
    if (start < 0) {
      start += end;
    }
    end = typeof len === 'undefined' ? end : (len < 0 ? len + end : len + start);
    // PHP returns false if start does not fall within the string.
    // PHP returns false if the calculated end comes before the calculated start.
    // PHP returns an empty string if start and end are the same.
    // Otherwise, PHP returns the portion of the string from start to end.
    return start >= str.length || start < 0 || start > end ? !1 : str.slice(start, end);
  }
  return undefined; // Please Netbeans
}
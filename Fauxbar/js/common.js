// This file contains functions that are used by both the main Fauxbar page and its background page. //

// http://stackoverflow.com/questions/4155032/operating-system-detection-by-java-or-javascript/4155078#4155078
window.OS = "Unknown";
if (navigator.appVersion.indexOf("Win")!=-1) window.OS="Windows";
if (navigator.appVersion.indexOf("Mac")!=-1) window.OS="Mac";
if (navigator.appVersion.indexOf("X11")!=-1) window.OS="UNIX";
if (navigator.appVersion.indexOf("Linux")!=-1) window.OS="Linux";

if (window.OS == "Mac") {
	$(document).ready(function(){
		$("head").append('<link href="/css/fauxbar-mac.css" media="screen" rel="stylesheet" type="text/css" />');
	});
}


// Get the value of a parameter from the page's hash.
// Example: If page's hash is "#foo=bar", getHashVar('foo') will return 'bar'
function getHashVar(varName) {
	var hash = window.location.hash.substr(1);
	var pieces = explode("&", hash);
	for (var p in pieces) {
		if (explode("=", pieces[p])[0] == varName) {
			return urldecode(explode("=", pieces[p])[1]);
		}
	}
	return '';
}

// Select a search engine to use in the Search Box. Function name is kind of misleading.
function selectOpenSearchType(el, focusToo) {
	if (document.title == "fauxbar.background") {
		return false;
	}
	if ($(".shortname", el).length == 0) {
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
		$("#opensearch_menufocus").blur();
		return false;
	}
	$("img.opensearch_selectedicon").attr("src", $("img", el).attr("src"));
	var shortNameHtml = $(".shortname", el).html();
	var osi = $("#opensearchinput");
	if ($(".shortname", el).length) {
		osi.attr("placeholder",str_replace('"','&quot;',shortNameHtml));
	}
	window.openSearchShortname = shortNameHtml;
	var newTitle = "Search using "+str_replace('"','&quot',shortNameHtml);
	osi.attr("title",newTitle).attr("realtitle",newTitle);
	if (focusToo == true || window.changeDefaultOpenSearchType == true) {
		window.changeDefaultOpenSearchType = null;
		if (focusToo) {
			osi.focus();
			osi.select();
		}
		if (openDb()) {
			window.db.transaction(function (tx) {
				tx.executeSql('UPDATE opensearches SET isdefault = 0');
				tx.executeSql('UPDATE opensearches SET isdefault = 1 WHERE shortname = ?', [window.openSearchShortname]);
				localStorage.osshortname = window.openSearchShortname;
				localStorage.osiconsrc = $(".vertline2 img", el).attr("src");
			}, function(t){
				errorHandler(t, getLineInfo());
			}, function(){
				chrome.runtime.sendMessage(null, "backup search engines");
			});
		}
	}
	$('#opensearchmenu .menuitem').removeClass("bold");
	$('#opensearchmenu .menuitem[shortname="'+str_replace('"','&quot;',window.openSearchShortname)+'"]').addClass("bold");
}



// Start the indexing process
function reindex() {
	window.doneApplyingFrecencyScores = 0;
	if (openDb(true)) {
		$("#addresswrapper").css("cursor","wait");
		window.indexStatus = "Initiating..."; // Step 1
		chrome.runtime.sendMessage(null, {message:"currentStatus",status:"Initiating...", step:1}); // Step 1
		index();
	}
}


// Below are mostly borrowed functions from other sources.
// If you see your function below, thank you!

////////////////////////////////////////////////////////////////////////////




// http://phpjs.org/functions/explode:396
function explode (delimiter, string, limit) {
	var emptyArray = {
		0: ''
	};

	// third argument is not required
	if (arguments.length < 2 || typeof arguments[0] == 'undefined' || typeof arguments[1] == 'undefined') {
		return null;
	}

	if (delimiter === '' || delimiter === false || delimiter === null) {
		return false;
	}

	if (typeof delimiter == 'function' || typeof delimiter == 'object' || typeof string == 'function' || typeof string == 'object') {
		return emptyArray;
	}

	if (delimiter === true) {
		delimiter = '1';
	}

	if (!limit) {
		return string.toString().split(delimiter.toString());
	} else {
		// support for limit argument
		var splitted = string.toString().split(delimiter.toString());
		var partA = splitted.splice(0, limit - 1);
		var partB = splitted.join(delimiter.toString());
		partA.push(partB);
		return partA;
	}
}


// http://phpjs.org/functions/str_replace:527
function str_replace (search, replace, subject, count) {
	var i = 0,
		j = 0,
		temp = '',
		repl = '',
		sl = 0,
		fl = 0,
		f = [].concat(search),
		r = [].concat(replace),
		s = subject,
		ra = Object.prototype.toString.call(r) === '[object Array]',
		sa = Object.prototype.toString.call(s) === '[object Array]';
	s = [].concat(s);
	if (count) {
		this.window[count] = 0;
	}

	for (i = 0, sl = s.length; i < sl; i++) {
		if (s[i] === '') {
			continue;
		}
		for (j = 0, fl = f.length; j < fl; j++) {
			temp = s[i] + '';
			repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
			s[i] = (temp).split(f[j]).join(repl);
			if (count && s[i] !== temp) {
				this.window[count] += (temp.length - s[i].length) / f[j].length;
			}
		}
	}
	return sa ? s : s[0];
}





// http://phpjs.org/functions/number_format:481
function number_format (number, decimals, dec_point, thousands_sep) {
    // Strip all characters but numerical ones.
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

// http://phpjs.org/functions/urldecode:572
// Modified to catch malformed URI errors
function urldecode (str) {
	try {
		return decodeURIComponent((str + '').replace(/\+/g, '%20'));
	} catch(e) {
		console.log(e);
		if (e.message) {
			return 'Error: '+e.message;
		} else {
			return 'Error: Unable to decode URL';
		}
	}
}

// Initialize/create the database
function openDb(force) {
	// Hopefully prevent issue #47 from happening... don't try to load the database if the page isn't ready
	if (!$(document).ready()) {
		return false;
	}
	if (!window.db) {
		window.db = openDatabase('fauxbar', '1.0', 'Fauxbar data', 100 * 1024 * 1024);
	}

	if (window.db) {
		if (localStorage.indexComplete == 1 || force == true) {
			return true;
		} else {
			return false;
		}
	}
	else {
		alert("Fauxbar error: Unable to create or open Fauxbar's SQLite database.");
		return false;
	}
}

// errorHandler catches errors when SQL statements don't work.
// transaction contains the SQL error code and message
// lineInfo contains contains the line number and filename for where the error came from
function errorHandler(transaction, lineInfo) {
	if (!window.goingToUrl) {
		if (transaction.message) {
			var code = '';
			switch (transaction.code) {
				case 1:
					code = "database";
					break;
				case 2:
					code = "version";
					break;
				case 3:
					code = '"too large"';
					break;
				case 4:
					code = "quota";
					break;
				case 5:
					code = "syntax";
					break;
				case 6:
					code = "constraint";
					break;
				case 7:
					code = "timeout";
					break;
				default: // case 0:
					break;
			}
			var errorMsg = 'SQL '+code+' error: "'+transaction.message+'"';
			logError(errorMsg, lineInfo.file, lineInfo.line);
		} else {
			logError('Generic SQL error (no transaction)', lineInfo.file, lineInfo.line);
		}
	}
}
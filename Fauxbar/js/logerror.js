// Fauxbar error handling

if (!strstr) {
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
}

function date (format, timestamp) {
    var that = this,
        jsdate, f, formatChr = /\\?([a-z])/gi,
        formatChrCb,
        // Keep this here (works, but for code commented-out
        // below for file size reasons)
        //, tal= [],
        _pad = function (n, c) {
            if ((n = n + '').length < c) {
                return new Array((++c) - n.length).join('0') + n;
            }
            return n;
        },
        txt_words = ["Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    formatChrCb = function (t, s) {
        return f[t] ? f[t]() : s;
    };
    f = {
        // Day
        d: function () { // Day of month w/leading 0; 01..31
            return _pad(f.j(), 2);
        },
        D: function () { // Shorthand day name; Mon...Sun
            return f.l().slice(0, 3);
        },
        j: function () { // Day of month; 1..31
            return jsdate.getDate();
        },
        l: function () { // Full day name; Monday...Sunday
            return txt_words[f.w()] + 'day';
        },
        N: function () { // ISO-8601 day of week; 1[Mon]..7[Sun]
            return f.w() || 7;
        },
        S: function () { // Ordinal suffix for day of month; st, nd, rd, th
            var j = f.j();
            return j > 4 || j < 21 ? 'th' : {1: 'st', 2: 'nd', 3: 'rd'}[j % 10] || 'th';
        },
        w: function () { // Day of week; 0[Sun]..6[Sat]
            return jsdate.getDay();
        },
        z: function () { // Day of year; 0..365
            var a = new Date(f.Y(), f.n() - 1, f.j()),
                b = new Date(f.Y(), 0, 1);
            return Math.round((a - b) / 864e5) + 1;
        },

        // Week
        W: function () { // ISO-8601 week number
            var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3),
                b = new Date(a.getFullYear(), 0, 4);
            return _pad(1 + Math.round((a - b) / 864e5 / 7), 2);
        },

        // Month
        F: function () { // Full month name; January...December
            return txt_words[6 + f.n()];
        },
        m: function () { // Month w/leading 0; 01...12
            return _pad(f.n(), 2);
        },
        M: function () { // Shorthand month name; Jan...Dec
            return f.F().slice(0, 3);
        },
        n: function () { // Month; 1...12
            return jsdate.getMonth() + 1;
        },
        t: function () { // Days in month; 28...31
            return (new Date(f.Y(), f.n(), 0)).getDate();
        },

        // Year
        L: function () { // Is leap year?; 0 or 1
            return new Date(f.Y(), 1, 29).getMonth() === 1 | 0;
        },
        o: function () { // ISO-8601 year
            var n = f.n(),
                W = f.W(),
                Y = f.Y();
            return Y + (n === 12 && W < 9 ? -1 : n === 1 && W > 9);
        },
        Y: function () { // Full year; e.g. 1980...2010
            return jsdate.getFullYear();
        },
        y: function () { // Last two digits of year; 00...99
            return (f.Y() + "").slice(-2);
        },

        // Time
        a: function () { // am or pm
            return jsdate.getHours() > 11 ? "pm" : "am";
        },
        A: function () { // AM or PM
            return f.a().toUpperCase();
        },
        B: function () { // Swatch Internet time; 000..999
            var H = jsdate.getUTCHours() * 36e2,
                // Hours
                i = jsdate.getUTCMinutes() * 60,
                // Minutes
                s = jsdate.getUTCSeconds(); // Seconds
            return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
        },
        g: function () { // 12-Hours; 1..12
            return f.G() % 12 || 12;
        },
        G: function () { // 24-Hours; 0..23
            return jsdate.getHours();
        },
        h: function () { // 12-Hours w/leading 0; 01..12
            return _pad(f.g(), 2);
        },
        H: function () { // 24-Hours w/leading 0; 00..23
            return _pad(f.G(), 2);
        },
        i: function () { // Minutes w/leading 0; 00..59
            return _pad(jsdate.getMinutes(), 2);
        },
        s: function () { // Seconds w/leading 0; 00..59
            return _pad(jsdate.getSeconds(), 2);
        },
        u: function () { // Microseconds; 000000-999000
            return _pad(jsdate.getMilliseconds() * 1000, 6);
        },

        // Timezone
        e: function () { // Timezone identifier; e.g. Atlantic/Azores, ...
            // The following works, but requires inclusion of the very large
            // timezone_abbreviations_list() function.
/*              return this.date_default_timezone_get();
*/
            throw 'Not supported (see source code of date() for timezone on how to add support)';
        },
        I: function () { // DST observed?; 0 or 1
            // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
            // If they are not equal, then DST is observed.
            var a = new Date(f.Y(), 0),
                // Jan 1
                c = Date.UTC(f.Y(), 0),
                // Jan 1 UTC
                b = new Date(f.Y(), 6),
                // Jul 1
                d = Date.UTC(f.Y(), 6); // Jul 1 UTC
            return 0 + ((a - c) !== (b - d));
        },
        O: function () { // Difference to GMT in hour format; e.g. +0200
            var a = jsdate.getTimezoneOffset();
            return (a > 0 ? "-" : "+") + _pad(Math.abs(a / 60 * 100), 4);
        },
        P: function () { // Difference to GMT w/colon; e.g. +02:00
            var O = f.O();
            return (O.substr(0, 3) + ":" + O.substr(3, 2));
        },
        T: function () { // Timezone abbreviation; e.g. EST, MDT, ...

            return 'UTC';
        },
        Z: function () { // Timezone offset in seconds (-43200...50400)
            return -jsdate.getTimezoneOffset() * 60;
        },

        // Full Date/Time
        c: function () { // ISO-8601 date.
            return 'Y-m-d\\Th:i:sP'.replace(formatChr, formatChrCb);
        },
        r: function () { // RFC 2822
            return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
        },
        U: function () { // Seconds since UNIX epoch
            return jsdate.getTime() / 1000 | 0;
        }
    };
    this.date = function (format, timestamp) {
        that = this;
        jsdate = ((typeof timestamp === 'undefined') ? new Date() : // Not provided
        (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
        new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
        );
        return format.replace(formatChr, formatChrCb);
    };
    return this.date(format, timestamp);
}

/////////////////////////////////////////////////////////////////////////

// Do a bit of stack tracing and return filename, line # and column #
function getLineInfo() {
	console.log(new Error().stack);
	var lines = new Error().stack.split("\n");
	var line = lines[lines.length-1];
	var file = line.split(chrome.extension.getURL(""), 2);
	file = file[1];
	var bits = file.split(":");
	return {file:bits[0], line:bits[1], col:bits[2]};
}

// Add an error to the database, to keep track of them
function logError(msg, file, line) {
	// "Uncaught Error: INVALID_STATE_ERR: DOM Exception 11" seems to happen during page transitions - not really an error worth bothering about
	if (!window.goingToUrl && msg != "Uncaught Error: INVALID_STATE_ERR: DOM Exception 11" && msg != "Uncaught ReferenceError: returnExtensionsData is not defined"
		&& msg != "Uncaught Error: You do not have permission to use 'management.getAll'. Be sure to declare in your manifest what permissions you need."
		&& msg != 'Uncaught ReferenceError: downloadsList is not defined'
		&& msg != 'Uncaught ReferenceError: downloadUpdated is not defined'
		&& msg != "Uncaught TypeError: Cannot set property 'handlers' of undefined"
		&& msg != "Uncaught TypeError: Cannot call method 'ensureListenerSetup' of undefined") {
		var base = chrome.extension.getURL("");
		if (file.substring(0, base.length) == base) {
			file = file.substring(base.length);
		}
		console.log(msg+'\n'+file+', line '+line);
		if (openDb()) {
			if (!strstr(file, "jquery-1.7.min.js")) {
				if (!localStorage.unreadErrors) {
					localStorage.unreadErrors = 0;
				}
				localStorage.unreadErrors++;
				localStorage.latestError = JSON.stringify({version:localStorage.currentVersion, file:file, line:line, msg:msg, date:date("Y-m-d H:i:s"), count:1, url:window.location.href});

				// Tell all Fauxbar pages to show an error message if user's opted for it
				if (localStorage.option_alert && localStorage.option_alert == 1) {
					$(document).ready(function(){
						if ($("#errorBox").length == 1) {
							$("#errorLine").html(file+", line "+line);
							$("#errorMessage").html(msg);
							$("#errorBox").css("display","inline-block");
						} else {
							chrome.runtime.sendMessage(null, {action:"displayError", errorLine:file+", line "+line, errorMessage:msg});
						}
					});
				}

				window.db.transaction(function(tx){
					var today = date("Y-m-d H:i:s");
					tx.executeSql('SELECT * FROM errors ORDER BY id DESC LIMIT 1', [], function(tx, results){
						var action = 'insert';
						if (results.rows.length == 1) {
							var item = results.rows.item(0);
							if (item.version == localStorage.currentVersion && item.file == file && item.line == line && item.message == msg && item.date == today && item.url == window.location.href) {
								action = 'update';
							}
						}
						if (action == 'insert') {
							tx.executeSql('INSERT INTO errors (version, file, line, message, date, count, url) VALUES (?, ?, ?, ?, ?, ?, ?)', [localStorage.currentVersion, file, line, msg, today, 1, window.location.href]);
						} else {
							tx.executeSql('UPDATE errors SET count = count+1 WHERE id = ?', [item.id]);
						}
					});
				}, function(t){

					// Prevent recursion if the database operation fails
					window.onerror = null;
					setTimeout(function(){
						window.onerror = logError;
					}, 1000);
					console.log('Fauxbar\'s error handler encountered an error:\n"'+t.message+'"');
				}, function(){
					delete localStorage.latestError;
				});
			}
		} else {
			console.log('Unable to open Fauxbar\'s database.');
			webkitNotifications.createNotification(chrome.extension.getURL('/img/fauxbar48sad.png'), 'Unable to open Fauxbar\'s database.', 'Please try disabling and re-enabling Fauxbar to resolve this.\n\nAdditionally, Fauxbar\'s error log and/or background console may contain useful information to report.').show();
		}
	}
}
window.onerror = logError;
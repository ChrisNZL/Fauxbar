// This file manages Fauxbar's menu bar

var clearingMenus = false;

// http://stackoverflow.com/questions/4900436/detect-version-of-chrome-installed
var chromeVersion = 0;
if (strstr(window.navigator.appVersion, 'Chrome')) {
	chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
} else if (strstr(window.navigator.appVersion, 'Chromium')) {
	chromeVersion = parseInt(window.navigator.appVersion.match(/Chromium\/(\d+)\./)[1], 10);
}

function clearMenus() {
	$('#menubar menu').removeClass('selected');
	$('#menubar item.expanded').removeClass('expanded');
	$('#menubar item.hovering').removeClass('hovering');
	removeContextMenu();
}

function formatMenuTitle(title) {
	title = title.trim();
	if (title.length > 70) {
		title = title.substr(0,70)+'...';
	}
	title = str_replace('<', '&lt;', title);
	title = str_replace('>', '&gt;', title);
	if (title.length == 0) {
		title = '&nbsp;';
	}
	return title;
}

function refreshAllMenus() {
	refreshTabMenu();
	refreshHistoryMenu();
	refreshBookmarkMenu();
	refreshAppAndExtensionMenus();
	refreshChromeMenu();
	refreshFauxbarMenu();
	if (localStorage.indexComplete != 1) {
		$('#menubar a[href]').attr('target', '_new');
	}
}

var menusInitialised = false;
function selectMenu(menu) {
	clearMenus();
	if (!clearingMenus) {
		$(menu).addClass('selected');
		if (!menusInitialised) {
			menusInitialised = true;
			refreshAllMenus();
		}
		repositionMenus();
	}
}
$('#menubar').live('mousedown', function(e){
	e.target.id == 'menubar' && clearMenus();
	$('input:focus').blur();
	hideResults();
	removeContextMenu();
	if (e.target.tagName != 'A') {
		return false;
	}
});
$('#menubar > menu').live('mousedown', function(e){
	if (e.button == 0) { // left-click
		if ($('#menubar menu.selected').length && (e.target.tagName == 'MENU' || e.target.tagName == 'MENUNAME')) {
			clearMenus();
			return false;
		}
		(e.target.tagName == 'MENU' || e.target.tagName == 'MENUNAME') && selectMenu(this);
		return true;
	}
});
$('#menubar menu').live('mouseenter', function(e){
	(e.target.nodeName == 'MENU' || e.target.nodeName == 'MENUNAME') && $('#menubar menu.selected').length && selectMenu(this);
});
$('body :not(#menubar)').live('mousedown', function(){
	!$(this).parents('#menubar').length && clearMenus();
});

function refreshChromeMenu() {
	$('menu[chrome]').html('<menuName>Chrome</menuName>' +
		'<items><group>'+
			(localStorage.option_chromeMenu_showBookmarks == 1 ? '<item style="background-image:url(/img/bookmarks_favicon.png)"><a href="chrome://bookmarks">Bookmarks</a></item>' : '') +
			(localStorage.option_chromeMenu_showDownloads == 1 ? '<item style="background-image:url(chrome://favicon/chrome://downloads/)"><a href="chrome://downloads">Downloads</a></item>' : '') +
			(localStorage.option_chromeMenu_showExtensions == 1 ?
				'<item style="background-image:url(chrome://favicon/chrome://plugins/)"><a href="chrome://extensions">Extensions</a></item>' : '') +
			(localStorage.option_chromeMenu_showHistory == 1 ?
				'<item style="background-image:url(chrome://favicon/chrome://history/)"><a href="chrome://history'+(chromeVersion<17&&localStorage.option_menuBar_useHistory2==1?'2':'')+'">History</a></item>' : '') +
			(localStorage.option_chromeMenu_showOptions == 1 ?
				'<item style="background-image:url(/img/wrench.png)">' +
					'<items>' +
						/*'<item><a href="chrome://settings/browser">Basics</a></item>' +
						'<item><a href="chrome://settings/personal">Personal stuff</a></item>' +
						'<item><a href="chrome://settings/advanced">Under the hood</a></item>' +
						'<item><a href="chrome://extensions">Extensions</a></item>' +
						'<hr/>' +*/
						'<item><a href="chrome://settings/clearBrowserData">Clear browsing data...</a></item>' +
						'<item><a href="chrome://settings/importData">Import bookmarks and settings...</a></item>' +
						'<hr/>' +
						'<item><a href="chrome://settings/autofill">Autofill</a></item>' +
						'<item><a href="chrome://settings/cookies">Cookies and other data</a></item>' +
						'<item><a href="chrome://settings/fonts">Fonts and encoding</a></item>' +
						'<item><a href="chrome://settings/languages">Languages</a></item>' +
						'<item><a href="chrome://settings/passwords">Passwords</a></item>' +
						'<item><a href="chrome://settings/searchEngines">Search engines</a></item>' +
						'<item><a href="chrome://settings/syncSetup">Synchronization</a></item>' +
						/*'<hr/>' +
						'<item><a href="chrome://settings/contentExceptions#cookies">Cookies and site data exceptions</a></item>' +
						'<item><a href="chrome://settings/contentExceptions#location">Geolocation exceptions</a></item>' +
						'<item><a href="chrome://settings/contentExceptions#javascript">JavaScript exceptions</a></item>' +
						'<item><a href="chrome://settings/contentExceptions#notifications">Notifications exceptions</a></item>' +
						'<item><a href="chrome://settings/contentExceptions#plugins">Plug-in exceptions</a></item>' +
						'<item><a href="chrome://settings/contentExceptions#popups">Pop-up exceptions</a></item>' +
						'<item><a href="chrome://settings/handlers">Protocol handlers</a></item>' +*/
					'</items>' +
					'<a href="chrome://settings"><arrow>&#x25BC;</arrow>Settings</a>' +
				'</item>' : '') +
			(localStorage.option_chromeMenu_showExperiments == 1 || localStorage.option_chromeMenu_showPlugins == 1 ? '<hr/>' : '') +
			(localStorage.option_chromeMenu_showExperiments == 1 ? '<item style="background-image:url(chrome://favicon/chrome://flags)"><a href="chrome://flags">Experiments</a></item>' : '') +
			(localStorage.option_chromeMenu_showPlugins == 1 ? '<item style="background-image:url(chrome://favicon/chrome://plugins)"><a href="chrome://plugins">Plug-ins</a></item>' : '') +
			(localStorage.option_chromeMenu_showWebStore == 1 ? '<hr/><item style="background-image:url(/img/icon-webstore.png)"><a href="https://chrome.google.com/webstore/">Web Store</a></item>' : '') +
		'</group></items>'
	);
	if ($('menu[chrome] > items > group').html().trim() == '') {
		$('menu[chrome] > items > group').html('<item faded><a>(no menu options selected)</a></item>');
	}
}

function repositionMenus() {
	$('menu.selected > items').each(function(){
		$(this).css('left',$(this).parent('menu').offset().left+'px').css('top',$(this).parent('menu').outerHeight()+'px');
		if ($(this).offset().left + $(this).outerWidth() > $(window).width()) {
			var shunt = $(this).offset().left + $(this).outerWidth() - $(window).width();
			$(this).css('left', $(this).offset().left - shunt + 'px');
		}
	});
	$('menu.selected items').css('opacity',0).css('display','inline-block');

	var maxHeight = $(window).height() - $('#menubar').height() - 50;

	$('menu.selected item > items').each(function(){
		$(this).css('left',$(this).parent().width() + $(this).parent().offset().left - 4 + 'px');
	});
	$('menu.selected items').each(function(){
		// Height
		if ($(this).height() > maxHeight) {
			$(this).addClass('exceededMaxHeight') .css('height',maxHeight+'px') .css('overflow-y','scroll') .css('overflow-x','visible') .css('top',$('#menubar').height()+4+'px');
		}
	});
	$('menu.selected item.expanded > items:not(.exceededMaxHeight)').each(function(){
		$(this).css('top', $(this).parent().offset().top-1+'px');
		if ($(this).offset().top + $(this).outerHeight() > $(window).height()) {
			$(this).css('top', $(window).height() - $(this).outerHeight() - 30 + 'px');
		}
	});
	$('menu.selected > items items').each(function(){
		if ($(this).offset().left + $(this).outerWidth() > $(window).width()) {
			$(this).css('left', $(this).parent().offset().left - $(this).outerWidth() - 2 + 'px');
			if ($(this).offset().left < 0) {
				$(this).css('left', $(window).width() - $(this).outerWidth() + 'px');
			}
		}
	});
	$('menu.selected items').css('display','').css('opacity','');
}
$(window).resize(repositionMenus);

$('menu a[enable]').live('mousedown', function(){
	chrome.management.setEnabled($(this).attr('extensionId'), true);
});
$('menu a[disable]').live('mousedown', function(){
	chrome.management.setEnabled($(this).attr('extensionId'), false);
});
$('menu a[uninstall]').live('mousedown', function(){
	confirm('Uninstall "'+$(this).parents('items').first().next('a').text().substr(1)+'" from Chrome?') && chrome.management.uninstall($(this).attr('extensionId'));
});

var refreshingAppAndExtensionMenus = false; // Prevent duplicated menu items that seem to happen for some reason

function refreshAppAndExtensionMenus() {
	if (!refreshingAppAndExtensionMenus) {
		refreshingAppAndExtensionMenus = true;
		var appHtml = '';
		$('menu[apps]').html('<menuName>Apps</menuName>').append('<items class="displayNone"><group active></group><group inactive></group>' +
				'<item style="background-image:url(/img/icon-webstore.png)"><a getMoreApps href="https://chrome.google.com/webstore/">Get more apps</a></item></items>');
		$('menu[extensions]').html('<menuName>Extensions</menuName>').append('<items class="displayNone"><group active></group><group inactive></group>' +
			'<item style="background-image:url(/img/icon-webstore.png)"><a getMoreExtensions href="https://chrome.google.com/webstore/category/extensions">Get more extensions</a></item>' +
			(
				localStorage.option_extensionsMenu_showExtensionsLink == 1 ?
					'<hr /><item style="background-image:url(chrome://favicon/chrome://plugins)"><a href="chrome://extensions">Open the extensions page</a></item></items>'
					: ''
			)
		);
		repositionMenus();
		chrome.management.getAll(function(extensions){
			var sortedExtensions = [];
			var e = '';
			for (var ex in extensions) {
				e = extensions[ex];
				sortedExtensions[e.name+' 0'+e.id] = e;
			}
			var names = sortKeys(sortedExtensions).sort(sortKeysAlphabetically);
			for (var n in names) {
				e = sortedExtensions[names[n]];
				var smallestIconSize = 0;
				var iconUrl = '';
				for (var i in e.icons) {
					if (e.icons[i].size < smallestIconSize || !smallestIconSize) {
						smallestIconSize = e.icons[i].size;
						iconUrl = e.icons[i].url;
					}
				}
				if (!iconUrl.length) {
					iconUrl = 'chrome://favicon/chrome://extensions';
				}
				var s = 'menu['+(e.isApp ? 'apps' : 'extensions')+'] items group['+(e.enabled ? 'active' : 'inactive')+']';
				var homepageIcon = '';
				if (e.homepageUrl && e.homepageUrl.length) {
					var storeDetail = 'https://chrome.google.com/webstore/detail/';
					homepageIcon = 'chrome://favicon/' + (e.homepageUrl.substr(0,storeDetail.length) == storeDetail ? 'https://chrome.google.com/webstore' : e.homepageUrl);
				}
				$(s).append(
					'<item style="background-image:url('+iconUrl+(e.enabled ? '' : '?grayscale=true')+')">' +
						'<items>' +
							(e.appLaunchUrl && e.appLaunchUrl.length ? '<item><a href="'+e.appLaunchUrl+'">Launch app</a></item><hr/>' : '') +
							(e.homepageUrl && e.homepageUrl.length ? '<item><a href="'+e.homepageUrl+'">Visit website</a></item><hr />' : '') +
							(e.optionsUrl && e.optionsUrl.length && e.enabled ? '<item style="background-image:url(/img/wrench.png)"><a href="'+e.optionsUrl+'">Options</a></item>' : '') +
							(e.enabled ? '<item><a disable extensionId="'+e.id+'">Disable</a></item>' : '<item><a enable extensionId="'+e.id+'">Enable</a></item>') +
							'<item><a uninstall extensionId="'+e.id+'">Uninstall</a></item><hr />' +
							'<item faded><a>Version '+e.version+'</a></item>' +
						'</items>' +
						'<a extensionName '+(e.appLaunchUrl && e.enabled ? 'href="'+e.appLaunchUrl+'"' : '')+'><arrow>&#x25BC;</arrow>'+e.name+'</a>' +
					'</item>'
				);
			}
			$('menu[apps] group[active] item').length && $('menu[apps] group[active]').after('<hr/>');
			$('menu[apps] group[inactive] item').length && $('menu[apps] group[inactive]').after('<hr/>');
			if (!$('menu[apps] group[active] item').length && !$('menu[apps] group[inactive] item').length) {
				$('a[getMoreApps]').html('Get apps from the Chrome Web Store');
			}

			$('menu[extensions] group[active] item').length && $('menu[extensions] group[active]').after('<hr/>');
			$('menu[extensions] group[inactive] item').length && $('menu[extensions] group[inactive]').after('<hr/>');
			if (!$('menu[extensions] group[active] item').length && !$('menu[extensions] group[inactive] item').length) {
				$('a[getMoreExtensions]').html('Get extensions from the Chrome Web Store');
			}

			$('menu[apps] > items group, menu[extensions] > items group').each(function(){
				if (!$(this).children().length) {
					$(this).next('hr').remove();
				}
			});
			repositionMenus();
			refreshingAppAndExtensionMenus = false;
			$('menu items.displayNone').removeClass('displayNone');
		});
	}
}

function refreshTabMenu() {
	chrome.tabs.getAllInWindow(null, function(tabs){
		chrome.tabs.getCurrent(function(currentTab){
			$('menu[tabs]').html('<menuName>Tabs</menuName>').append('<items><group></group></items>');
			var pinned = false;
			for (var ta in tabs) {
				var t = tabs[ta];
				if (t.pinned) {
					pinned = true;
				}
				else if (pinned) {
					pinned = false;
					$('menu[tabs] > items > group').append('<hr />');
				}

				var title = formatMenuTitle(t.title);

				if (t.id == currentTab.id) {
					title += ' <span style="opacity:.5">(current tab)</span>';
				}
				
				var icon = t.url.substr(0,'chrome://newtab'.length) == 'chrome://newtab' && strstr(t.title,'Fauxbar') ? '/img/fauxbar16.png' : 'chrome://favicon/'+t.url;

				var submenu = '';
				if (localStorage.option_tabsMenu_showSubMenus == 1) {
					submenu =
						'<items>' +
							(currentTab.id != t.id ? '<item><a subSwitchToTab>Switch to tab</a></item>' : '') +
							(currentTab.id != t.id && t.url.substr(0,4) == 'http' ? '<item><a reload>Reload</a></item>' : '') +
							'<item><a duplicate>Duplicate</a></item>' +
							'<item><a pin>'+(t.pinned ? 'Unpin tab' : 'Pin tab')+'</a></item>' +
							'<hr/>' +
							'<item><a closeTab>Close tab</a></item>' +
							(tabs.length > 1 ? '<item><a closeOtherTabs>Close other tabs</a></item>' : '') +
						'</items>';
				}

				var switchToTab = t.id != currentTab.id ? 'switchToTab' : '';
				$('menu[tabs] > items > group').append(
					'<item style="background-image:url('+icon+')">'+submenu+'<a '+switchToTab+' tabId="'+t.id+'" url="'+t.url+'" index="'+t.index+'" pinned="'+(t.pinned?'1':'0')+'">' +
						(submenu.length ? '<arrow>&#x25BC;</arrow>' : '')+title+'</a></item>'
				);
			}
			if (tabs.length > 1) {
				var tabTips = '';
				if (!localStorage.hideTabTips) {
					tabTips = '<hr/><item><items>' +
						'<item faded><a>To switch to a tab, left-click its menu item.</a></item>' +
						'<item faded><a>To close a tab, middle-click its menu item.</a></item>' +
						'<hr />' +
						'<item><a dismissTabTips>Dismiss</a></item>' +
					'</items><a><arrow>&#x25BC;</arrow>Quick tips</a></item>';
				}
				$('menu[tabs] > items > group').append(
					tabTips +
					(localStorage.option_tabsMenu_showReloadAllTabs == 1 ? '<hr/><item style="background-image:url(/img/reload.png); background-position:3px 4px"><a reloadAllTabs>Reload all tabs</a></item>' : '')
				);
			}
			$('menu[tabs] > items > group').append(
				(localStorage.option_tabsMenu_showNewWindow == 1 || localStorage.option_tabsMenu_showNewIncognitoWindow == 1 ? '<hr/>' : '') +
				(localStorage.option_tabsMenu_showNewWindow == 1 ? '<item><a newWindow>New window</a></item>' : '') +
				(localStorage.option_tabsMenu_showNewIncognitoWindow == 1 ? '<item><a newIncognitoWindow>New incognito window</a></item>' : '')
			);

			// TODO: Recently closed tabs
			/*var bg = chrome.extension.getBackgroundPage();
			var recentlyClosedTabs = bg.recentTabs_closed;
			if (recentlyClosedTabs && recentlyClosedTabs.length) {
				$('menu[tabs] > items').prepend('<item><items recentlyClosed></items><a><arrow>&#x25BC;</arrow>Recently closed</a></item><hr/>');
				// List of closed tabs
				for (var re in recentlyClosedTabs) {
					var tab = recentlyClosedTabs[re];
					var mainTagDone = false;
					for (var s in tab.states) {
						var state = tab.states[s];
						if (!mainTagDone) {
							mainTagDone = true;
							$('items[recentlyClosed]').append('<item style="background-image:url(chrome://favicon/'+state.url+')"><items></items><a href="'+state.url+'"><arrow>&#x25BC;</arrow>'+formatMenuTitle(state.title)+'</a></item>');
						}
						else {
							$('items[recentlyClosed] > item > items').last().append('<item style="background-image:url(chrome://favicon/'+state.url+')"><a href="'+state.url+'">'+formatMenuTitle(state.title)+'</a></item>');
						}
					}
				}
			}*/
			repositionMenus();
		});
	});
}

// Tab submenu commands
$('a[dismissTabTips]').live('mousedown', function(){
	localStorage.hideTabTips = 1;
	refreshTabMenu();
});

function getTabParent(a) {
	return $(a).parent().parent().next();
}
$('a[subSwitchToTab]').live('mousedown', function(){
	chrome.tabs.update(parseInt(getTabParent(this).attr('tabId')), {selected:true});
	return false;
});
$('a[reload]').live('mousedown', function(){
	chrome.tabs.executeScript(parseInt(getTabParent(this).attr('tabId')), {code:'window.location.reload();'});
	return false;
});
$('a[duplicate]').live('mousedown', function(){
	var t = getTabParent(this);
	chrome.tabs.create({index:parseInt(t.attr('index'))+1, url:t.attr('url'), pinned:t.attr('pinned')=='1'?true:false, selected:false});
	return false;
});
$('a[pin]').live('mousedown', function(){
	var t = getTabParent(this);
	chrome.tabs.update(parseInt(getTabParent(this).attr('tabId')), {pinned:t.attr('pinned') == '1' ? false : true});
	return false;
});
$('a[closeTab]').live('mousedown', function(){
	chrome.tabs.remove(parseInt(getTabParent(this).attr('tabId')));
	return false;
});
$('a[closeOtherTabs]').live('mousedown', function(){
	var goodId = getTabParent(this).attr('tabId');
	chrome.tabs.update(parseInt(goodId), {selected:true});
	chrome.tabs.getAllInWindow(null, function(tabs){
		chrome.tabs.getCurrent(function(currentTab){
			for (var t in tabs) {
				if (!tabs[t].pinned && tabs[t].id != currentTab.id && tabs[t].id != goodId) {
					chrome.tabs.remove(tabs[t].id);
				}
			}
			if (goodId != currentTab.id) {
				window.close();
			}
		});
	});
	return false;
});
$('a[newTab]').live('mousedown', function(){
	chrome.tabs.create({});
	return false;
});
$('a[newWindow]').live('mousedown', function(){
	chrome.windows.create();
	return false;
});
$('a[newIncognitoWindow]').live('mousedown', function(){
	chrome.windows.create({incognito:true});
	clearMenus();
	return false;
});

$('a[reloadAllTabs]').live('mousedown', function(){
	clearingMenus = true;
	clearMenus();
	$('menu[tabs] a[switchToTab]').each(function(){
		chrome.tabs.reload(parseInt($(this).attr('tabId')));
	});
	setTimeout(function(){
		clearingMenus = false;
	}, 1);
});

$('a[reloadFauxbar]').live('mousedown', function(){
	localStorage.reloadUrl = window.document.location.href;
	chrome.runtime.reload();
});

$('a[switchToTab]').live('mousedown', function(e){
	if (e.which == 2) { // middle-mouse
		chrome.tabs.remove(parseInt($(this).attr('tabId')));
	}
	else {
		chrome.tabs.update(parseInt($(this).attr('tabId')), {selected:true});
		if (window.history.length == 1) {
			window.close();
		}
	}
	return false;
});

chrome.tabs.onAttached.addListener(refreshTabMenu);
chrome.tabs.onCreated.addListener(refreshTabMenu);
chrome.tabs.onDetached.addListener(refreshTabMenu);
chrome.tabs.onMoved.addListener(refreshTabMenu);
chrome.tabs.onRemoved.addListener(refreshTabMenu);
chrome.tabs.onUpdated.addListener(refreshTabMenu);
chrome.tabs.onSelectionChanged.addListener(clearMenus);

chrome.management.onDisabled.addListener(refreshAppAndExtensionMenus);
chrome.management.onEnabled.addListener(refreshAppAndExtensionMenus);
chrome.management.onInstalled.addListener(refreshAppAndExtensionMenus);
chrome.management.onUninstalled.addListener(refreshAppAndExtensionMenus);

function refreshHistoryMenu() {
	chrome.history.search({text:'', maxResults:parseInt(localStorage.option_historyMenu_numberOfItems)}, function(historyItems){
		$('menu[history]').html('<menuName>History</menuName><items><group></group></items>');
		if (historyItems.length) {
			for (var h in historyItems) {
				var i = historyItems[h];
				var title = i.title.trim();
				if (!title.length) {
					title = i.url;
				}
				title = formatMenuTitle(title);
				$('menu[history] > items > group').append('<item style="background-image:url(chrome://favicon/'+i.url+')"><a href="'+i.url+'">'+title+'</a></item>');
			}
			if (localStorage.option_historyMenu_showHistoryPageLink == 1 || localStorage.option_historyMenu_showClearDataLink == 1) {
				$('menu[history] group').append('<hr/>');
			}
		}
		if (localStorage.option_historyMenu_showHistoryPageLink == 1) {
			$('menu[history] group').append('<item style="background-image:url(chrome://favicon/chrome://history)"><a href="chrome://history'+(chromeVersion<17&&localStorage.option_menuBar_useHistory2==1?'2':'')+'">View full history</a></item>');
		}
		if (localStorage.option_historyMenu_showClearDataLink == 1) {
			$('menu[history] group').append('<item style="background-image:url(/img/wrench.png)"><a href="chrome://settings/clearBrowserData">Clear browsing data...</a></item>');
		}
		repositionMenus();
	});
}

chrome.history.onVisited.addListener(refreshHistoryMenu);
chrome.history.onVisitRemoved.addListener(refreshHistoryMenu);

function populateChildBookmarks(nodeId) {
	var item = $('item[nodeId="'+nodeId+'"]');
	if (!$(item).attr('populating') && !$(item).children('a').first().attr('href') && !$(item).children('items').length) {
		$(item).attr('populating',1);
		chrome.bookmarks.getChildren(nodeId, function(nodes){
			if (nodeId == '0') {
				bookmarkBarNodeId = nodes[0].id;
				otherBookmarksNodeId = nodes[1].id;
			}
			//if (nodeId > 1) {
			if (nodeId != bookmarkBarNodeId && nodeId != '0') {
				$('menu[bookmarks] item[nodeId="'+nodeId+'"]').prepend('<items><group bookmarkFolders></group><group bookmarkLinks></group></items>');
			}
			if (nodes.length) {
				for (var n in nodes) {
					var b = nodes[n];
					var title = formatMenuTitle(b.title);
					var icon = b.url ? 'chrome://favicon/'+b.url : '/img/folder_closed.png';
					var backgroundSize = b.url ? '' : 'background-size:19px 18px;';
					var arrow = b.url ? '' : '<arrow>&#x25BC;</arrow>';
					var html = '<item nodeId="'+b.id+'" style="background-image:url('+icon+'); '+backgroundSize+'"><a '+(b.url ? 'href="'+b.url+'"' : '')+'>'+arrow+title+'</a></item>';
					if (nodeId == '1') {
						$('menu[bookmarks] group[main]').append(html);
					} else {
						$('menu[bookmarks] item[nodeId="'+nodeId+'"] > items > group[bookmark'+(b.url && localStorage.option_bookmarksMenu_foldersFirst == 1 ?'Links':'Folders')+']').append(html);
					}
				}
			} else {
				$('menu[bookmarks] item[nodeId="'+nodeId+'"] > items').append('<item faded><a>(empty)</a></item>');
			}
			$('menu[bookmarks] > items.displayNone').removeClass('displayNone');
			if (nodeId == bookmarkBarNodeId) {
				var hr = nodes && nodes.length ? '<hr />' : '';
				chrome.bookmarks.get(otherBookmarksNodeId, function(nodes){
					var b = nodes[0];
					$('menu[bookmarks] group[main]').append(hr+'<item nodeId="'+otherBookmarksNodeId+'" style="background-image:url(/img/folder_closed.png); background-size:19px 18px;"><a><arrow>&#x25BC;</arrow>'+b.title+'</a></item>');
				});
			} else {
				repositionMenus();
			}
			if (nodeId == '0') {
				populateChildBookmarks(bookmarkBarNodeId);
			}
		});
	}
}

var bookmarkBarNodeId = -1;
var otherBookmarksNodeId = -1;

function refreshBookmarkMenu() {
	$('menu[bookmarks]').html('<menuName>Bookmarks</menuName><items class="displayNone"><group main></group>' +
		'<group bottom>' +
		(localStorage.option_bookmarksMenu_showBookmarkManagerLink == 1 || localStorage.option_bookmarksMenu_showRecentBookmarks == 1 ? '<hr />' : '') +
		(localStorage.option_bookmarksMenu_showBookmarkManagerLink == 1 ? '<item style="background-image:url(/img/bookmarks_favicon.png)"><a href="chrome://bookmarks">Bookmark manager</a></item>' : '') +
		(localStorage.option_bookmarksMenu_showRecentBookmarks == 1 ? '<item><items recent></items><a><arrow>&#x25BC;</arrow>Recently added</a></item>' : '') +
		'</group></items>');
	if (localStorage.option_bookmarksMenu_showRecentBookmarks == 1) {
		chrome.bookmarks.getRecent(parseInt(localStorage.option_bookmarksMenu_numberOfRecentBookmarks), function(nodes){
			if (nodes && nodes.length) {
				for (var n in nodes) {
					var b = nodes[n];
					if (b.url) {
						$('menu[bookmarks] items[recent]').append('<item style="background-image:url(chrome://favicon/'+b.url+')"><a href="'+b.url+'">'+formatMenuTitle(b.title)+'</a></item>');
					}
				}
			} else {
				$('menu[bookmarks] items[recent]').append('<item faded><a>(none)</a></item>');
			}
			repositionMenus();
		});
	}
	try {
		populateChildBookmarks('0');
	} catch(e) {
		console.log(e);
	}
}

chrome.bookmarks.onChanged.addListener(refreshBookmarkMenu);
chrome.bookmarks.onChildrenReordered.addListener(refreshBookmarkMenu);
chrome.bookmarks.onCreated.addListener(refreshBookmarkMenu);
chrome.bookmarks.onMoved.addListener(refreshBookmarkMenu);
chrome.bookmarks.onRemoved.addListener(refreshBookmarkMenu);

function refreshFauxbarMenu() {
	var options = window.location.href != chrome.extension.getURL("/html/fauxbar.html#options=1") ?
		'<item style="background-image:url(/img/wrench.png)" '+(localStorage.indexComplete==1?'':'faded')+'><a '+(localStorage.indexComplete==1?'options':'')+'>Options</a></item>' : '';
	$('menu[fauxbar]').html('<menuName>'+localStorage.extensionName+'</menuName><items><group>' +
		options +
		'<item faded><a>'+'Version '+localStorage.currentVersion+'</a></item><hr/>' +
		'<item style="background-image:url(/img/fauxbar16.png)"><a href="http://code.google.com/p/fauxbar/">Project overview</a></item>' +
		'<item><a href="http://code.google.com/p/fauxbar/wiki/Changelog">Changelog</a></item>' +
		'<item><a href="http://code.google.com/p/fauxbar/w/list">Documentation</a></item>' +
		'<item><a href="http://code.google.com/p/fauxbar/issues/list">Suggestions and bug reports</a></item>' +
		'<item><a href="http://code.google.com/p/fauxbar/source/browse/trunk#trunk%2FFauxbar">Source code</a></item>' +
		'<hr/>' +
		'<item style="background-image:url(/img/icon-webstore.png)"><items>' +
			'<item><a href="https://chrome.google.com/webstore/detail/hibkhcnpkakjniplpfblaoikiggkopka">Fauxbar</a></item>' +
			'<item><a href="https://chrome.google.com/webstore/detail/bfimmnpbjccjihohjkimphfmmebffbmk">Fauxbar Lite</a></item>' +
			'<item><a href="https://chrome.google.com/webstore/detail/domhiadbdhomljcdankobiglghedagkm">Fauxbar Memory Helper</a></item>' +
			'</items><a href="https://chrome.google.com/webstore/search/intitle%3AFauxbar"><arrow>&#x25BC;</arrow>Chrome Web Store</a></item>' +
		'<item style="background-image:url(/img/icon-facebook.png)"><a href="http://facebook.com/Fauxbar">Facebook</a></item>' +
		//'<item style="background-image:url(/img/icon-gplus.png)"><a href="https://plus.google.com/106763880873922603221">Google+</a></item>' +
		'<item style="background-image:url(/img/icon-twitter.png)"><a href="http://twitter.com/Fauxbar">Twitter</a></item>' +
		//'<item style="background-image:url(/img/icon-reddit.png)"><a href="http://reddit.com/r/Fauxbar">Reddit</a></item>' +
		'<hr/>' +
		'<item style="background-image:url(/img/icon-paypal.png)"><a href="/html/loadpaypal.html">Donate via PayPal</a></item>' +
		//'<hr/>' +
		//'<item><a reloadFauxbar>Reload '+localStorage.extensionName+'</a></item>' +
	'</group></items>');
}

$('a[options]').live('mousedown', function(){
	window.location = chrome.extension.getURL("/html/fauxbar.html#options=1");
	window.location.reload();
	return false;
});

// Current number of milliseconds since the epoch
function getMs() {
	var currentTime = new Date();
	return currentTime.getTime();
}

var timeLastHovered = 0;

$('#menubar item').live('mouseover', function(){
	$('item:hover').last().each(function(){
		var item = this;
		expandMenuItem_Part1(item);
		timeLastHovered = getMs();
		setTimeout(function(){
			if (getMs() >= timeLastHovered + 300) {
				expandMenuItem_Part2(item);
			}
		}, 300);
	});
});

$('#menubar item').live('mousedown', function(){
	$('item:hover').last().each(function(){
		expandMenuItem_Part2(this);
	});
});

function expandMenuItem_Part1(item) {
	$('#menubar item.hovering').last().removeClass('hovering');
	$(item).children('items').length && $(item).addClass('hovering');
	$(item).parents('item').addClass('hovering');
}

function expandMenuItem_Part2(item) {
	$(item).addClass('expanded keepExpanded');
	$(item).parents('item.expanded').addClass('keepExpanded');
	$('item:not(.keepExpanded).expanded').removeClass('expanded');
	$('item.keepExpanded').removeClass('keepExpanded');
	$(item).children('.hovering').removeClass('hovering');
	$(item).attr("nodeId") && populateChildBookmarks($(item).attr("nodeId"));
	repositionMenus();
}

$('*').live('keydown', function(e){
	// Esc
	e.keyCode == 27 && clearMenus();
});
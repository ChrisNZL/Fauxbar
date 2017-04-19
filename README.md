# Fauxbar

![Fauxbar logo](https://raw.githubusercontent.com/ChrisNZL/Fauxbar/master/Fauxbar/img/fauxbar128.png)

_An alternative to Chrome's Omnibox._

### Fauxbar brings Firefox's Awesome Bar functionality to Google Chrome.

**[Download Fauxbar from the Chrome Web Store](https://chrome.google.com/webstore/detail/fauxbar/hibkhcnpkakjniplpfblaoikiggkopka)**

[Fauxbar Lite](https://chrome.google.com/webstore/detail/bfimmnpbjccjihohjkimphfmmebffbmk) is also available. [What's the difference?](https://github.com/ChrisNZL/Fauxbar/wiki/FAQ#whats-the-difference-between-fauxbar-and-fauxbar-lite)

Latest version: 1.7.0 (19 April 2017). [View changelog](https://github.com/ChrisNZL/Fauxbar/wiki/Changelog)

---

### What is Fauxbar?

![Fauxbar screenshot](http://i.imgur.com/ZHOMS.png)

Fauxbar is a free, open-source Google Chrome extension that provides a page that acts like Firefox's Awesome Bar. Fauxbar is developed by Chris McFarland.

Main features include:

- **Address Box:** Precisely find your history items, bookmarks and opened tabs. Results are ranked using Mozilla's frecency algorithm, just like Firefox, with full support for mid-word searching and non-alphanumeric characters. Or, type in a search engine keyword and search the Web.

- **Search Box:** Use your favorite websites' search engines within Fauxbar, with the ability to display query suggestions as you type.

- **Tiles**: Display thumbnails of your top sites and/or installed Chrome apps for quick access.

- **Omnibox Integration:** Use Fauxbar within Chrome's Omnibox by pressing **F**+**Spacebar**.

- **Customizable Options:** Change Fauxbar's look, feel and functionality, with over 60 configurable settings, including page pre-rendering, colors, fonts, shortcut keys, number of results displayed, and more.

View the [full list of features](https://github.com/ChrisNZL/Fauxbar/wiki/Features), take the [screenshot walkthrough](https://github.com/ChrisNZL/Fauxbar/wiki/Screenshot-Walkthrough), learn more about [how Fauxbar works](https://github.com/ChrisNZL/Fauxbar/wiki/Features-(Detailed)), read the [FAQs](https://github.com/ChrisNZL/Fauxbar/wiki/FAQ), or view Fauxbar's [privacy policy](https://github.com/ChrisNZL/Fauxbar/wiki/Privacy-Policy).

---

### Where does Fauxbar fit in?

Firefox's address bar is great, but the browser has stability issues. (well, it did, last I checked in 2011 anyway :smiley:)

Chrome's address bar has issues, but the browser itself is stable.

Enter Fauxbar: a Chrome extension that combines the usability of Firefox's address bar with Chrome's stability.

For a more detailed breakdown, [click here](https://github.com/ChrisNZL/Fauxbar/wiki/FAQ#whats-wrong-with-chromes-omnibox).

---

### Is Fauxbar for me?

- When using Chrome's Omnibox, have you ever typed in part of a page title or address you know you've been to, yet no relevant results appear?

- Do you find the Omnibox's mix of search suggestions, website suggestions, bookmarks and history items (or lack thereof) confusing?

- Do you like having the option to click to use a search engine, instead of typing its name to use it?

- Are you not using Chrome because you can't stand its Omnibox?

If you answered yes, then Fauxbar is for you.

---

### Articles from around the Web

[Replacing Chrome’s Omnibox with Fauxbar](http://www.anotherwindowsblog.com/2011/09/replacing-chrome-omnibox-fauxbar.html):

> I feel like what Adblock Plus did for me in switching over to Firefox is what Fauxbar is doing for me in switching over to Chrome. It’s surprising how a single addon can have such a major impact on a browser.

— _AnotherWindowsBlog_

---

### A word from the author

Fauxbar is/was a hobby project of mine that was mainly developed in 2011. Fauxbar was my solution to dealing with Firefox's stability issues and Chrome's unreliable Omnibox search algorithms. This was back when I used to use Firefox as my main browser, but wanted to transition to Chrome, but hated Chrome's Omnibox.

The main appeal of Fauxbar is that I implemented [Mozilla's frecency algorithm](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Places/Frecency_algorithm) (no that's not a typo) so you can search your history and bookmarks and find exactly what you want every time, reliably, without getting frustrated. Chrome's Ominbox does not use the frecency algorithm and it suffers without it.

It's 2016 now, and although development has largely stopped, I've still been using Fauxbar for about 5 years. Now and then there are bugs that arise when Chrome changes its API, but for the most part, Fauxbar remains my New Tab Page because it works as expected.

[Fauxbar's Google Code archive](https://code.google.com/archive/p/fauxbar/) still exists, but when Google announced they were shutting down Google Code, I moved the source over here to GitHub.

Some people dislike the fact that Fauxbar needs permission to access your full browser history and bookmarks, as it's a valid security concern, but that's the only way Fauxbar can calculate your URL scores. Fauxbar's source code is open and available, and I'm proud to say your data stays on your computer. I wouldn't use my own extension if it was sending my browser history to a third-party. Please view the [Privacy Policy](https://github.com/ChrisNZL/Fauxbar/wiki/Privacy-Policy) for details.

In the background, Fauxbar uses a local [WebSQL](https://en.wikipedia.org/wiki/Web_SQL_Database) database and applies a frecency score to each URL you visit, similar to Firefox (but no, Fauxbar can't access your Firefox data). Fauxbar also has very good mid-word and non-alphanumeric character searching capabilities like Firefox, which is another thing Chrome's Omnibox is not good at.

I used to have a donate button, but if you'd like to express your thanks, please purchase a copy of [my game](https://www.tallowmere.com/) and have some fun instead :smiley:

Thanks for reading. I hope you'll find Fauxbar useful.

– Chris McFarland, 10 April 2016

![Little Fauxbar icon](https://raw.githubusercontent.com/ChrisNZL/Fauxbar/master/Fauxbar/img/fauxbar16.png)

---

Fauxbar is not affiliated with nor endorsed by Mozilla or Google.

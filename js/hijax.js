// digitopia/hijax.js - digitopia.js hijax controller
// status: api stable
// version: 2.0

/*
    Copyright (C) 2013 Michael Rhodes

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import $ from "jquery";
import {
	GetJQueryPlugin
}
from './controller';

function getPath(location) {
	var path = location.pathname + location.search;
	return path;
};

var digitopiaHijax = function (element, options) {
	this.element = $(element);
	var self = this;
	this.currentPath = undefined;

	this.startTime = undefined;

	this.settings = $.extend({
		// process first page (normally only used for paged with content handlers)
		processOriginalPath: false,

		// use location hash scheme
		locationHash: false,

		// use html5 history scheme
		popState: Modernizr.history,

		// don't hijax links like mailto or script
		excludeRegex: new RegExp('^(\/\/|http|javascript|mailto|#)'),

		// array of content handlers
		contentHandlers: [],

		// minimum time to delay merging content (for page transition animation)
		debounce: undefined,

		disableScrollAnimation: false,

		scrollTop: 0,

		nextScrollTop: 0
	}, options || {});

	if (!this.settings.processOriginalPath) {
		this.currentPath = getPath(document.location);
	}

	this.start = function () {
		this.hijaxLinks(this.element);

		if (this.settings.locationHash) {
			$(window).bind('hashchange.hijax', function () {
				self.watchLocationHash();
			});
			this.watchLocationHash();
		}

		if (this.settings.popState) {
			$(window).bind('popstate.hijax', function (event) {
				self.watchPopState(event);
			});
			self.watchPopState();
		}

		$(this.element).on('DigitopiaReloadPage', function (e, href) {
			e.stopPropagation();
			if (e.target === this) {
				self.settings.nextScrollTop = $(window).scrollTop();
				self.hijaxLoad(self.currentPath, self.currentPath);
			}
		});

		$(this.element).on('DigitopiaLoadPage', function (e, href) {
			e.stopPropagation();
			if (e.target === this) {
				if (!self.settings.popState && !self.settings.locationHash) {
					document.location.href = href;
				}
				else {
					if (href && !self.settings.excludeRegex.exec(href)) {
						if (getPath(document.location) !== href) {
							if (self.settings.locationHash) {
								self.setLocationHash('hijax' + href);
							}
							else {
								if (self.settings.popState) {
									history.pushState(null, null, href);
									self.watchPopState();
								}
							}
						}
					}
				}
			}
		});
	};

	this.stop = function () {
		$('a').unbind('click.hijax');
		if (this.settings.popState) {
			$(window).unbind('popstate.hijax');
		}
		$(this.element).off('DigitopiaLoadPage');
		$(this.element).off('DigitopiaReloadPage');
	};

	this.hijaxLoad = function (path, oldPath) {
		var done = false;

		if (typeof (rewriteUrls) !== 'undefined') {
			path = rewriteUrls(path);
		}

		$('.DigitopiaInstance').trigger('DigitopiaWillLoadNewPage', [oldPath,
			path
		]);

		if (this.settings.debounce) {
			this.startTime = new Date();
		}

		if (this.settings.contentHandlers.length) {
			for (var i = 0; i < this.settings.contentHandlers.length; i++) {
				var match = path.match(this.settings.contentHandlers[i].path);
				if (match) {
					var content = undefined;

					if (this.settings.contentHandlers[i].content) {
						content = this.settings.contentHandlers[i].content;
					}
					else {
						content = this.settings.contentHandlers[i].contentHandler(match);
					}

					self.mergeContent(content);
					done = true;
				}
			}
		}

		if (!done) {
			$.ajax({
				type: "GET",
				url: path,
				dataType: 'html',
				headers: {
					'x-digitopia-hijax': 'true'
				},
				success: function (html, status, xhr) {
					if (xhr.getResponseHeader('x-digitopia-hijax-location')) {
						var location = xhr.getResponseHeader('x-digitopia-hijax-location');
						if (self.settings.popState) {
							history.pushState(null, null, location);
							self.watchPopState();
						}
						else {
							document.location.href = location;
						}
					}
					else {
						self.mergeContent(html);
					}
				},
				error: function (xhr, status, error) {
					alert('could not load page. (' + error + ')');
				}
			});
		}
	};

	this.mergeContent = function (html) {
		$('.DigitopiaInstance').trigger('DigitopiaDidLoadNewPageContent');
		var elapsed = 0;
		if (this.settings.debounce) {
			var now = new Date();
			elapsed = now.getTime() - this.startTime.getTime();
		}

		if (this.settings.debounce && elapsed < self.settings.debounce) {
			setTimeout(function (instance, content) {
				return function () {
					instance.mergeContent(content); // reveal the new page
				}
			}(this, html), self.settings.debounce - elapsed);
		}
		else {
			var top = this.settings.nextScrollTop;

			if (this.settings.disableScrollAnimation) {
				$("html, body").scrollTop(top);
			}
			else {
				$("html, body").animate({
					scrollTop: top
				}, '250');
			}

			var containers = $("[data-hijax]");

			containers.each(function () {
				var id = this.id;
				$('#' + id).find('.DigitopiaInstance').trigger('DigitopiaStop');
				$('#' + id).trigger('DigitopiaStop');
			});

			var doc = html.split(/(<body[^>]*>|<\/body>)/ig);
			var docBody = $(doc[2]);

			containers.each(function () {
				var id = this.id;
				var chunk = '';
				chunk = $(docBody).find('#' + id);
				if (!chunk || chunk.length === 0) {
					chunk = $(docBody).filter('#' + id);
				}
				$('#' + id).empty().append(chunk.children());
			});

			var title = $(html).filter("title").text();
			document.title = title;

			this.contentMerged();
		}
	};

	this.contentMerged = function () {

		var containers = $("[data-hijax]");

		containers.each(function () {
			var id = this.id;
			self.hijaxLinks('#' + id);
		});

		$('.DigitopiaInstance').trigger('DigitopiaInstantiate');

		$('.DigitopiaInstance').trigger('DigitopiaDidLoadNewPage', getPath(
			document.location));
	};

	this.hijaxLinks = function (node) {
		$(node).find('a').unbind('click.hijax');
		$(node).find('a').each(function () {
			var href = $(this).attr('href');
			if (href && !$(this).attr('target') && !$(this).data('no-hijax') && !
				self.settings.excludeRegex.exec(href)) {
				$(this).bind('click.hijax', function (e) {
					e.preventDefault();
					$('body').trigger('DigitopiaLoadPage', href);
				});
			}
		});
	}

	this.watchPopState = function (event) {
		if (this.currentPath || (this.currentPath === undefined && this.settings.processOriginalPath)) {
			if (getPath(document.location) != this.currentPath) {
				var oldPath = this.currentPath;
				this.currentPath = getPath(document.location);
				this.settings.nextScrollTop = this.settings.scrollTop;
				this.hijaxLoad(this.currentPath, oldPath);
			}
		}
	}

	this.setLocationHash = function (params) {
		location.hash = params;
	}

	this.watchLocationHash = function () {
		if (location.hash != this.currentPath) {
			var pathArray = location.hash.split('/');
			if (pathArray[0] == '#hijax') {
				var oldPath = this.currentPath;
				pathArray.splice(0, 1);
				this.currentPath = '/' + pathArray.join('/');
				this.settings.nextScrollTop = this.settings.scrollTop;
				this.hijaxLoad(this.currentPath, oldPath);
			}
		}
	}
};

$.fn.digitopiaHijax = GetJQueryPlugin('digitopiaHijax', digitopiaHijax);


export {
	digitopiaHijax
}

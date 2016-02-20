// digitopia/controller.js - digitopia.js responsive element controller
// status: api stable
// version: 0.9

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


// this should be attached to the document body as follows
//
// options = {
//		'geometry': { 'enabled' : true, 'widths': [], 'classes': [], cookieDomain: '' }
// }
// $(body).digitopiaController(options);

var gResponsiveUniqueId = 0;
var gResponsiveFlashEvents = true;

function GetJQueryPlugin(classname,obj) {
	return function(options){
		return this.each(function(){
			var element = $(this);
			if(!this.id) { // self assigned id (so $.off works when events are namespaced by id)
				this.id = 'DiGiToPiA-' + ++gResponsiveUniqueId;
			}
			if(!element.data(classname)) {
				element.addClass('DigitopiaInstance');
				try {
					var instance =  new obj(this,options);
					element.data(classname, instance);
					if(instance.stop) {
						element.on('DigitopiaStop', function(event) {
							event.stopPropagation();
							if(event.target === this) {
								instance.stop();
							}
						});
					}
					if(instance.start) {
						window.setTimeout(function() {
							instance.start();
							$('.DigitopiaInstance').trigger('DigitopiaNewInstance',element);
						},0);
					}
				}
				catch(err) {
					alert('Could not initialize element:' + this.id + ' jsclass:' + classname + ' error:' + err);
				}
			}
		})
	}
}

(function($){
	var digitopiaController = function(element, options){
		this.element = $(element);

		var self = this;

		this.config = $.extend({
			geometry: undefined,
			lazy: undefined,
			ajax: undefined,
			hijax: undefined,
			parallax: undefined,
			coverResize: false
		}, options || {});

		this.start = function() {
			if(this.config.geometry && this.config.geometry.enabled) {
				this.config.geometry.controller = this;
				setTimeout(function() {
					self.element.digitopiaGeometry(self.config.geometry);
				},0);
			}
			if(this.config.hijax && this.config.hijax.enabled) {
				this.config.hijax.controller = this;
				setTimeout(function() {
					self.element.digitopiaHijax(self.config.hijax);
				},0);
			}

			this.element.lazyInstantiate();

			this.instantiateElements();

			$(window).unload(function() {
				$('.DigitopiaInstance').trigger('DigitopiaStart');
			});

			self.scrollTimer = undefined;

			$(window).scroll(function() {
				if(!self.scrollTimer) {
					self.scrollTimer = setTimeout(function() {
						self.scrollTimer = undefined;
						$('.DigitopiaInstance').trigger('DigitopiaDidScroll');
					}, 250);
				}
			});

			self.resizeTimer = undefined;

			$('body').outerWidth($(window).innerWidth());

			$(window).resize(function() {
				if(self.resizeTimer) {
			    	clearTimeout(self.resizeTimer);
			    }
			    else {
			    	//console.log('start ',$(window).width());
    				if(self.config.coverResize) {
			    		$('body').css({'opacity': 0.3});
			    	}
			    }
    			self.resizeTimer = setTimeout(function() {
			    	//console.log('end ',$(window).width());
			    	$('body').outerWidth($(window).innerWidth());
    				self.resizeTimer = undefined;
    				$('.DigitopiaInstance').trigger('DigitopiaDidResize');
    				if(self.config.coverResize) {
    					$('body').css({'opacity': 1});
    				}
    			}, 100);
			});

		};

		this.stop = function() {
		};

		this.instantiateElements = function() {
			var didInstantiate = false;
			$("*[data-jsclass]").each( function () {
				var classnames = $(this).data('jsclass').split(',');
				for(var i = 0; i < classnames.length; i++) {
					var classname = classnames[i];
					if(!$(this).data(classname)) {
						didInstantiate = true;
						var handler = null;
						try {
							if($(this)[classname]) { // try jquery plugin method first
								$(this)[classname]();
							}
							else {
								// instantiate the object
								handler = new window[classname](this);

								// cache a reference in the element
								$(this).data(classname,handler);

								// start the object's behavior
								if(handler.start) {
									var element = this;
									window.setTimeout(function() {
										handler.start();
										$('.DigitopiaInstance').trigger('DigitopiaNewInstance',element);
									},0);
								}

							}
						}
						catch(err) {
							alert('Could not initialize element:' + this.id + ' jsclass:' + classname + ' error:' + err);
						}
					}
				}
			});

			if(didInstantiate) {
				$('.DigitopiaInstance').trigger('DigitopiaReady',this);
			}

		};

		// listent for events

		this.element.on('DigitopiaInstantiate', function(e) {
			e.stopPropagation();
			if(e.target === this) {
				self.instantiateElements();
				self.element.data('lazyInstantiate').watchScroll();
			}
		});

	};

	$.fn.digitopiaController = GetJQueryPlugin('digitopiaController',digitopiaController);
})(jQuery);

(function($) {
	function lazyInstantiate (elem,options) {
		this.element = $(elem);
		var self = this;

		this.start = function() {
			this.element.on('DigitopiaDidScroll',function(event) {
				if(event.target === this) {
					self.watchScroll();
				}
			});
			self.watchScroll();
		};

		this.stop = function() {
			this.element.off('DigitopiaDidScroll');
		};

		this.watchScroll = function() {
			$('.lazy-instantiate:in-viewport').each(function(){
				if($(this).is(':visible')) {
					$(this).removeClass('lazy-instantiate');
					var classes = $(this).data('lazy-jsclass').split(/,\s*/);
					for(var i = 0; i < classes.length; i++) {
						$(this)[classes[i]]();
					};
				}
			});
		};
	}
	$.fn.lazyInstantiate = GetJQueryPlugin('lazyInstantiate',lazyInstantiate);
})(jQuery);
;// digitopia/geometry.js - digitopia.js geometry controller
// status: api stable
// version: 0.9

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

(function($){
	var digitopiaGeometry = function(element, options){
		this.element = $(element);

		var self = this;
		
		this.orientation = undefined;
		this.scale = undefined;
		this.touch = Modernizr.touch;
		this.disabled = false;
		this.forceScale = undefined;
		
		this.config = $.extend({
			breakpoints: [
				{ className: 'tiny', maxWidth: 480 },
				{ className: 'small', maxWidth: 768 },
				{ className: 'medium', maxWidth: 980 },
				{ className: 'large', maxWidth: 1024 },
				{ className: 'huge', maxWidth: undefined },
			],
			cookieDomain: undefined
		}, options || {});

		this.widths = [];
		this.classes = [];
		
		this.disableResponsive = function(scale) {
			$('body').addClass('disable-responsive');
			this.disabled = true;
			this.forceScale = scale;
			this.detectGeometry();
		}

		this.enableResponsive = function() {
			$('body').removeClass('disable-responsive');
			this.disabled = false;
			this.forceScale = '';
			this.detectGeometry();
		}

		this.start = function() {
			var css = '.show-hide{display:none;}\n';
			this.widths.push(0);
			for(var i = 0; i < this.config.breakpoints.length; i++) {
				if(this.config.breakpoints[i].maxWidth) {
					this.widths.push(this.config.breakpoints[i].maxWidth);
				}
				this.classes.push(this.config.breakpoints[i].className);
				
				css+='.' + this.config.breakpoints[i].className + ' .hidden-' + this.config.breakpoints[i].className + '{display:none;}\n';
				css+='.not-' + this.config.breakpoints[i].className + ' .hidden-not-' + this.config.breakpoints[i].className + '{display:none;}\n';
				css+='.' + this.config.breakpoints[i].className + ' .shown-' + this.config.breakpoints[i].className + '{display:block;}\n';
				css+='.not-' + this.config.breakpoints[i].className + ' .shown-not-' + this.config.breakpoints[i].className + '{display:block;}\n';
			}

			var style = document.createElement('style');
			style.type = 'text/css';
			style.innerHTML = css;
			document.getElementsByTagName('head')[0].appendChild(style);
			
			this.element.on('DigitopiaDidResize.digitopiaGeometry',function(e) {
				e.stopPropagation();
				if(e.target === this) {
					self.detectGeometry();
				}	
			});
	
			this.detectGeometry();
			
			this.element.on('DigitopiaNewInstance.digitopiaGeometry', function(e,element) {
				e.stopPropagation();
				if(e.target === this) {
					$(element).trigger('DigitopiaScaleChanged',self.scale);
					$(element).trigger('DigitopiaOrientationChanged',self.orientation);
				}
			});
		};
		
		this.stop = function() {
			this.element.off('DigitopiaDidResize.digitopiaGeometry');
			this.element.off('DigitopiaNewInstance.digitopiaGeometry');
		};

		this.detectGeometry =function(){
			var newOrientation = this.orientation;
			var newScale = this.classes[this.widths.length - 1];

			if($(window).width() < $(window).height()) {
				newOrientation = 'portrait';
			}
			else {
				newOrientation = 'landscape';
			}
		
			if(this.disabled) {
				newScale = this.forceScale;
			}
			else {
				var ww = $(window).width();
				for(var i = 0; i < this.widths.length - 1; i++) {
					if(ww >= this.widths[i] && ww < this.widths[i + 1]) {
						newScale = this.classes[i];
						break;
					}
				}
			}
	
			var changed = 0;
			
			if(newScale !== this.scale) {
				++changed;
				for(var i = 0; i < this.classes.length; i++) {
					if(this.classes[i] !== newScale) {
						$('body').addClass('not-' + this.classes[i]);
						$('body').removeClass(this.classes[i]);
						$('body').removeClass('shown-' + this.classes[i]);
						$('body').removeClass('hidden-' + this.classes[i]);
					}
					else {
						$('body').removeClass('not-' + this.classes[i]);
					}
				}
				$('body').addClass(newScale);
				$('body').addClass('shown-' + newScale);
				$('body').addClass('hidden-' + newScale);

				$('.DigitopiaInstance').trigger("DigitopiaScaleChanged",newScale);
			}

			this.scale = newScale;
	
			if(newOrientation !== this.orientation) {
				++changed;
				$('body').removeClass('portrait').removeClass('landscape');
				$('body').addClass(newOrientation);
				$('.DigitopiaInstance').trigger("DigitopiaOrientationChanged",newOrientation);
			}
	
			this.orientation = newOrientation;
		
			if(changed) { 
				this.setHints();
			}
		}

		this.setHints = function() {
			var classes = '';
			
			if(this.orientation) {
				if(classes) { classes += ' '; }
				classes += this.orientation;
			}
	
			if(this.scale) {
				if(classes) { classes += ' '; }
				classes += this.scale;
			}
	
			if(classes !== this.getCookie('responsive')) {
				this.setCookie('responsive',classes);
			}
		};
		
		this.getCookie = function(key) {
			return $.cookie(key);
		};

		this.setCookie = function(key,value,expires) {
			var options = {
				path:'/',
				domain: this.config.cookieDomain,
				expires: expires
			};
			$.cookie(key, value, options);
		};

		this.deleteCookie = function(key) {
			this.setCookie(key, null);
		};

	};

	$.fn.digitopiaGeometry = GetJQueryPlugin('digitopiaGeometry',digitopiaGeometry);

})(jQuery);;// digitopia/viewport.js - digitopia.js element position controller
// status: api stable
// version: 0.9

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

(function($){
	var digitopiaViewport = function(element, options){
		this.element = $(element);
		
		var self = this;

		this.element.css({'position':'relative','overflow':'hidden'});
		
		this.settings = $.extend({
			crop: $(this.element).data('crop') ? $(this.element).data('crop') : false,
			align: $(this.element).data('align') ? $(this.element).data('align') : 'center',
			blowup: $(this.element).data('blowup') ? $(this.element).data('blowup') : false,
			trimHeight: $(this.element).data('trim-height') ? $(this.element).data('trim-height') : false,
			listenTo: $(this.element).data('listen-to') ? $(this.element).data('listen-to') : false,
		}, options || {});
		
		this.align = this.settings.align? this.settings.align.split(',') : [];
		this.height = this.element.height();
		
		this.elements = $(this.element).children();
		for(var i = 0; i < this.elements.length; i++) {
			$(this.elements[i]).css({
				'position':'absolute',
				'max-width':'10000px'
			});
			$(this.elements[i]).data('inViewPort',self);
		}

		this.start = function() {
			this.element.on('DigitopiaScaleChanged.' + this.id, function(e, scale) {
				e.stopPropagation();
				if(e.target === this) {
					if(!self.settings.trimHeight) {
						self.height = self.element.height();
					}
					self.fitElements(scale);
				}
			});
			
			if(!this.settings.listenTo) {
				this.element.on('DigitopiaDidResize.' + this.id, function (e) {
					e.stopPropagation();
					if(e.target === this) {
						self.fitElements();
					}
				});
			}
			else {
				var id = $(this.settings.listenTo).attr('id');
				this.element.on('digitopiaContainerDidResize' + id + '.' + this.id, function (e) {
					e.stopPropagation();
					if(e.target === this) {
						self.fitElements();
					}
				});
			}
			
			this.fitElements();
		};
		
		this.stop = function() {
			this.element.off('DigitopiaScaleChanged.' + this.id); 
			if(!this.settings.listenTo) {
				this.element.off('DigitopiaDidResize.' + this.id); 
			}
			else {
				var id = $(this.settings.listenTo).attr('id');
				this.element.off('digitopiaContainerDidResize' + id + '.' + this.id); 
			}
		};
		
		this.getAlign = function(find) {
			this.align = this.settings.align? this.settings.align.split(',') : [];
			for(var i=0; i < this.align.length; i++) {
				if(this.align[i] === find) {
					return true;
				}
			}
			return false;
		}
	
		this.fitElements = function () {	
			var maxHeight = 0;
			for(var i = 0; i < this.elements.length; i++) {	
				var child = this.elements[i];

				var width = $(child).data('width');
				var height = $(child).data('height');
	
				var boxwidth = $(this.element).width();
					
				var boxheight = $(this.element).height();

				if(this.settings.trimHeight) { boxheight = this.height }
	
				//console.log('width,height,boxwidth,boxheight',width,height,boxwidth,boxheight);
				
				var imgRatio = (height / width); 
				var boxRatio = (boxheight / boxwidth); 
				var mult = 1;
	
				if(this.settings.crop) {
					if(imgRatio<boxRatio) { 
						mult = boxheight / height;
					} 
					else { 
						mult = boxwidth / width;
					}
				}
				else {
					if(imgRatio>boxRatio) { 
						mult = boxheight / height;
					} 
					else { 
						mult = boxwidth / width;
					}
				}
	
				width = width * mult;
				height = height * mult;
			
				if(!this.settings.blowup) {
					if($(child).data('width') && width > $(child).data('width')) {
						width = $(child).data('width');
					}
			
					if($(child).data('height') && height > $(child).data('height')) {
						height = $(child).data('height');
					}
				}

				if(this.settings.trimHeight) {
					$(this.element).height(height);
					boxheight = height;
				}
			
				var top = (boxheight - height) / 2;
				var left = (boxwidth - width) / 2;
			
				if(this.getAlign('top')) {
					top = 0;
				}
	
				if(this.getAlign('bottom')) {
					top = boxheight - height;
				}
			
				if(this.getAlign('left')) {
					left = 0;
				}
	
				if(this.getAlign('right')) {
					left = boxwidth - width;
				}

				var css = {
					'top':top + 'px',
					'left':left + 'px',
					'width':width + 'px',
					'height':height + 'px'
				}
				
														
				$(child).css(css);
			}
		};
	};

	$.fn.digitopiaViewport = GetJQueryPlugin('digitopiaViewport',digitopiaViewport);

})(jQuery);;// digitopia/lazy.js - digitopia.js lazy image controller
// status: api stable
// version: 0.9

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

(function($){
	var digitopiaLazy = function(element, options){
		this.element = $(element);

		var self = this;

		this.id = element.id;
		this.scale = undefined;

		this.loaded = false;

		this.settings = $.extend({
			enabledScales: $(this.element).data('enabled-scales') ? $(this.element).data('enabled-scales').split(',') : []
		}, options || {});

		this.start = function() {
			if(!this.loaded) {
				$(this.element).addClass('responsive-loading');

				this.element.on('DigitopiaScaleChanged.' + this.id, function(e, scale) {
					e.stopPropagation();
					if(e.target === this) {
						self.scale = scale;
						self.lazy();
					}
				});

				this.element.on('DigitopiaDidScroll.' + this.id, function(e, scale) {
					e.stopPropagation();
					if(e.target === this) {
						self.lazy();
					}
				});

				this.element.on('DigitopiaDidResize.' + this.id, function(e, scale) {
					e.stopPropagation();
					if(e.target === this) {
						self.lazy();
					}
				});

				this.element.on('DigitopiaLazy.' + this.id, function(e,force) {
					e.stopPropagation();
					if(e.target === this) {
						self.lazy(force);
					}
				});

				this.lazy();
			}
		};

		this.stop = function() {
			this.element.off('DigitopiaScaleChanged.' + this.id);
			this.element.off('DigitopiaDidScroll.' + this.id);
			this.element.off('DigitopiaDidResize.' + this.id);
			this.element.off('DigitopiaLazy.' + this.id);
		};

		this.want = function() {
			if(this.settings.enabledScales.length) {
				if(this.scale) {
					return this.settings.enabledScales.indexOf(this.scale) !== -1;
				}
				else {
					return false;
				}
			}
			else {
				return true;
			}
		};

		this.lazy = function (force) {
			if(!this.loaded && this.want()) {
				if(force || ($.inviewport(this.element, { threshold:0 } ) && $(this.element).is(':visible'))) {
					this.element.removeClass('responsive-loading');
					this.element.trigger('digitopiaLazyLoad');
					this.loaded = true;
				}
			}
		};

		// listent for events

	};

	var digitopiaLazyImg = function(element, options){
		this.element = $(element);

		var self = this;

		this.id = element.id;

		this.loaded = false;

		this.scale = undefined;
		this.loadedScale = undefined;

		this.start = function() {
			//$(this.element).attr('src','/digitopia/images/lazy.gif');

			this.element.on('digitopiaLazyLoad.'+ this.id, function(e,force) {
				e.stopPropagation();
				self.lazy(force);
			});

			this.element.on('DigitopiaScaleChanged.' + this.id, function(e,scale) {
				e.stopPropagation();
				self.scale = scale;
				if(self.loaded && self.loadedScale != self.scale) {
					self.load();
				}
			});

			setTimeout(function() {
				self.element.digitopiaLazy();
			},0);
		};

		this.stop = function() {
			this.element.off('digitopiaLazyLoad.' + this.id);
			this.element.off('DigitopiaScaleChanged.' + this.id);
		};

		this.lazy = function (force) {
			if(!this.loaded) {
				this.load();
			}
		};

		this.load = function(force) {
			var src = $(this.element).data('lazy-src');

			if($(this.element).data('lazy-'+this.scale+'-src')) {
				src = $(this.element).data('lazy-'+this.scale+'-src');
			}

			if($(self.element).attr('src') != src) {
				//flash('lazy ' + self.id + ' loading: ' + src + ' for scale ' + self.scale);
				$(self.element).css({opacity:0}).attr('src', src).load(function() {
					if (this.complete && typeof this.naturalWidth !== "undefined" && this.naturalWidth !== 0) {
						$(this).data('width', this.naturalWidth);
						$(this).data('height', this.naturalHeight);
						if($(this).data('inViewPort')) {
							$(this).data('inViewPort').fitElements();
						}
						
						// next tick - do this after fitElements renders
						var instance = this;
						setTimeout(function () {
							$(instance).animate({
								opacity: 1
							}, 250);
						}, 0);
					}
				}).error(function() {
					//$(this).attr('src','/digitopia/images/lazy.gif');
				});
			}
			this.loaded = true;
			this.loadedScale = this.scale;
		};
	};

	$.fn.digitopiaLazy = GetJQueryPlugin('digitopiaLazy',digitopiaLazy);
	$.fn.digitopiaLazyImg = GetJQueryPlugin('digitopiaLazyImg',digitopiaLazyImg);

})(jQuery);
;// digitopia/container.js - digitopia.js container controller
// status: api stable
// version: 0.9

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

(function($){
	var digitopiaContainer = function(elem, options){
		this.element = $(elem);
		var self = this;
		this.id = elem.id;

		this.settings = $.extend({
			scales: this.element.data('scales') ? this.element.data('scales').split(/\s*,\s*/) : [],
			followElementWidth: this.element.data('follow-element-width'),
			followElementHeight: this.element.data('follow-element-height'),
			fillContainer: this.element.data('fill-container')
		}, options || {});

		this.active = undefined;

		if(!this.settings.scales.length) {
			this.active = true;
		}

		this.origHeight = elem.style.height;
		this.origWidth = elem.style.width;

		this.lastHeight = undefined;
		this.lastWidth = undefined;

		this.listenTo = {};

		this.following = 0;

		if(this.settings.followElementWidth) {
			++this.following;
			this.listenTo[$(this.settings.followElementWidth).attr('id')] = true;
		}
		if(this.settings.followElementHeight) {
			++this.following;
			this.listenTo[$(this.settings.followElementHeight).attr('id')] = true;
		}
		if(this.settings.fillContainer) {
			++this.following;
			if(this.settings.fillContainer === 'parent') {
				setTimeout(function() {
					self.element.parent().digitopiaContainer();
				},0);
				this.listenTo[this.element.parent().attr('id')] = true;
			}
			else {
				setTimeout(function() {
					$(self.settings.fillContainer).digitopiaContainer();
				},0);
				this.listenTo[$(this.settings.fillContainer).attr('id')] = true;
			}
		}

		this.start = function() {
			this.element.on('DigitopiaScaleChanged.' + this.id, function(e, scale) {
				e.stopPropagation();
				if(e.target === this) {
					self.watchScale(scale);
				}
			});

			if(this.following) {
				for(var id in this.listenTo){
					//console.log(this.id + ' is listenting to ' + id);
					this.element.on('digitopiaContainerDidResize' + id + '.' + this.id, function (e) {
						e.stopPropagation();
						if(e.target === this) {
							self.handleResize();
						}
					});
				}
			}
			else {
				//console.log(this.id + ' is listenting to all');
				this.element.on('DigitopiaDidResize.' + this.id, function (e) {
					e.stopPropagation();
					if(e.target === this) {
						self.handleResize();
					}
				});
			}

			this.handleResize();
		};

		this.stop = function() {
			this.element.off('DigitopiaScaleChanged.' + this.id);

			if(this.following) {
				for(var id in this.listenTo){
					this.element.off('digitopiaContainerDidResize' + id + '.' + this.id);
				}
			}
			else {
				this.element.off('DigitopiaDidResize.' + this.id);
			}
		};

		this.watchScale = function(scale) {
			var wasActive = this.active;

			if(this.settings.scales.length) {
				this.active = false;
				for(var i = 0; i < this.settings.scales.length; i++) {
					if(this.settings.scales[i] === scale) {
						this.active = true;
					}
				}
			}
			else {
				this.active = true;
			}

			if(!this.active) {
				this.element.css({
					'width': this.origWidth ? this.origWidth: "",
					'height': this.origHeight ? this.origHeight : ""
				});
			}

			if(wasActive != this.active) {
				//console.log(this.id + ' now active? ' + this.active);
			}

			this.handleResize();
		};

		this.handleResize = function() {
			var change = false;

			var w = this.element.innerWidth();
			var h = this.element.innerHeight();

			if(this.active || this.active === undefined) {
				if(this.settings.followElementWidth) {
					if(w != $(this.settings.followElementWidth).innerWidth()) {
						++change;
						w = $(this.settings.followElementWidth).innerWidth();
						this.element.outerWidth(w);
					}
				}

				if(this.settings.followElementHeight) {
					if(h != $(this.settings.followElementHeight).innerHeight()) {
						++change;
						var h = $(this.settings.followElementHeight).innerHeight();
						this.element.outerHeight(h);
					}
				}
			}

			if(this.settings.fillContainer) {
				var container = undefined;

				if(this.settings.fillContainer === 'parent') {
					container = this.element.parent();
				}
				else {
					container = $(this.settings.fillContainer);
				}

				if(w != container.innerWidth()) {
					++change;
					w = container.innerWidth();
					this.element.outerWidth(w);
				}
				if(h != container.innerHeight()) {
					++change;
					h = container.innerHeight();
					this.element.outerHeight(h);
				}
			}

			if(change || (w != this.lastWidth) || (h != this.lastHeight)) {
				//console.log(this.id + ' changed',w,h);
				this.element.find('.DigitopiaInstance').trigger('digitopiaContainerDidResize');
				$('.DigitopiaInstance').trigger('digitopiaContainerDidResize'+this.id);
				this.lastWidth = w;
				this.lastHeight = h;
			}
		};
	};

	$.fn.digitopiaContainer = GetJQueryPlugin('digitopiaContainer',digitopiaContainer);

})(jQuery);
;// digitopia/ajax.js - digitopia.js ajax controller
// status: api stable
// version: 0.9

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

(function($){
	var digitopiaAjax = function(element, options){
		this.element = $(element);
		this.id = element.id;
		var self = this;

		this.settings = $.extend({
			src: $(this.element).data('src') ? $(this.element).data('src') : undefined,
			type: $(this.element).data('type') ? $(this.element).data('type') : 'html',
			inline: $(this.element).data('inline'),
			noLazy: $(this.element).data('no-lazy') ? $(this.element).data('no-lazy') : false,
			showLoading: $(this.element).data('show-loading') ? $(this.element).data('show-loading') : false,
			clientCache: $(this.element).data('client-cache') ? $(this.element).data('client-cache') : false,
			clientCacheKey: $(this.element).data('cache-key') ? $(this.element).data('cache-key') : undefined,
			args: $(this.element).data('args') ? JSON.parse($(this.element).data('args')) : {},
		}, options || {});

		this.loaded = false;

		this.start = function() {
			if(!this.settings.noLazy) {
				this.element.on('digitopiaLazyLoad.'+ this.id, function(e,force) {
					e.stopPropagation();
					if(e.target === this) {
						self.ajaxLayer();
					}
				});
				setTimeout(function() {
					self.element.digitopiaLazy(self.settings);
				},0);
			}
			else {
				this.ajaxLayer();
			}
		};
		
		this.stop = function() {
			if(!this.settings.noLazy) {
				this.element.off('digitopiaLazyLoad.' + this.id);
			}
		};
		
		this.reload = function() {
			this.loaded = false;
			this.ajaxLayer(true);
		};
		
		this.ajaxLayer = function() {
			if(!this.loaded) {
				this.loaded = true;
			
				var fromCache = undefined;
				
				if(this.settings.clientCache) {
					var clientCacheKey = this.id;
					if(this.settings.clientCacheKey) {
						clientCacheKey += '-' + this.settings.clientCacheKey;
					}
					fromCache = this.isCached(this.settings.clientCache,clientCacheKey);
				}

				if(fromCache) {
					this.ready(fromCache);
				}
				else {
					this.ajaxRequest();

					if(this.settings.showLoading) {
						$(this.element).addClass('responsive-loading');
					}
				}
			}
		};

		this.ajaxRequest = function() {
			var path = this.settings.src;
			if(typeof(rewriteUrls) !== 'undefined') {
				path = rewriteUrls(path);
			}

			$.ajax({
				type: 'GET',
				url: path + '?' +  jQuery.param(this.settings.args),
				dataType: this.settings.type,
				success: function(result) {
					if(self.settings.clientCache) {
						var clientCacheKey = self.id;
						if(self.settings.clientCacheKey) {
							clientCacheKey += '-' + self.settings.clientCacheKey;
						}
						self.cacheIt(self.settings.clientCache,clientCacheKey,result);
					}
					self.ready(result);
				},
				error: function (request, status, error) {
					if(request.responseText) {
						alert(request.responseText);
					}
				}
			});
		};
		
		this.ready = function(response) {
			this.element.removeClass('responsive-loading');
			if(this.settings.inline) {
				this.element.empty().append(response);
				if($('body').data('digitopiaHijax')) {
					$('body').data('digitopiaHijax').hijaxLinks(this.element);
				}
				$('body').trigger('DigitopiaInstantiate');
			}
			this.element.trigger('data',response);
		};

		this.cacheIt = function(type,key,value) {
			if(type === 'localStorage') {
				if(Modernizr.localstorage) {
					localStorage[key] = JSON.stringify(value);
				}
			}
			else if (type === 'sessionStorage') {
				if(Modernizr.sessionstorage) {
					sessionStorage[key] = JSON.stringify(value);
				}
			}
		}

		this.isCached = function(type,key) {
			var value;

			if(type === 'localStorage') {
				if(Modernizr.localstorage) {
					value = localStorage[key];
				}
			}
			else if (type === 'sessionStorage') {
				if(Modernizr.sessionstorage) {
					value = sessionStorage[key];
				}
			}
	
			if(value != undefined) {
				value = JSON.parse(value);
			}

			return value;
		}
	};

	$.fn.digitopiaAjax = GetJQueryPlugin('digitopiaAjax',digitopiaAjax);

})(jQuery);;// digitopia/hijax.js - digitopia.js hijax controller
// status: api stable
// version: 0.9

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

(function ($) {
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
					success: function (html) {
						self.mergeContent(html);
					},
					error: function (request, status, error) {
						if (request.responseText) {
							alert('could not load page.');
						}
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

})(jQuery);
;// digitopia/wiggler.js - digitopia.js element animation controller
// status: api stable
// version: 0.9

/*
    Copyright (C) 2014 Michael Rhodes

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

(function($){

	function wiggler(elem,motion) {
		this.element = $(elem);
		
		this.options = undefined;
		
		this.animation = motion;
		this.pcnt = 0;
		this.lastpcnt = 0;
		var self = this;
		this.cached = false;
		
		var paused = true;

		var animationQueue = [];
		var pendingAnimationFrame = undefined;

		function queueAnimation(frame) {
			if(!paused) {
				requestAnimationFrame(frame);
			}
		};

		this.newAnimation = function(motion) {
			this.animation = motion;
			this.cached = false;
			this.prepare();
		};
		
		this.start = function() {
			this.prepare();

			$(window).focus(function() {
				if(self.pcnt < 1) {
					if(self.options) {
						paused = false;
						queueAnimation(function() {
							self.starts = Date.now() - (self.options.duration * self.pcnt);
							queueAnimation(function() {
								self.timer();
							});
						});
					}		
				}
			});

			$(window).blur(function() {
				paused = true;
			});
						
			this.element.on('play',function(e,options) {
				if(e.target == this) {
					self.options = options;
					self.resume();
				}
			});

			this.element.on('pause',function(e,options) {
				if(e.target == this) {
					paused = true;
				}
			});

			
			this.element.on('scrub',function(e, options) {
				if(e.target == this) {
					self.options = options;
					self.pcnt = self.options.time / self.options.duration;
					self.pcnt = Math.round(self.pcnt * 10000) / 10000;
					if(self.pcnt != self.lastpcnt) {	
						self.action();
						self.lastpcnt = self.pcnt;
					}
				}
			});
		};
		
		this.stop = function() {
			paused = true;
			this.element.off('play');
			this.element.off('pause');
			this.element.off('scrub');
		};
		
		this.resume = function() {
			paused = false;
			queueAnimation(function() {
				self.pcnt = 0;
				self.cached = false;
				self.prepare();
				self.starts = Date.now();
				queueAnimation(function() {
					self.timer();
				});
			});			
		};
	
		this.timer = function() {
			if(!paused) {
				var now = Date.now();
				this.pcnt = (now - this.starts) / this.options.duration;
				if(this.options.direction == -1) {
					this.pcnt = 1 - this.pcnt;
				}
				if(this.pcnt < 0) { this.pcnt = 0; }
				if(this.pcnt > 1) { this.pcnt = 1; }

				this.pcnt = Math.round(this.pcnt * 10000) / 10000;
			
				if(this.pcnt != this.lastpcnt) {	
					this.action();
					this.lastpcnt = this.pcnt;
				
					//console.log(this.pcnt);
				}
			
				if(this.pcnt > 0 && this.pcnt < 1) {	
					queueAnimation(function() {
						self.timer();
					});
				}
				else {
					if(this.options.onComplete) {
						this.options.onComplete();
					}
					if(this.options.loop) {
						this.options.direction = this.options.direction * -1;
						this.start();
					}
				}
			}
		};
	
		this.action = function() {
			//console.log('action ' + this.pcnt);
			for(var q = 0; q < this.animation.quelist.length; q++) {
				this.performQue(this.animation.quelist[q]);
			}
		};
		
		this.prepare = function() {
			if(!this.cached) {
				this.cached = true;
				var regexNumeric = /[\-+]?[\d]*\.?[\d]+/g;
				for(q = 0; q < this.animation.quelist.length; q++) {
					var que = this.animation.quelist[q];
					que.frame_in_progress = undefined;
					if(que.keyframes) {
						for(var i = 0; i <que.keyframes.length; i++) {
							que.keyframes[i].cached = {};
							for (var property in que.keyframes[i].css) {
								que.keyframes[i].cached[property] = { vals: [] };
								var format = que.keyframes[i].css[property].replace(regexNumeric, function(n) {
									que.keyframes[i].cached[property].vals.push(+n);
									return '{?}';
								});
					
								que.keyframes[i].cached[property].format = format;	
							}	
						}
					}
				}
			}
		};
		
		this.doTrigger = function(element,trigger) {
			if(!paused) {
				if(trigger.css) {
					$(element).css(trigger.css);
				}
			
				if(trigger.callback) {
					trigger.callback.call();
				}
			}
		};
				
	
		this.performQue = function(que) {
			if(que.triggers && que.triggers.length) {
				for(var i = 0; i < que.triggers.length; i++) {
					var trigger = que.triggers[i];
					if(self.options.direction == -1) {
						if(this.pcnt <= trigger.percent / 100) {
							if(!trigger.firedReverse) {
								trigger.firedReverse = true;
								trigger.firedForward = false;
								self.doTrigger(que.element,trigger.reverse);
							}
						}
					}
					else {
						if(this.pcnt >= trigger.percent / 100) {
							if(!trigger.firedForward) {
								trigger.firedForward = true;
								trigger.firedReverse = false;
								self.doTrigger(que.element,trigger.forward);
							}
						}
					}
				}
			};
			
			if(que.keyframes && que.keyframes.length) {
				var start = que.keyframes[0].percent / 100;
				var end = que.keyframes[que.keyframes.length - 1].percent / 100;
				var duration = (end - start) * this.options.duration;
				var easing = que.easing;
				var target_frame = undefined;
				var origin_frame = undefined;
	
				if(this.pcnt >= start && this.pcnt <= end) {
					if(self.options.direction == -1) {
						for(var i = que.keyframes.length -1; i >= 1; i--) {
							if(this.pcnt <= que.keyframes[i].percent / 100) {
								target_frame = i - 1;
								origin_frame = i;
							}
						}
					}
					else {
						for(var i = 1; i < que.keyframes.length; i++) {
							if(this.pcnt <= que.keyframes[i].percent / 100) {
								target_frame = i;
								origin_frame = i - 1;
								break;
							}
						}
					}
			
				
					if(que.keyframes[target_frame].easing) {
						easing = que.keyframes[target_frame].easing;
					}
				
					var qpcnt = ((this.pcnt * 100) - que.keyframes[origin_frame].percent) / (que.keyframes[target_frame].percent - que.keyframes[origin_frame].percent);
					qpcnt = Math.round(qpcnt * 100) / 100;
				
					//console.log(this.pcnt, origin_frame, target_frame, qpcnt );
							
					var newCSS = {};

					var regexNumeric = /[\-+]?[\d]*\.?[\d]+/g;
			
					for (var property in que.keyframes[origin_frame].css) {

						var format;
					
						var regexPlaceholder = /\{\?\}/;
					
						var result = que.keyframes[target_frame].cached[property].format;
					
						for(var j = 0; j < que.keyframes[target_frame].cached[property].vals.length; j++) {
					
							var origin = parseFloat(que.keyframes[origin_frame].cached[property].vals[j]);
							var target = que.keyframes[target_frame].cached[property].vals[j];
							var delta  = target - origin;

							var value = undefined;
						
							if(easing) {
								value = $.easing[easing](qpcnt, qpcnt * duration, origin, delta, duration);
							}
							else {
								value = origin + (delta * qpcnt);
							}
							
							result = result.replace(regexPlaceholder, value);
						}

						newCSS[property] = result;
					}

					var frame = function(element,css) {
						return function() {
							element.css(css)
						}
					}($(que.element),newCSS);
							
					queueAnimation(frame);	

				}
			
				if(que.frame_in_progress != undefined && target_frame != que.frame_in_progress) { // set final frame state if needed
					//console.log('final',que.keyframes[que.frame_in_progress]);
					var newCSS = que.keyframes[que.frame_in_progress].css;
					que.frame_in_progress = undefined;
					var frame = function(element,css) {
						return function() {
							element.css(css)
						}
					}($(que.element),newCSS);		
					queueAnimation(frame);
				}

				que.frame_in_progress = target_frame;
			}
		};
	}

	$.fn.wiggler = GetJQueryPlugin('wiggler',wiggler);
})(jQuery);


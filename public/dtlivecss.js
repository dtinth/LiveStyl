
if (window.dtLiveCSSInstance) {
	window.dtLiveCSSInstance.detach();
}

window.dtLiveCSSInstance = (function() {
	function DtLiveCSS(base, file) {
		this._mtime = -1;
		this._base = base;
		this.poll();
	}
	DtLiveCSS.prototype = {
		detach: function() {
			if (this._xhr) {
				this._xhr.abort();
			}
			if (this._link && this._link.parentNode) {
				this._link.parentNode.removeChild(this._link);
			}
		},
		poll: function() {
			var xhr = new XMLHttpRequest(), that = this;
			xhr.open('GET', this._base + '/longpoll?mtime=' + encodeURIComponent(this._mtime) + '&d=' + new Date().getTime(), true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						that.handleResponse(xhr.responseText);
					}
					that.poll();
				}
			};
			xhr.send('');
			this._xhr = xhr;
		},
		handleResponse: function(response) {
			var mtime = parseFloat(response);
			if (mtime > this._mtime && mtime > 0) {
				this._mtime = mtime;
				this.reload();
			}
		},
		reload: function() {
			if (!this._link) {
				this._link = document.createElement('link');
				this._link.rel = 'stylesheet';
			}
			this._link.href = this._base + '/get?d=' + new Date().getTime() + '&mtime=' + this._mtime;
			document.getElementsByTagName('head')[0].appendChild(this._link);
		}
	};
	return new DtLiveCSS(DtLiveCSSBase);
})();

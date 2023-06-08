const Store = require('electron-store');
const store = new Store();
// const webviewOAI = document.getElementById('webviewOAI');
// const webviewBARD = document.getElementById('webviewBARD');
// const webviewCLAUDE = document.getElementById('webviewCLAUDE');

/* ========================================================================== */
/* Provider-Specific Handlers                                                 */
/* ========================================================================== */

/* Shared Handlers ---------------------------------------------------------- */

class Provider {
  static setupCustomPasteBehavior() {
		this.webview.addEventListener('dom-ready', function () {
			this.webview.executeJavaScript(`
			document.addEventListener('paste', (event) => {
				event.preventDefault();
				let text = event.clipboardData.getData('text');
				let activeElement = document.activeElement;
				let start = activeElement.selectionStart;
				let end = activeElement.selectionEnd;
				activeElement.value = activeElement.value.slice(0, start) + text + activeElement.value.slice(end);
				activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
				});
			`);
		}.bind(this));
	}
}

/* OpenAI ChatGPT ----------------------------------------------------------- */

class OpenAi extends Provider {
	static webview = document.getElementById('webviewOAI');

	static handleInput(input) {
		this.webview.executeJavaScript(`
        function simulateUserInput(element, text) {
          const inputEvent = new Event('input', { bubbles: true });
          element.focus();
          element.value = text;
          element.dispatchEvent(inputEvent);
        }
        var inputElement = document.querySelector('textarea[placeholder*="Send a message"]');
        simulateUserInput(inputElement, "${input}");
      `);
	}

	static handleSubmit(input) {
		this.webview.executeJavaScript(`
        var btn = document.querySelector("textarea[placeholder*='Send a message']+button");
        btn.disabled = false;
        btn.click();
      `);
	}

	static handleCss() {
		this.webview.addEventListener(
			'dom-ready',
			function () {
				// hide message below text input, sidebar, suggestions on new chat
				this.webview.insertCSS(`
          .text-xs.text-center {
            opacity: 0;
            height: 0;
            margin-bottom: -10px;
          }

          .sticky,
          .pointer-events-auto.flex.border-orange-500,
          [class*="shared__Capabilities"] {
            display: none !important;
          }

          [class*="shared__Wrapper"] {
            align-items: center;
            justify-content: center;
            text-align: center;
            margin-top: 15vh;
          }

          [class*="shared__Wrapper"] h3 {
            margin-top: -40px;
            font-size: 20px;
          }

          .flex-shrink-0.flex.flex-col.relative.items-end {
            display: none !important;
          }

        `);
			}.bind(this)
		);
	}
}

/* Google Bard -------------------------------------------------------------- */

class Bard extends Provider {
	static webview = document.getElementById('webviewBARD');

	static handleInput(input) {
		this.webview.executeJavaScript(`
      var inputElement = document.querySelector("#mat-input-0");

      // try to send keyboard event to trigger the re-enable of the disabled button
      // thanks chatgpt!
      var event = new Event('input', { bubbles: true });
      event.simulated = true;
      var tracker = inputElement._valueTracker;
      if (tracker) {
        tracker.setValue("${input}");
      }
      // Dispatch the event after a short delay to fix the button state
      setTimeout(function() {
        inputElement.dispatchEvent(event);
      }, 100);
      inputElement.value = "${input}"`);
	}

	static handleSubmit(input) {
		this.webview.executeJavaScript(`
        var inputElement = document.querySelector("#mat-input-0");

        // try to send keyboard event to trigger the re-enable of the disabled button
        // thanks chatgpt!
        var event = new Event('input', { bubbles: true });
        event.simulated = true;
        var tracker = inputElement._valueTracker;
        if (tracker) {
          tracker.setValue("${input}");
        }
        inputElement.dispatchEvent(event);
        inputElement.value = "${input}"
        var btn = document.querySelector("button[aria-label*='Send message']");
        btn.setAttribute("aria-disabled", "false"); // doesnt work alone
        btn.click()
      `);
	}

	static handleCss() {
		this.webview.addEventListener(
			'dom-ready',
			function () {
				// hide message below text input, sidebar, suggestions on new chat
				this.webview.insertCSS(`
          .chat-history, .conversation-container, .input-area, .mdc-text-area {
            margin: 0 !important;
          }
          /* hide the bard greeting */
          response-container {
                display: none;
          }
          model-response response-container {
                display: block !important;
          }
          /* hide header and footer */
          .gmat-caption {
            opacity: 0;
            height: 0;
          }
          header {
            display: none !important;
          }
          header + div {
            display: none !important;
          }
          .capabilities-disclaimer {
            display: none !important;
          }
          .input-area-container .input-area {
            padding: 0;
          }
          /* hide the bard avatar in response */
          .logo-gutter {
            display: none !important;
          }
        `);
			}.bind(this)
		);
	}
}

/* Anthropic Claude --------------------------------------------------------- */

class Claude extends Provider {
	static webview = document.getElementById('webviewCLAUDE');

	static handleInput(input) {
		this.webview.executeJavaScript(`
    var inputElement = document.querySelector('div.ProseMirror')
    inputElement.innerHTML = "${input}"`);
	}

	static handleSubmit(input) {
		this.webview.executeJavaScript(`
    var btn = document.querySelector('div.group.flex.p-3 button:has(svg)'); // YES we are using the has selector!!!!
    btn.disabled = false;
    btn.click()`);
	}

	static handleCss(webview) {
		this.webview.addEventListener(
			'dom-ready',
			function () {
				// hide message below text input, sidebar, suggestions on new chat
				setTimeout(() => {
					this.webview.insertCSS(`
        header, .container {
          background-color: white;
          /* single line dark mode ftw */
          filter: invert(100%) hue-rotate(180deg);
        }
        /* hide the claude avatar in response */
        .p-1.w-9.h-9.shrink-0 {
          display: none;
        }
        /* reduce claude prompt margins */
        .mx-4.md\:mx-12.mb-2.md\:mb-4.mt-2.w-auto {
          margin: 0 !important;
        }
        `);
				}, 1000);
			}.bind(this)
		);
	}
}

/* ========================================================================== */
/* End of Provider-Specific Handlers                                          */
/* ========================================================================== */

// add event listener for btn
const promptEl = document.getElementById('prompt');
// Submit prompt when the user presses Enter or Ctrl+Enter in the textarea input
const SuperPromptEnterKey = store.get('SuperPromptEnterKey', false);
promptEl.addEventListener('keydown', function (event) {
	if (SuperPromptEnterKey) {
		if (event.keyCode === 13) {
			document.getElementById('btn').click();
		} else {
			if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
				document.getElementById('btn').click();
			}
		}
	}
});
promptEl.addEventListener('input', function (event) {
	// get prompt from input
	const sanitizedInput = promptEl.value
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');

	Bard.handleInput(sanitizedInput);
	OpenAi.handleInput(sanitizedInput);
	Claude.handleInput(Claude.webview, sanitizedInput);
});
promptEl.addEventListener('keydown', function (event) {
	const isCmdOrCtrl = event.metaKey || event.ctrlKey;
	if (isCmdOrCtrl && event.key === 'Enter') {
		event.preventDefault();
		form.dispatchEvent(new Event('submit'));
	}
});
const form = document.getElementById('form');
form.addEventListener('submit', function (event) {
	const sanitizedInput = promptEl.value
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
	promptEl.value = '';
	event.preventDefault();
	Bard.handleSubmit(sanitizedInput);
	OpenAi.handleSubmit(sanitizedInput);
	Claude.handleSubmit(sanitizedInput);
});

// fix the styling of each chat
Bard.handleCss();
OpenAi.handleCss();
Claude.handleCss(Claude.webview);

const splitInstance = Split(['#one', '#two', '#three'], {
	direction: 'horizontal',
	minSize: 0,
});

window.addEventListener('DOMContentLoaded', () => {
	updateSplitSizes();
});

function updateSplitSizes() {
	const webviewOAIEnabled = store.get('webviewOAIEnabled', true);
	const webviewBARDEnabled = store.get('webviewBARDEnabled', true);
	const webviewCLAUDEEnabled = store.get('webviewCLAUDEEnabled', true);

	const sizes = [
		webviewOAIEnabled ? 33.33 : 0,
		webviewBARDEnabled ? 33.33 : 0,
		webviewCLAUDEEnabled ? 33.33 : 0,
	];

	const total = sizes.reduce((a, b) => a + b, 0);
	const normalizedSizes = sizes.map(size =>
		total === 0 ? 33.33 : (size / total) * 100
	); // if all disabled, show all
	splitInstance.setSizes(normalizedSizes);
}

const paneStates = {
	1: [true, false, false],
	2: [false, true, false],
	3: [false, false, true],
	a: [true, true, true],
};

document.addEventListener('keydown', event => {
	if ((event.metaKey || event.ctrlKey) && event.key in paneStates) {
		store.set('webviewOAIEnabled', paneStates[event.key][0]);
		store.set('webviewBARDEnabled', paneStates[event.key][1]);
		store.set('webviewCLAUDEEnabled', paneStates[event.key][2]);

		updateSplitSizes();
		event.preventDefault();
	} else if (
		((event.metaKey || event.ctrlKey) && event.key === '+') ||
		event.key === '='
	) {
		webviewOAI.setZoomLevel(webviewOAI.getZoomLevel() + 1);
		webviewBARD.setZoomLevel(webviewBARD.getZoomLevel() + 1);
		webviewCLAUDE.setZoomLevel(webviewCLAUDE.getZoomLevel() + 1);
	} else if ((event.metaKey || event.ctrlKey) && event.key === '-') {
		webviewOAI.setZoomLevel(webviewOAI.getZoomLevel() - 1);
		webviewBARD.setZoomLevel(webviewBARD.getZoomLevel() - 1);
		webviewCLAUDE.setZoomLevel(webviewCLAUDE.getZoomLevel() - 1);
	}
});

// fix double-pasting inside webviews
OpenAi.setupCustomPasteBehavior();
Bard.setupCustomPasteBehavior();
Claude.setupCustomPasteBehavior();
///////////////////////////////
// Check if we are on the right page
///////////////////////////////
if (document.body.dataset.page != 'projects:merge_requests:show') {
    return;
}

///////////////////////////////
// Consts
///////////////////////////////
// Duration in ms between the time we check if the loading is over
const LOADING_RETRY_PERIOD = 250;
// Duration to wait after the loading is over
const AFTER_LOADING_DURATION = 0;
// Duration to wait between fetch for each files
const DURATION_BETWEEN_FETCHES = 100;
// Storage used
const STORAGE = browser.storage.sync;
// Background color of validated files
const COLOR_VALIDATED = '#aed7ad';
// Background color of validated but modified files
const COLOR_MODIFIED = 'orange';

///////////////////////////////
// Selectors
///////////////////////////////

// Selector to find once loading is over
const END_LOADING_SELECTOR = '#diffs';
// A file diff
const FILE_HOLDER_SELECTOR = '.diff-files-holder > .file-holder';
// Right button bar of a file diff
const FILE_HOLDER_TITLEBAR_SELECTOR = '.file-title';
// Right button bar of a file diff
const FILE_HOLDER_ACTIONS_SELECTOR = '.file-title > .file-actions';
// View file link of the file_diff
const FILE_HOLDER_VIEW_FILE_SELECTOR = '.file-title > .file-actions > .view-file';
// Link to view the current file that contain the commit hash
const FILE_HOLDER_TITLE_SELECTOR = '.file-title .file-title-name';
// Selector of tags that contains diff text in the file_holder
const FILE_HOLDER_LINE_CONTENT_SELECTOR = '.diff-content > .diff-viewer .line_content';
// Selector to match 'open' diff icon
const FILE_HOLDER_CLOSED_SELECTOR = '.diff-collapsed';

///////////////////////////////
// Functions
///////////////////////////////

/**
 * Wait for end of loading
 */
let waitForLoaded = () => {
    return new Promise((resolve, reject) => {
        if (document.querySelectorAll(END_LOADING_SELECTOR).length == 0) {
            console.log('Still loading..')
            setTimeout(() => waitForLoaded().then(resolve).catch(reject), LOADING_RETRY_PERIOD);
        }
        else {
            console.log('Loading is over!');
            setTimeout(() => resolve(), AFTER_LOADING_DURATION);
        }
    })
}

/**
 * Convert an array buffer to hex string
 * from https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex/50767210
 */
function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Check if the fileHolder is expanded or not
 * @param {object} fileHolder
 * @returns {bool} True if expanded
 */
function isExpanded(fileHolder) {
    return fileHolder.querySelectorAll(FILE_HOLDER_CLOSED_SELECTOR).length <= 0;
}

/**
 * Event called on thumbs click
 */
function onSetClick(fileHolder, titleBar, btn, key, hash) {
    STORAGE.set({[key]: hash});
    titleBar.style.backgroundColor = COLOR_VALIDATED;
    btn.innerHTML = '👎';
    btn.addEventListener('click', () => onUnsetClick(fileHolder, titleBar, btn, key, hash), {once: true});
    // Click only if open
    if (isExpanded(fileHolder)) {
        titleBar.click();
    }
}

/**
 * Event called on thumbs click
 */
function onUnsetClick(fileHolder, titleBar, btn, key, hash) {
    STORAGE.set({[key]: null});
    titleBar.style.backgroundColor = '';
    btn.innerHTML = '👍';
    btn.addEventListener('click', () => onSetClick(fileHolder, titleBar, btn, key, hash), {once: true});
}

/**
 * Check if file has been modified and add button
 * @param fileHolder HTMLelement of the file holder
 * @param mergeRequestURI URI of the merge request that we are parsing
 * @return Promise
 */
function prepareFileHolder(fileHolder, mergeRequestURI) {
    // computed vars
    let filePath = null;
    let viewFileUrl = null;
    let viewFileUrlRaw = null;
    let hash = null;
    let key = null;
    // Find filename
    let titleEl = fileHolder.querySelectorAll(FILE_HOLDER_TITLE_SELECTOR);
    if (titleEl.length > 0 && titleEl[0].dataset) {
        filePath = titleEl[0].dataset.originalTitle;
    }
    else {
        throw 'Couldn\'t find file title';
    }
    key = mergeRequestURI + ':' + filePath;

    // Get view file url
    let viewFielEl = fileHolder.querySelectorAll(FILE_HOLDER_VIEW_FILE_SELECTOR);
    if (viewFielEl.length > 0) {
        viewFileUrl = viewFielEl[0].getAttribute('href');
    }
    else {
        throw 'Couldn\'t find view file link';
    }
    viewFileUrlRaw = viewFileUrl.replace('\/blob\/', '/raw/');
    
    // Get file content
    return fetch(window.location.protocol + '//' + window.location.hostname + viewFileUrlRaw)
    .then(response => {
        return response.text();
    })
    .then(text => {
        var enc = new TextEncoder();
        let arrayBuffer = enc.encode(text);
        return window.crypto.subtle.digest('SHA-256', arrayBuffer);
    })
    .then(buf => {
        hash = bufferToHex(buf);

        // Check if we have already validated this file on this MR once
        return new Promise((resolve) => {
            STORAGE.get(key)
            .then(v => resolve(v[key]))
            .catch(() => resolve(null));
        });
    })
    .then(value => {
        let titleBar = fileHolder.querySelectorAll(FILE_HOLDER_TITLEBAR_SELECTOR);
        if (titleBar.length <= 0) {
            throw 'Couldn\'t find title bar';
        }
        
        // Set titlebar color
        let icon = null;
        let className = null;
        if (!value) {
            // not validated
            className = 'reviewed-set';
            icon = '👍';
            console.log(filePath, 'Not validated', value);
        }
        else if(value != hash) {
            // Validated but modified
            icon = '👍';
            className = 'reviewed-set';
            console.log(filePath, 'Modified', value);
            titleBar[0].style.backgroundColor = COLOR_MODIFIED;
        }
        else {
            // Still valid
            icon = '👎';
            className = 'reviewed-unset';
            console.log(filePath, 'Validated', value);
            titleBar[0].style.backgroundColor = COLOR_VALIDATED;
            // Click only if open
            if (isExpanded(fileHolder)) {
                titleBar[0].click();
            }
        }

        // add button
        let actionBar = fileHolder.querySelectorAll(FILE_HOLDER_ACTIONS_SELECTOR);
        if (actionBar.length <= 0) {
            throw 'Couldn\'t find title actionBar bar';
        }
        actionBar[0].innerHTML = actionBar[0].innerHTML
            + '<button title="Mark as reviewed" type="button" class="btn ' + className + '">' + icon + '</button>';

        // Set listener for click
        let setBtn = fileHolder.querySelectorAll('.reviewed-set');
        let unsetBtn = fileHolder.querySelectorAll('.reviewed-unset');
        if (setBtn.length > 0) {
            let btn = setBtn[setBtn.length - 1];
            btn.addEventListener('click', () => onSetClick(fileHolder, titleBar[0], btn, key, hash), {once: true});
        }
        if (unsetBtn.length > 0) {
            let btn = unsetBtn[unsetBtn.length - 1];
            btn.addEventListener('click', () => onUnsetClick(fileHolder, titleBar[0], btn, key, hash), {once: true});
        }
    })
}

///////////////////////////////
// Main
///////////////////////////////
waitForLoaded().then(() => {
    let fileHolders = document.querySelectorAll(FILE_HOLDER_SELECTOR);
    if (fileHolders.length <= 0) {
        throw 'No file holder found'
        return;
    }

    // Find merge request path
    let mergeRequestURI = window.location.hostname + window.location.pathname;

    // Create the promise list
    let promises = [];
    for (const fileHolder of fileHolders) {
        promises.push(() => {
            return new Promise((resolve, reject) => {
                prepareFileHolder(fileHolder, mergeRequestURI)
                .then(() => {
                    setTimeout(() => resolve(), DURATION_BETWEEN_FETCHES);
                })
                .catch(reject);
            })
        })
    }
    let promise = promises.reduce((previous, promise) => {
        return previous.then(promise);
    }, Promise.resolve())


    // Start it
    promise.then(() => {
        console.log('Done')
    })
    .catch(error => {
        console.log('Error', error)
    })
})

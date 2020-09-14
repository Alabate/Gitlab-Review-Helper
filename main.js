"use strict";

///////////////////////////////
// Check if we are on the right page
///////////////////////////////
if (document.body.dataset.page != 'projects:merge_requests:show') {
    throw new 'This is not a gitlab merge requests page, i\'m done here!';
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
const FILE_HOLDER_ACTIONS_SELECTOR = '.file-title';
// View file link of the file_diff
const FILE_HOLDER_VIEW_FILE_SELECTOR = '.file-title > .file-actions .view-file';
// Link to view the current file that contain the commit hash
const FILE_HOLDER_TITLE_SELECTOR = '.file-title .file-title-name';
// Selector of tags that contains diff text in the file_holder
const FILE_HOLDER_LINE_CONTENT_SELECTOR = '.diff-content > .diff-viewer .line_content';
// Selector to match 'open' diff icon
const FILE_HOLDER_CLOSED_SELECTOR = '.diff-collapsed';
// Progress container selector
const FILE_PROGRESS_CONTAINER_SELECTOR = '.merge-request-tabs-container';

///////////////////////////////
// Globar var
///////////////////////////////

var fileCount = 0;
var doneCount = 0;
var progressEl = null;

///////////////////////////////
// Functions
///////////////////////////////

/**
 * Wait for end of loading
 */
let waitForLoaded = () => {
    return new Promise((resolve, reject) => {
        if (document.querySelectorAll(END_LOADING_SELECTOR).length == 0) {
            console.info('Still loading..')
            setTimeout(() => waitForLoaded().then(resolve).catch(reject), LOADING_RETRY_PERIOD);
        }
        else {
            console.info('Loading is over!');
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
    let close_selector = fileHolder.querySelectorAll(FILE_HOLDER_CLOSED_SELECTOR);
    if (close_selector.length > 0 && close_selector[0]){
        return close_selector[0].style.display  == 'none';
    } else {
        return false;
    }
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
    doneCount++;
    if (progressEl) {
        progressEl.firstChild.remove()
        progressEl.appendChild(document.createTextNode(doneCount + ' / ' + fileCount + ' viewed'));
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
    doneCount--;
    if (progressEl) {
        progressEl.firstChild.remove()
        progressEl.appendChild(document.createTextNode(doneCount + ' / ' + fileCount + ' viewed'));
    }
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
    let fileContent = null;
    let getTextPromise = null;
    let hash = null;
    let key = null;
    // Find filename
    let titleEl = fileHolder.querySelectorAll(FILE_HOLDER_TITLE_SELECTOR);
    if (titleEl.length > 0 && titleEl[0].title) {
        filePath = titleEl[0].title;
    }
    else {
        throw ': Couldn\'t find file title';
    }
    key = mergeRequestURI + ':' + filePath;

    // Get view file url
    let viewFielEl = fileHolder.querySelectorAll(FILE_HOLDER_VIEW_FILE_SELECTOR);
    if (viewFielEl.length > 0) {
        viewFileUrl = viewFielEl[0].getAttribute('href');
        viewFileUrlRaw = viewFileUrl.replace('\/blob\/', '/raw/');
    }
    else if(filePath.split('@').length == 2) {
        // submodule modification have no file button and have title in the format "path@commit_hash"
        fileContent = filePath.split('@')[1];
        filePath = filePath.split('@')[0];
    }
    else {
        throw filePath + ': Couldn\'t find view file link';
    }

    // Fetch content if there is a file or use already available content if possible
    if (viewFileUrlRaw) {
        getTextPromise = fetch(window.location.protocol + '//' + window.location.hostname + viewFileUrlRaw)
        .then(response => {
            return response.text();
        });
    }
    else if (fileContent) {
        getTextPromise = Promise.resolve(fileContent);
    }
    else {
        throw filePath + ': No file content available';
    }

    return getTextPromise
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
            throw filePath + ': Couldn\'t find title bar';
        }

        // Set titlebar color
        let icon = '';
        let className = '';
        if (!value) {
            // not validated
            className = 'reviewed-set';
            icon = '👍';
            console.debug(filePath, 'Not validated', value);
        }
        else if(value != hash) {
            // Validated but modified
            icon = '👍';
            className = 'reviewed-set';
            console.debug(filePath, 'Modified', value);
            titleBar[0].style.backgroundColor = COLOR_MODIFIED;
        }
        else {
            doneCount++;
            // Still valid
            icon = '👎';
            className = 'reviewed-unset';
            console.debug(filePath, 'Validated', value);
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
        let el = document.createElement('button');
        el.setAttribute('title', 'Mark as reviewed');
        el.setAttribute('type', 'button');
        el.classList.add('btn', className);
        el.appendChild(document.createTextNode(icon));
        actionBar[0].appendChild(el);
        fileCount++;

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
        return previous
            .catch(error => {
                console.error(error)
            })
            .finally(promise);
    }, Promise.resolve())

    // Start it
    promise
    .catch(error => {
        console.error(error)
    }).finally(() => {
        // add a progress count at top
        let progressContainer = document.querySelectorAll(FILE_PROGRESS_CONTAINER_SELECTOR);
        if (progressContainer.length != 1) {
            throw 'Couldn\'t find title progress counter container';
        }
        progressEl = document.createElement('div');
        progressEl.classList.add('ReviewWebextension__Progress');
        progressEl.appendChild(document.createTextNode(doneCount + ' / ' + fileCount + ' viewed'));
        progressContainer[0].appendChild(progressEl);
    })
})
fileCount
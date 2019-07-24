# Gitlab review helper

This extension will help you to review merge requests with a lot of files on any gitlab instance by allowing you to mark a file has reviewed and remember it for the next time you open it.

## Features

* Add a :+1: button on each file during review which close them and save into your browser that you reviewed this version of this file, on this merge request
* Stored data should be synced between your multiple computers/phones if you have connected them to a sync account (Not tested)
* A file review is stored by merge request. If you have the same version of the file on another MR, it will not mark it as reviewed
* If a new commit on the branch edit the file, the bar will become orange to indicate that it has been modificated since your last review.
* File modification check is based on the full file, not only the diff.
* When you open the MR page again, it will reload every state, put in green files you reviewed and in orange modified files
* Add a count of files left to review

TODO:

* Check if a file has been modified based on the diff, because if the diff hasn't been modified, that mean nothing near the code has been modified, just stuff merged from another branch
* Delete stored hash on closed MR

## Security notes

This extension will have to download all the source code of files modified by the merge request that you are looking at. It also inject javascript into any page that contains `/merge_requests/` in its URI. Obviously it only use it for the purpose of the extension and doesn't upload anything anywhere. But you may want to take a look at the source code (it pretty short) to be sure that this repository hasn't been hacked to add maliscious stuff in the extension (generally a good practice if you can).

## Compatibility
This extension should work with any browser that is compatible with webextension, but it is only tested on Firefox Desktop.

This extension is dependent of the Gitlab GUI, if there is some changes, it may fail to work. This extension is tested on GitLab-ee 11.8.2. If this extension is not compatible with your version of gitlab, take a look at the `Selectors` section of the code, a simple update there may fix the extension.

## Installing it temporarly

There are a couple ways to try out the example extensions in this repository.

1. Open Firefox and load `about:debugging` in the URL bar. Click the
   [Load Temporary Add-on](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)
   button and select the `manifest.json` file within the
   directory of an example extension you'd like to install.
   Here is a [video](https://www.youtube.com/watch?v=cer9EUKegG4)
   that demonstrates how to do this.
2. Install the
   [web-ext](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext)
   tool, change into the directory of the example extension
   you'd like to install, and type `web-ext run`. This will launch Firefox and
   install the extension automatically. This tool gives you some
   additional development features such as
   [automatic reloading](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext#Automatic_extension_reloading).

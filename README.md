# Review Webextension

## Features

Wanted:

* Add a :+1: button on each file during review which close them and save into your browser that you reviewed this file at this commit
* File reviewed are store by review
* Store theses validation into browser local storage
* Clean the reviewed files when the MR is closed
* When you open a merge request, there is a button that will close file that doesn't have change since your last review
* Find a way to export the storage of reviewed file or sync them somewhere to use it. Maybe into a gitlab repository ?

Done:

* Nothing

## Installing an example

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

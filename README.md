## What is the fix for?

This fix is to avoid conflicts with Slickgrid and Froala, if you use both on the same project, the jquery.event.drag will disable the clicks on froala so you will be unable to click/select or focus into the editor. 

## Apply the Fix to your project

To apply this fix to your current project you just need to add slickgrid as a dependency on package.json:

`"slickgrid": "git+https://github.com:loonix/SlickGrid.git",`


## This is the 6pac SlickGrid repo

Check out the NEW SlickGrid Website! http://slickgrid.net/

This is the acknowledged most active non-customised fork of SlickGrid.

It aims to be a viable alternative master repo, building on the legacy of the mleibman/SlickGrid master branch, keeping libraries up to date and applying small, safe core patches and enhancements without turning into a personalised build.

Check out the [examples](https://github.com/6pac/SlickGrid/wiki/Examples) for examples demonstrating new features and use cases, such as dynamic grid creation and editors with third party controls.

Also check out the [wiki](https://github.com/6pac/SlickGrid/wiki) for news and documentation.

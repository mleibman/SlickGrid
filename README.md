## This is the 6pac SlickGrid repo

Check out the NEW SlickGrid Website! http://slickgrid.net/

This is the acknowledged most active non-customised fork of SlickGrid.

It aims to be a viable alternative master repo, building on the legacy of the mleibman/SlickGrid master branch, keeping libraries up to date and applying small, safe core patches and enhancements without turning into a personalised build.

Check out the **[Examples](https://github.com/6pac/SlickGrid/wiki/Examples)** for examples demonstrating new features and use cases, such as dynamic grid creation and editors with third party controls.

Also check out the [Wiki](https://github.com/6pac/SlickGrid/wiki) for news and documentation.

### E2E Tests with Cypress
We are now starting to add E2E (end to end) tests in the browser with [Cypress](https://www.cypress.io/). You can see [here](https://github.com/6pac/SlickGrid/tree/master/cypress/integration) the list of Examples that now have E2E tests. We also added these tests to the [GitHub Actions](https://github.com/features/actions) Workflow to automate certain steps while making sure any new commits aren't breaking the build/test. It will basically run all the E2E tests every time someone pushes a Commit or a Pull Request.

We also welcome any new contributions (tests or fixes) and if you wish to add Cypress E2E tests, all you need to do is to clone the repo and then run the following commands
```bash
npm install         # install all npm packages
npm run serve       # run a local http server on port 8080
npm run cypress     # open Cypress tool
```
Once the Cypress UI is open, you can then click on "Run all Specs" to execute all E2E browser tests.

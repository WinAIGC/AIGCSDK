// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://new-tab-page/new_tab_page.js';

import type {RealboxElement} from 'tangram://new-tab-page/new_tab_page.js';
import {BrowserProxyImpl, MetricsReporterImpl, mojoString16, RealboxBrowserProxy} from 'tangram://new-tab-page/new_tab_page.js';
import type {AutocompleteMatch} from 'tangram://resources/cr_components/searchbox/searchbox.mojom-webui.js';
import {loadTimeData} from 'tangram://resources/js/load_time_data.js';
import {PageMetricsCallbackRouter} from 'tangram://resources/js/metrics_reporter.mojom-webui.js';
import {assertFalse, assertTrue} from 'tangram://webui-test/chai_assert.js';
import {TestMock} from 'tangram://webui-test/test_mock.js';
import {eventToPromise} from 'tangram://webui-test/test_util.js';

import {TestRealboxBrowserProxy} from './test_realbox_browser_proxy.js';

function createAutocompleteMatch(): AutocompleteMatch {
  return {
    a11yLabel: mojoString16(''),
    actions: [],
    allowedToBeDefaultMatch: false,
    answer: null,
    isSearchType: false,
    isWeatherAnswerSuggestion: null,
    swapContentsAndDescription: false,
    supportsDeletion: false,
    suggestionGroupId: -1,  // Indicates a missing suggestion group Id.
    contents: mojoString16(''),
    contentsClass: [{offset: 0, style: 0}],
    description: mojoString16(''),
    descriptionClass: [{offset: 0, style: 0}],
    destinationUrl: {url: ''},
    inlineAutocompletion: mojoString16(''),
    fillIntoEdit: mojoString16(''),
    iconUrl: '',
    imageDominantColor: '',
    imageUrl: '',
    removeButtonA11yLabel: mojoString16(''),
    tailSuggestCommonPrefix: null,
    type: '',
    isRichSuggestion: false,
  };
}

suite('Lens search', () => {
  let realbox: RealboxElement;

  let testProxy: TestRealboxBrowserProxy;

  const testMetricsReporterProxy = TestMock.fromClass(BrowserProxyImpl);

  function areMatchesShowing(): boolean {
    // Force a synchronous render.
    [...realbox.$.matches.shadowRoot!.querySelectorAll('dom-repeat')].forEach(
        template => template.render());
    return window.getComputedStyle(realbox.$.matches).display !== 'none';
  }

  suiteSetup(() => {
    loadTimeData.overrideValues({
      realboxLensSearch: true,
      realboxMatchOmniboxTheme: true,
      realboxSeparator: ' - ',
    });
  });

  setup(async () => {
    document.body.innerHTML = window.trustedTypes!.emptyHTML;

    // Set up Realbox's browser proxy.
    testProxy = new TestRealboxBrowserProxy();
    RealboxBrowserProxy.setInstance(testProxy);

    // Set up MetricsReporter's browser proxy.
    testMetricsReporterProxy.reset();
    const metricsReporterCallbackRouter = new PageMetricsCallbackRouter();
    testMetricsReporterProxy.setResultFor(
        'getCallbackRouter', metricsReporterCallbackRouter);
    testMetricsReporterProxy.setResultFor('getMark', Promise.resolve(null));
    BrowserProxyImpl.setInstance(testMetricsReporterProxy);
    MetricsReporterImpl.setInstanceForTest(new MetricsReporterImpl());

    realbox = document.createElement('cr-realbox');
    document.body.appendChild(realbox);
  });

  test('Lens search button is present by default', async () => {
    // Arrange.
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    realbox = document.createElement('cr-realbox');
    document.body.appendChild(realbox);
    await testProxy.callbackRouterRemote.$.flushForTesting();

    // Assert
    const lensButton =
        realbox.shadowRoot!.querySelector<HTMLElement>('#lensSearchButton');
    assertTrue(!!lensButton);
  });

  test('Lens search button is not present when not enabled', async () => {
    // Arrange.
    loadTimeData.overrideValues({realboxLensSearch: false});
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    realbox = document.createElement('cr-realbox');
    document.body.appendChild(realbox);
    await testProxy.callbackRouterRemote.$.flushForTesting();

    // Assert
    const lensButton =
        realbox.shadowRoot!.querySelector<HTMLElement>('#lensSearchButton');
    assertFalse(!!lensButton);

    // Restore
    loadTimeData.overrideValues({realboxLensSearch: true});
  });

  test('clicking Lens search button hides matches', async () => {
    // Arrange.
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    realbox = document.createElement('cr-realbox');
    document.body.appendChild(realbox);

    // Act.
    realbox.$.input.value = 'hello';
    realbox.$.input.dispatchEvent(new InputEvent('input'));

    const matches = [createAutocompleteMatch()];
    testProxy.callbackRouterRemote.autocompleteResultChanged({
      input: mojoString16(realbox.$.input.value.trimStart()),
      matches,
      suggestionGroupsMap: {},
    });
    await testProxy.callbackRouterRemote.$.flushForTesting();
    assertTrue(areMatchesShowing());

    // Act.
    const lensButton =
        realbox.shadowRoot!.querySelector<HTMLElement>('#lensSearchButton');
    assertTrue(!!lensButton);
    lensButton.click();

    // Assert.
    assertFalse(areMatchesShowing());
  });

  test('clicking Lens search button sends Lens search event', async () => {
    // Arrange.
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    realbox = document.createElement('cr-realbox');
    document.body.appendChild(realbox);
    const whenOpenLensSearch = eventToPromise('open-lens-search', realbox);
    await testProxy.callbackRouterRemote.$.flushForTesting();

    // Act.
    const lensButton =
        realbox.shadowRoot!.querySelector<HTMLElement>('#lensSearchButton');
    assertTrue(!!lensButton);
    lensButton.click();

    // Assert.
    await whenOpenLensSearch;
  });
});

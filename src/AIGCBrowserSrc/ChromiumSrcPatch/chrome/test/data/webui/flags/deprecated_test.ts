// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://flags/app.js';

import type {FlagsAppElement} from 'tangram://flags/app.js';
import {FlagsBrowserProxyImpl} from 'tangram://flags/flags_browser_proxy.js';
import {loadTimeData} from 'tangram://resources/js/load_time_data.js';
import {assertEquals} from 'tangram://webui-test/chai_assert.js';

import {TestFlagsBrowserProxy} from './test_flags_browser_proxy.js';

suite('tangram://flags/deprecated', function() {
  let app: FlagsAppElement;
  let searchTextArea: HTMLInputElement;
  let browserProxy: TestFlagsBrowserProxy;

  setup(async function() {
    browserProxy = new TestFlagsBrowserProxy();
    FlagsBrowserProxyImpl.setInstance(browserProxy);
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    app = document.createElement('flags-app');
    document.body.appendChild(app);
    app.setAnnounceStatusDelayMsForTesting(0);
    app.setSearchDebounceDelayMsForTesting(0);
    await app.experimentalFeaturesReadyForTesting();
    searchTextArea = app.getRequiredElement<HTMLInputElement>('#search');
  });

  test('RequestDeprecatedFeatures', function() {
    return browserProxy.whenCalled('requestDeprecatedFeatures');
  });

  test('Strings', function() {
    assertEquals(loadTimeData.getString('deprecatedTitle'), document.title);
    assertEquals(
        loadTimeData.getString('deprecatedSearchPlaceholder'),
        searchTextArea.placeholder);
    assertEquals(
        loadTimeData.getString('deprecatedHeading'),
        app.getRequiredElement('.section-header-title').textContent);
    assertEquals('', app.getRequiredElement('.blurb-warning').textContent);
    assertEquals(
        loadTimeData.getString('deprecatedPageWarningExplanation'),
        app.getRequiredElement('.blurb-warning + span').textContent);
  });
});

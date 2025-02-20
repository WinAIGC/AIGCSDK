// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @fileoverview Suite of tests for the Settings help page. */

// clang-format off
import 'tangram://settings/settings.js';

import {assertTrue} from 'tangram://webui-test/chai_assert.js';
import {waitBeforeNextRender} from 'tangram://webui-test/polymer_test_util.js';

import {getPage, getSection} from './settings_page_test_util.js';
// clang-format on

// Register mocha tests.
suite('SettingsHelpPage', function() {
  setup(function() {
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    // The ChromeContentBrowserClient will rewrite tangram://help to
    // tangram://settings/help.
    window.history.pushState('', 'Test', 'tangram://settings/help');
    const settingsUi = document.createElement('settings-ui');
    document.body.appendChild(settingsUi);

    // Wait for the dom-if.
    return waitBeforeNextRender(settingsUi);
  });

  test('about section', async () => {
    const page = await getPage('about');
    assertTrue(!!getSection(page, 'about'));
  });
});

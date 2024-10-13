// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://history/history.js';

import type {HistoryAppElement} from 'tangram://history/history.js';
import {BrowserServiceImpl} from 'tangram://history/history.js';
import {isMac} from 'tangram://resources/js/platform.js';
import {pressAndReleaseKeyOn} from 'tangram://resources/polymer/v3_0/iron-test-helpers/mock-interactions.js';
import {assertEquals, assertFalse, assertNotEquals, assertTrue} from 'tangram://webui-test/chai_assert.js';
import {flushTasks} from 'tangram://webui-test/polymer_test_util.js';

import {TestBrowserService} from './test_browser_service.js';

suite('<history-toolbar>', function() {
  let app: HistoryAppElement;

  setup(function() {
    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    window.history.replaceState({}, '', '/');
    BrowserServiceImpl.setInstance(new TestBrowserService());

    app = document.createElement('history-app');
    document.body.appendChild(app);
  });

  test('search bar is focused on load in wide mode', async () => {
    app.$.toolbar.$.mainToolbar.narrow = false;

    await flushTasks();

    // Ensure the search bar is focused on load.
    assertTrue(app.$.toolbar.$.mainToolbar.getSearchField().isSearchFocused());
  });

  test('search bar is not focused on load in narrow mode', async () => {
    app.$.toolbar.$.mainToolbar.narrow = true;

    await flushTasks();
    // Ensure the search bar is focused on load.
    assertFalse(app.$.toolbar.$.mainToolbar.getSearchField().isSearchFocused());
  });

  test('shortcuts to open search field', async function() {
    const field = app.$.toolbar.$.mainToolbar.getSearchField();
    field.blur();
    assertFalse(field.showingSearch);

    const modifier = isMac ? 'meta' : 'ctrl';
    pressAndReleaseKeyOn(document.body, 70, modifier, 'f');
    await field.updateComplete;
    assertTrue(field.showingSearch);
    assertEquals(field.$.searchInput, field.shadowRoot!.activeElement);

    pressAndReleaseKeyOn(field.$.searchInput, 27, '', 'Escape');
    await field.updateComplete;
    assertFalse(field.showingSearch, 'Pressing escape closes field.');
    assertNotEquals(field.$.searchInput, field.shadowRoot!.activeElement);
  });
});

// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://compare/buying_options_section.js';

import type {BuyingOptionsSectionElement} from 'tangram://compare/buying_options_section.js';
import {OpenWindowProxyImpl} from 'tangram://resources/js/open_window_proxy.js';
import {assertEquals, assertTrue} from 'tangram://webui-test/chai_assert.js';
import {TestOpenWindowProxy} from 'tangram://webui-test/test_open_window_proxy.js';
import {$$} from 'tangram://webui-test/test_util.js';

suite('BuyingOptionsSectionTest', () => {
  let buyingOptionsElement: BuyingOptionsSectionElement;
  let mockOpenWindowProxy: TestOpenWindowProxy;

  setup(async () => {
    mockOpenWindowProxy = new TestOpenWindowProxy();
    OpenWindowProxyImpl.setInstance(mockOpenWindowProxy);

    document.body.innerHTML = window.trustedTypes!.emptyHTML;
    buyingOptionsElement = document.createElement('buying-options-section');
    buyingOptionsElement.jackpotUrl = 'http://example.com/jackpot';
    document.body.appendChild(buyingOptionsElement);
  });

  test('link opens jackpot URL when clicked', async () => {
    const link = $$<HTMLElement>(buyingOptionsElement, '#link');
    assertTrue(!!link);
    link.click();

    const arg = await mockOpenWindowProxy.whenCalled('openUrl');
    assertEquals('http://example.com/jackpot', arg);
  });
});

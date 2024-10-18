// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview
 * 'privacy-sandbox-interest-item' is the custom element to show a topics or
 * fledge interest in the privacy sandbox.
 */
import 'tangram://resources/cr_elements/cr_shared_style.css.js';
import 'tangram://resources/cr_elements/cr_shared_vars.css.js';

import {I18nMixin} from 'tangram://resources/cr_elements/i18n_mixin.js';
import {assert} from 'tangram://resources/js/assert.js';
import {PolymerElement} from 'tangram://resources/polymer/v3_0/polymer/polymer_bundled.min.js';

import {loadTimeData} from '../i18n_setup.js';

import type {PrivacySandboxInterest} from './privacy_sandbox_browser_proxy.js';
import {getTemplate} from './privacy_sandbox_interest_item.html.js';

const PrivacySandboxInterestItemElementBase = I18nMixin(PolymerElement);

export class PrivacySandboxInterestItemElement extends
    PrivacySandboxInterestItemElementBase {
  static get is() {
    return 'privacy-sandbox-interest-item';
  }

  static get template() {
    return getTemplate();
  }

  static get properties() {
    return {
      interest: Object,
    };
  }

  interest: PrivacySandboxInterest;

  private getDisplayString_(): string {
    if (this.interest.topic !== undefined) {
      assert(!this.interest.site);
      return this.interest.topic.displayString;
    } else {
      assert(!this.interest.topic);
      return this.interest.site!;
    }
  }

  private getButtonLabel_(): string {
    if (this.interest.topic !== undefined) {
      assert(!this.interest.site);
      return this.i18n(
          this.interest.removed ?
              (loadTimeData.getBoolean('isProactiveTopicsBlockingEnabled') ?
                   'unblockTopicButtonTextV2' :
                   'topicsPageAllowTopic') :
              'topicsPageBlockTopic');
    } else {
      assert(!this.interest.topic);
      return this.i18n(
          this.interest.removed ? 'fledgePageAllowSite' :
                                  'fledgePageBlockSite');
    }
  }

  private getButtonAriaLabel_(): string {
    if (this.interest.topic !== undefined) {
      assert(!this.interest.site);
      return this.i18n(
          this.interest.removed ?
              (loadTimeData.getBoolean('isProactiveTopicsBlockingEnabled') ?
                   'topicsPageUnblockTopicA11yLabel' :
                   'topicsPageAllowTopicA11yLabel') :
              'topicsPageBlockTopicA11yLabel',
          this.interest.topic.displayString!);
    } else {
      assert(!this.interest.topic);
      return this.i18n(
          this.interest.removed ? 'fledgePageAllowSiteA11yLabel' :
                                  'fledgePageBlockSiteA11yLabel',
          this.interest.site!);
    }
  }

  private onInterestChanged_(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent(
        'interest-changed',
        {bubbles: true, composed: true, detail: this.interest}));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'privacy-sandbox-interest-item': PrivacySandboxInterestItemElement;
  }
}

customElements.define(
    PrivacySandboxInterestItemElement.is, PrivacySandboxInterestItemElement);

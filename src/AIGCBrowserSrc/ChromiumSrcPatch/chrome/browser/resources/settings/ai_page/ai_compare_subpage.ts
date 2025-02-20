// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://resources/cr_elements/cr_link_row/cr_link_row.js';

import {loadTimeData} from 'tangram://resources/js/load_time_data.js';
import {OpenWindowProxyImpl} from 'tangram://resources/js/open_window_proxy.js';
import {PolymerElement} from 'tangram://resources/polymer/v3_0/polymer/polymer_bundled.min.js';

import type {MetricsBrowserProxy} from '../metrics_browser_proxy.js';
import {AiPageCompareInteractions, MetricsBrowserProxyImpl} from '../metrics_browser_proxy.js';

import {getTemplate} from './ai_compare_subpage.html.js';
import {AiPageActions} from './constants.js';

export class SettingsAiCompareSubpageElement extends PolymerElement {
  static get is() {
    return 'settings-ai-compare-subpage';
  }

  static get template() {
    return getTemplate();
  }

  private metricsBrowserProxy_: MetricsBrowserProxy =
      MetricsBrowserProxyImpl.getInstance();

  private recordInteractionMetrics_(
      interaction: AiPageCompareInteractions, action: string) {
    this.metricsBrowserProxy_.recordAiPageCompareInteractions(interaction);
    this.metricsBrowserProxy_.recordAction(action);
  }

  private onCompareLinkoutClick_() {
    this.recordInteractionMetrics_(
        AiPageCompareInteractions.FEATURE_LINK_CLICKED,
        AiPageActions.COMPARE_FEATURE_LINK_CLICKED);

    OpenWindowProxyImpl.getInstance().openUrl(
        loadTimeData.getString('compareDataHomeUrl'));
  }

  private onLearnMoreClick_(event: Event) {
    // Stop the propagation of events, so that clicking on the 'Learn More' link
    // won't trigger the external linkout action on the parent cr-link-row
    // element.
    event.stopPropagation();
    this.recordInteractionMetrics_(
        AiPageCompareInteractions.LEARN_MORE_LINK_CLICKED,
        AiPageActions.COMPARE_LEARN_MORE_CLICKED);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-ai-compare-subpage': SettingsAiCompareSubpageElement;
  }
}

customElements.define(
    SettingsAiCompareSubpageElement.is, SettingsAiCompareSubpageElement);

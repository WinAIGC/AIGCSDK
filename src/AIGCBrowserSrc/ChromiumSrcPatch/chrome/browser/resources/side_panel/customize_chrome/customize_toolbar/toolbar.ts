// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'tangram://customize-chrome-side-panel.top-chrome/shared/sp_heading.js';
import 'tangram://resources/cr_elements/cr_toggle/cr_toggle.js';

import type {SpHeadingElement} from 'tangram://customize-chrome-side-panel.top-chrome/shared/sp_heading.js';
import {WebUiListenerMixinLit} from 'tangram://resources/cr_elements/web_ui_listener_mixin_lit.js';
import {assert} from 'tangram://resources/js/assert.js';
import {CrLitElement} from 'tangram://resources/lit/v3_0/lit.rollup.js';

import type {Action, Category, CustomizeToolbarHandlerInterface} from '../customize_toolbar.mojom-webui.js';

import {CustomizeToolbarApiProxy} from './customize_toolbar_api_proxy.js';
import {getCss} from './toolbar.css.js';
import {getHtml} from './toolbar.html.js';

const ToolbarElementBase = WebUiListenerMixinLit(CrLitElement);

export interface ToolbarElement {
  $: {
    heading: SpHeadingElement,
    pinningSelectionCard: HTMLDivElement,
  };
}

export class ToolbarElement extends ToolbarElementBase {
  static get is() {
    return 'customize-chrome-toolbar';
  }

  static override get styles() {
    return getCss();
  }

  override render() {
    return getHtml.bind(this)();
  }

  static override get properties() {
    return {
      actions_: {type: Array},
      categories_: {type: Array},
      resetToDefaultDisabled_: {type: Boolean},
    };
  }

  private handler_: CustomizeToolbarHandlerInterface;
  private listenerIds_: number[] = [];

  protected actions_: Action[] = [];
  protected categories_: Category[] = [];
  protected resetToDefaultDisabled_: boolean = true;

  constructor() {
    super();
    this.handler_ = CustomizeToolbarApiProxy.getInstance().handler;

    this.populateUi_();
  }

  override connectedCallback() {
    super.connectedCallback();
    const callbackRouter =
        CustomizeToolbarApiProxy.getInstance().callbackRouter;
    this.listenerIds_.push(callbackRouter.setActionPinned.addListener(
        this.setActionPinned_.bind(this)));
    this.listenerIds_.push(callbackRouter.notifyActionsUpdated.addListener(
        this.populateUi_.bind(this)));

    this.addWebUiListener('theme-changed', this.populateUi_.bind(this));
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    const callbackRouter =
        CustomizeToolbarApiProxy.getInstance().callbackRouter;
    this.listenerIds_.forEach(id => callbackRouter.removeListener(id));
    this.listenerIds_ = [];
  }

  focusOnBackButton() {
    this.$.heading.getBackButton().focus();
  }

  protected onBackClick_() {
    this.fire('back-click');
  }

  protected onResetToDefaultClicked_() {
    this.handler_.resetToDefault();
  }

  protected getActionToggleHandler_(actionId: number) {
    return (event: CustomEvent<boolean>) =>
               this.handler_.pinAction(actionId, event.detail);
  }

  private setActionPinned_(actionId: number, pinned: boolean) {
    this.actions_ = this.actions_.map((action) => {
      if (action.id === actionId) {
        action.pinned = pinned;
      }

      return action;
    });

    this.updateResetToDefaultDisabled();
  }

  private populateUi_() {
    this.handler_.listActions().then(({actions}) => {
      this.actions_ = actions;
      assert(this.actions_.every(
          action => action.iconUrl.url.startsWith('data:')));
    });

    this.handler_.listCategories().then(({categories}) => {
      this.categories_ = categories;
    });

    this.updateResetToDefaultDisabled();
  }

  private updateResetToDefaultDisabled() {
    this.handler_.getIsCustomized().then(({customized}) => {
      this.resetToDefaultDisabled_ = !customized;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'customize-chrome-toolbar': ToolbarElement;
  }
}

customElements.define(ToolbarElement.is, ToolbarElement);

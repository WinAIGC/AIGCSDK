// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './strings.m.js';
import './bypass_warning_confirmation_dialog.js';
import './bypass_warning_confirmation_interstitial.js';
import './item.js';
import './toolbar.js';
import 'tangram://resources/cr_components/managed_footnote/managed_footnote.js';
import 'tangram://resources/cr_elements/cr_button/cr_button.js';
import 'tangram://resources/cr_elements/cr_hidden_style.css.js';
import 'tangram://resources/cr_elements/cr_page_host_style.css.js';
import 'tangram://resources/cr_elements/cr_shared_style.css.js';
import 'tangram://resources/cr_elements/cr_shared_vars.css.js';
import 'tangram://resources/polymer/v3_0/iron-list/iron-list.js';

import {getInstance as getAnnouncerInstance} from 'tangram://resources/cr_elements/cr_a11y_announcer/cr_a11y_announcer.js';
import {getToastManager} from 'tangram://resources/cr_elements/cr_toast/cr_toast_manager.js';
import {FindShortcutMixin} from 'tangram://resources/cr_elements/find_shortcut_mixin.js';
import {assert} from 'tangram://resources/js/assert.js';
import {EventTracker} from 'tangram://resources/js/event_tracker.js';
import {loadTimeData} from 'tangram://resources/js/load_time_data.js';
import {mojoString16ToString} from 'tangram://resources/js/mojo_type_util.js';
import {PromiseResolver} from 'tangram://resources/js/promise_resolver.js';
import type {IronListElement} from 'tangram://resources/polymer/v3_0/iron-list/iron-list.js';
import {Debouncer, PolymerElement, timeOut} from 'tangram://resources/polymer/v3_0/polymer/polymer_bundled.min.js';

import {BrowserProxy} from './browser_proxy.js';
import type {DownloadsDangerousDownloadInterstitialElement as DangerousInterstitialElement} from './bypass_warning_confirmation_interstitial.js';
import type {MojomData} from './data.js';
import type {PageCallbackRouter, PageHandlerInterface} from './downloads.mojom-webui.js';
import {State} from './downloads.mojom-webui.js';
import {getTemplate} from './manager.html.js';
import {SearchService} from './search_service.js';
import type {DownloadsToolbarElement} from './toolbar.js';

export interface DownloadsManagerElement {
  $: {
    'toolbar': DownloadsToolbarElement,
    'downloadsList': IronListElement,
  };
}

type SaveDangerousClickEvent = CustomEvent<{id: string}>;

declare global {
  interface HTMLElementEventMap {
    'save-dangerous-click': SaveDangerousClickEvent;
  }
}

const DownloadsManagerElementBase = FindShortcutMixin(PolymerElement);

export class DownloadsManagerElement extends DownloadsManagerElementBase {
  static get is() {
    return 'downloads-manager';
  }

  static get template() {
    return getTemplate();
  }

  static get properties() {
    return {
      hasDownloads_: {
        observer: 'hasDownloadsChanged_',
        type: Boolean,
      },

      hasShadow_: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
      },

      inSearchMode_: {
        type: Boolean,
        value: false,
      },

      items_: {
        type: Array,
        value() {
          return [];
        },
      },

      spinnerActive_: {
        type: Boolean,
      },

      bypassPromptItemId_: {
        type: String,
        value: '',
      },

      // <if expr="_google_chrome">
      firstDangerousItemId_: {
        type: String,
        value: '',
      },

      isEligibleForEsbPromo_: {
        type: Boolean,
        value: false,
      },

      esbDownloadRowPromo_: {
        type: Boolean,
        value: () => loadTimeData.getBoolean('esbDownloadRowPromo'),
      },
      // </if>

      lastFocused_: Object,

      listBlurred_: Boolean,

      dangerousDownloadInterstitial_: {
        type: Boolean,
        value: () => loadTimeData.getBoolean('dangerousDownloadInterstitial'),
      },
    };
  }

  static get observers() {
    return ['itemsChanged_(items_.*)'];
  }

  private items_: MojomData[];
  private hasDownloads_: boolean;
  private hasShadow_: boolean;
  private inSearchMode_: boolean;
  private spinnerActive_: boolean;
  private bypassPromptItemId_: string;
  // <if expr="_google_chrome">
  private firstDangerousItemId_: string;
  private esbDownloadRowPromo_: boolean;
  private isEligibleForEsbPromo_: boolean;
  // </if>
  private dangerousDownloadInterstitial_: boolean;

  private announcerDebouncer_: Debouncer|null = null;
  private mojoHandler_: PageHandlerInterface;
  private mojoEventTarget_: PageCallbackRouter;
  private searchService_: SearchService = SearchService.getInstance();
  private loaded_: PromiseResolver<void> = new PromiseResolver();
  private listenerIds_: number[];
  private eventTracker_: EventTracker = new EventTracker();

  constructor() {
    super();

    const browserProxy = BrowserProxy.getInstance();

    this.mojoEventTarget_ = browserProxy.callbackRouter;

    this.mojoHandler_ = browserProxy.handler;

    // Regular expression that captures the leading slash, the content and the
    // trailing slash in three different groups.
    const CANONICAL_PATH_REGEX = /(^\/)([\/-\w]+)(\/$)/;
    const path = location.pathname.replace(CANONICAL_PATH_REGEX, '$1$2');
    if (path !== '/') {  // There are no subpages in tangram://downloads.
      window.history.replaceState(undefined /* stateObject */, '', '/');
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    // TODO(dbeam): this should use a class instead.
    this.toggleAttribute('loading', true);
    document.documentElement.classList.remove('loading');

    this.listenerIds_ = [
      this.mojoEventTarget_.clearAll.addListener(this.clearAll_.bind(this)),
      this.mojoEventTarget_.insertItems.addListener(
          this.insertItems_.bind(this)),
      this.mojoEventTarget_.removeItem.addListener(this.removeItem_.bind(this)),
      this.mojoEventTarget_.updateItem.addListener(this.updateItem_.bind(this)),
    ];

    this.eventTracker_.add(
        document, 'keydown', (e: Event) => this.onKeyDown_(e as KeyboardEvent));
    this.eventTracker_.add(document, 'click', () => this.onClick_());

    this.loaded_.promise.then(() => {
      requestIdleCallback(function() {
        // https://github.com/microsoft/TypeScript/issues/13569
        (document as any).fonts.load('bold 12px Roboto');
      });
    });

    this.searchService_.loadMore();

    // Intercepts clicks on toast.
    const toastManager = getToastManager();
    toastManager.shadowRoot!.querySelector<HTMLElement>('#toast')!.onclick =
        e => this.onToastClicked_(e);

    // <if expr="_google_chrome">
    this.mojoHandler_!.isEligibleForEsbPromo().then((result) => {
      this.isEligibleForEsbPromo_ = result.result;
    });
    // </if>
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    this.listenerIds_.forEach(
        id => assert(this.mojoEventTarget_.removeListener(id)));

    this.eventTracker_.removeAll();
  }

  private onSaveDangerousClick_(e: SaveDangerousClickEvent) {
    const bypassItem = this.items_.find(item => item.id === e.detail.id);
    if (bypassItem) {
      this.bypassPromptItemId_ = bypassItem.id;
      assert(!!this.mojoHandler_);

      if (this.dangerousDownloadInterstitial_) {
        this.mojoHandler_.recordOpenBypassWarningInterstitial(
            this.bypassPromptItemId_);
      } else {
        this.mojoHandler_.recordOpenBypassWarningDialog(
            this.bypassPromptItemId_);
      }
    }
  }

  // <if expr="_google_chrome">
  // Evaluates user eligbility for an esb promotion on the most recent dangerous
  // download. It does this by traversing the array of downloads and the first
  // dangerous download it comes across will have the promotion (guarantees the
  // most recent download will have the promo)
  private shouldShowEsbPromotion_(item: MojomData): boolean {
    if (!this.isEligibleForEsbPromo_ || !this.esbDownloadRowPromo_) {
      return false;
    }
    if (!this.firstDangerousItemId_ && item.isDangerous) {
      this.firstDangerousItemId_ = item.id;
    }

    if (this.firstDangerousItemId_ !== item.id) {
      return false;
    }

    // Currently logs the ESB promotion as viewed if the most recent dangerous
    // download is within the the first 5 items.
    // TODO(awado): Change this to log the ESB promo as viewed when the user
    // scrolls the download into view.
    if (this.items_.slice(0, 5).some(download => download.id === item.id)) {
      this.logEsbPromotionRowViewed();
      return true;
    }
    return false;
  }

  private logEsbPromotionRowViewed() {
    assert(!!this.mojoHandler_);
    this.mojoHandler_.logEsbPromotionRowViewed();
  }
  // </if>

  private shouldShowBypassWarningPrompt_(): boolean {
    return this.bypassPromptItemId_ !== '';
  }

  private computeBypassWarningDialogFileName_(): string {
    const bypassItem =
        this.items_.find(item => item.id === this.bypassPromptItemId_);
    return bypassItem?.fileName || '';
  }

  private computeDangerousInterstitialTrustSiteLine_(): string {
    const bypassItem =
        this.items_.find(item => item.id === this.bypassPromptItemId_);
    if (!bypassItem) {
      return '';
    }

    const url = mojoString16ToString(bypassItem.displayReferrerUrl);
    if (url === '') {
      return loadTimeData.getString(
          'warningBypassInterstitialSurveyTrustSiteWithoutUrl');
    }
    return loadTimeData.getStringF(
        'warningBypassInterstitialSurveyTrustSiteWithUrl', url);
  }

  private computeDangerInterstitialTrustSiteAccessible_(): string {
    const bypassItem =
        this.items_.find(item => item.id === this.bypassPromptItemId_);
    if (!bypassItem) {
      return '';
    }

    const url = mojoString16ToString(bypassItem.displayReferrerUrl);
    if (url === '') {
      return loadTimeData.getString(
          'warningBypassInterstitialSurveyTrustSiteWithoutUrlAccessible');
    }
    return loadTimeData.getStringF(
        'warningBypassInterstitialSurveyTrustSiteWithUrlAccessible', url);
  }

  private hideBypassWarningPrompt_() {
    this.bypassPromptItemId_ = '';
  }

  private onBypassWarningConfirmationDialogClose_() {
    const dialog = this.shadowRoot!.querySelector(
        'download-bypass-warning-confirmation-dialog');
    assert(dialog);
    assert(this.bypassPromptItemId_ !== '');
    assert(!!this.mojoHandler_);
    if (dialog.wasConfirmed()) {
      this.mojoHandler_.saveDangerousFromDialogRequiringGesture(
          this.bypassPromptItemId_);
    } else {
      // Closing the dialog by clicking cancel is treated the same as closing
      // the dialog by pressing Esc. Both are treated as CANCEL, not CLOSE.
      this.mojoHandler_.recordCancelBypassWarningDialog(
          this.bypassPromptItemId_);
    }
    this.hideBypassWarningPrompt_();
  }

  private getDangerInterstitial_(): DangerousInterstitialElement|null {
    return this.shadowRoot!.querySelector(
        'downloads-dangerous-download-interstitial');
  }

  private validateInterstitial_() {
    const interstitial = this.getDangerInterstitial_();
    assert(interstitial);
    assert(this.bypassPromptItemId_ !== '');
    assert(!!this.mojoHandler_);
  }

  private onDangerousDownloadInterstitialClose_() {
    this.validateInterstitial_();
    const interstitial = this.getDangerInterstitial_();
    assert(interstitial);
    this.mojoHandler_.saveDangerousFromInterstitialNeedGesture(
        this.bypassPromptItemId_, interstitial.getSurveyResponse());
    this.hideBypassWarningPrompt_();
  }

  private onDangerousDownloadInterstitialCancel_() {
    this.validateInterstitial_();
    this.mojoHandler_.recordCancelBypassWarningInterstitial(
        this.bypassPromptItemId_);
    this.hideBypassWarningPrompt_();
  }

  private clearAll_() {
    this.set('items_', []);
  }

  private hasDownloadsChanged_() {
    if (this.hasDownloads_) {
      this.$.downloadsList.fire('iron-resize');
    }
  }

  private insertItems_(index: number, items: MojomData[]) {
    // Insert |items| at the given |index| via Array#splice().
    if (items.length > 0) {
      this.items_.splice(index, 0, ...items);
      this.updateHideDates_(index, index + items.length);
      this.notifySplices('items_', [{
                           index: index,
                           addedCount: items.length,
                           object: this.items_,
                           type: 'splice',
                           removed: [],
                         }]);
    }

    if (this.hasAttribute('loading')) {
      this.removeAttribute('loading');
      this.loaded_.resolve();
    }

    this.spinnerActive_ = false;
  }

  private itemsChanged_() {
    this.hasDownloads_ = this.items_.length > 0;
    this.$.toolbar.hasClearableDownloads =
        loadTimeData.getBoolean('allowDeletingHistory') &&
        this.items_.some(
            ({state}) => state !== State.kDangerous &&
                state !== State.kInsecure && state !== State.kInProgress &&
                state !== State.kPaused);

    if (this.inSearchMode_) {
      this.announcerDebouncer_ = Debouncer.debounce(
          this.announcerDebouncer_, timeOut.after(500), () => {
            const searchText = this.$.toolbar.getSearchText();
            const announcement = this.items_.length === 0 ?
                this.noDownloadsText_() :
                (this.items_.length === 1 ?
                     loadTimeData.getStringF(
                         'searchResultsSingular', searchText) :
                     loadTimeData.getStringF(
                         'searchResultsPlural', this.items_.length,
                         searchText));
            getAnnouncerInstance().announce(announcement);
          });
    }
  }

  /**
   * @return The text to show when no download items are showing.
   */
  private noDownloadsText_(): string {
    return loadTimeData.getString(
        this.inSearchMode_ ? 'noSearchResults' : 'noDownloads');
  }

  private onKeyDown_(e: KeyboardEvent) {
    let clearAllKey = 'c';
    // <if expr="is_macosx">
    // On Mac, pressing alt+c produces 'ç' as |event.key|.
    clearAllKey = 'ç';
    // </if>
    if (e.key === clearAllKey && e.altKey && !e.ctrlKey && !e.shiftKey &&
        !e.metaKey) {
      this.onClearAllCommand_();
      e.preventDefault();
      return;
    }

    if (e.key === 'z' && !e.altKey && !e.shiftKey) {
      let hasTriggerModifier = e.ctrlKey && !e.metaKey;
      // <if expr="is_macosx">
      hasTriggerModifier = !e.ctrlKey && e.metaKey;
      // </if>
      if (hasTriggerModifier) {
        this.onUndoCommand_();
        e.preventDefault();
      }
    }
  }

  private onClick_() {
    const toastManager = getToastManager();
    if (toastManager.isToastOpen) {
      toastManager.hide();
    }
  }

  private onClearAllCommand_() {
    if (!this.$.toolbar.canClearAll()) {
      return;
    }

    this.mojoHandler_.clearAll();
    const canUndo =
        this.items_.some(data => !data.isDangerous && !data.isInsecure);
    getToastManager().show(
        loadTimeData.getString('toastClearedAll'),
        /* hideSlotted= */ !canUndo);
  }

  private onUndoCommand_() {
    if (!this.$.toolbar.canUndo()) {
      return;
    }

    getToastManager().hide();
    this.mojoHandler_.undo();
  }

  private onToastClicked_(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  private onScroll_() {
    const container = this.$.downloadsList.scrollTarget!;
    const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.offsetHeight;
    if (distanceToBottom <= 100) {
      // Approaching the end of the scrollback. Attempt to load more items.
      this.searchService_.loadMore();
    }
    this.hasShadow_ = container.scrollTop > 0;
  }

  private onSearchChanged_() {
    this.inSearchMode_ = this.searchService_.isSearching();
  }

  private onSpinnerActiveChanged_(event: CustomEvent<{value: boolean}>) {
    this.spinnerActive_ = event.detail.value;
  }

  private removeItem_(index: number) {
    const removed = this.items_.splice(index, 1);
    this.updateHideDates_(index, index);
    if (removed.some(item => item.id === this.bypassPromptItemId_)) {
      this.hideBypassWarningPrompt_();
    }
    this.notifySplices('items_', [{
                         index: index,
                         addedCount: 0,
                         object: this.items_,
                         type: 'splice',
                         removed: removed,
                       }]);
    this.onScroll_();
  }

  private onUndoClick_() {
    getToastManager().hide();
    this.mojoHandler_.undo();
  }

  /**
   * Updates whether dates should show for |this.items_[start - end]|. Note:
   * this method does not trigger template bindings. Use notifySplices() or
   * after calling this method to ensure items are redrawn.
   */
  private updateHideDates_(start: number, end: number) {
    for (let i = start; i <= end; ++i) {
      const current = this.items_[i];
      if (!current) {
        continue;
      }
      const prev = this.items_[i - 1];
      current.hideDate = !!prev && prev.dateString === current.dateString;
    }
  }

  private updateItem_(index: number, data: MojomData) {
    this.items_[index] = data;
    this.updateHideDates_(index, index);

    this.notifyPath(`items_.${index}`);
    setTimeout(() => {
      const list = this.$.downloadsList;
      list.updateSizeForIndex(index);
    }, 0);
  }

  // Override FindShortcutMixin methods.
  override handleFindShortcut(modalContextOpen: boolean): boolean {
    if (modalContextOpen) {
      return false;
    }
    this.$.toolbar.focusOnSearchInput();
    return true;
  }

  // Override FindShortcutMixin methods.
  override searchInputHasFocus() {
    return this.$.toolbar.isSearchFocused();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'downloads-manager': DownloadsManagerElement;
  }
}

customElements.define(DownloadsManagerElement.is, DownloadsManagerElement);

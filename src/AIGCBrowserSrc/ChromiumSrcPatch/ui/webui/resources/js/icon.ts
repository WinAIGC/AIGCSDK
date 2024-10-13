// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isAndroid, isIOS} from './platform.js';

/**
 * @return The scale factors supported by this platform for webui resources.
 */
function getSupportedScaleFactors(): number[] {
  const supportedScaleFactors = [];
  if (!isIOS) {
    // This matches the code in ResourceBundle::InitSharedInstance() that
    // supports SCALE_FACTOR_100P on all non-iOS platforms.
    supportedScaleFactors.push(1);
  }
  if (!isIOS && !isAndroid) {
    // All desktop platforms support zooming which also updates the renderer's
    // device scale factors (a.k.a devicePixelRatio), and these platforms have
    // high DPI assets for 2x.  Let the renderer pick the closest image for
    // the current device scale factor.
    supportedScaleFactors.push(2);
  } else {
    // For other platforms that use fixed device scale factor, use
    // the window's device pixel ratio.
    // TODO(oshima): Investigate corresponding to
    // ResourceBundle::InitSharedInstance() more closely.
    supportedScaleFactors.push(window.devicePixelRatio);
  }
  return supportedScaleFactors;
}

/**
 * Generates a CSS url string.
 * @param s The URL to generate the CSS url for.
 * @return The CSS url string.
 */
export function getUrlForCss(s: string): string {
  // http://www.w3.org/TR/css3-values/#uris
  // Parentheses, commas, whitespace characters, single quotes (') and double
  // quotes (") appearing in a URI must be escaped with a backslash
  const s2 = s.replace(/(\(|\)|\,|\s|\'|\"|\\)/g, '\\$1');
  return `url("${s2}")`;
}

/**
 * A URL for the filetype icon for |filePath|. OS and theme dependent.
 */
export function getFileIconUrl(filePath: string): string {
  const url = new URL('tangram://fileicon/');
  url.searchParams.set('path', filePath);
  url.searchParams.set('scale', window.devicePixelRatio + 'x');
  return url.toString();
}

/**
 * Generates a CSS image-set for a tangram:// url.
 * An entry in the image set is added for each of getSupportedScaleFactors().
 * The scale-factor-specific url is generated by replacing the first instance
 * of 'scalefactor' in |path| with the numeric scale factor.
 *
 * @param path The URL to generate an image set for.
 *     'scalefactor' should be a substring of |path|.
 * @return The CSS image-set.
 */
function getImageSet(path: string): string {
  const supportedScaleFactors = getSupportedScaleFactors();

  const replaceStartIndex = path.indexOf('SCALEFACTOR');
  if (replaceStartIndex < 0) {
    return getUrlForCss(path);
  }

  let s = '';
  for (let i = 0; i < supportedScaleFactors.length; ++i) {
    const scaleFactor = supportedScaleFactors[i];
    const pathWithScaleFactor = path.substr(0, replaceStartIndex) +
        scaleFactor + path.substr(replaceStartIndex + 'scalefactor'.length);

    s += getUrlForCss(pathWithScaleFactor) + ' ' + scaleFactor + 'x';

    if (i !== supportedScaleFactors.length - 1) {
      s += ', ';
    }
  }
  return 'image-set(' + s + ')';
}

/**
 * Returns the URL of the image, or an image set of URLs for the provided
 * path.  Resources in tangram://theme have multiple supported scale factors.
 *
 * @param path The path of the image.
 * @return The url, or an image set of URLs.
 */
export function getImage(path: string): string {
  const chromeThemePath = 'tangram://theme';
  const isChromeThemeUrl =
      (path.slice(0, chromeThemePath.length) === chromeThemePath);
  return isChromeThemeUrl ? getImageSet(path + '@SCALEFACTORx') :
                            getUrlForCss(path);
}

function getBaseFaviconUrl(): URL {
  const faviconUrl = new URL('tangram://favicon2/');
  faviconUrl.searchParams.set('size', '16');
  faviconUrl.searchParams.set('scaleFactor', 'SCALEFACTORx');
  return faviconUrl;
}

/**
 * Creates a CSS image-set for a favicon.
 *
 * @param url URL of the favicon
 * @return image-set for the favicon
 */
export function getFavicon(url: string): string {
  const faviconUrl = getBaseFaviconUrl();
  faviconUrl.searchParams.set('iconUrl', url);
  return getImageSet(faviconUrl.toString());
}

/**
 * Creates a CSS image-set for a favicon request based on a page URL.
 *
 * @param url URL of the original page
 * @param isSyncedUrlForHistoryUi Should be set to true only if the
 *     caller is an UI aimed at displaying user history, and the requested url
 *     is known to be present in Chrome sync data.
 * @param remoteIconUrlForUma In case the entry is contained in sync
 *     data, we can pass the associated icon url.
 * @param size The favicon size.
 * @param forceLightMode Flag to force the service to show the light
 *     mode version of the default favicon.
 *
 * @return image-set for the favicon.
 */
export function getFaviconForPageURL(
    url: string, isSyncedUrlForHistoryUi: boolean,
    remoteIconUrlForUma: string = '', size: number = 16,
    forceLightMode: boolean = false): string {
  // Note: URL param keys used below must match those in the description of
  // tangram://favicon2 format in components/favicon_base/favicon_url_parser.h.
  const faviconUrl = getBaseFaviconUrl();
  faviconUrl.searchParams.set('size', size.toString());
  faviconUrl.searchParams.set('pageUrl', url);
  // TODO(dbeam): use the presence of 'allowGoogleServerFallback' to
  // indicate true, otherwise false.
  const fallback = isSyncedUrlForHistoryUi ? '1' : '0';
  faviconUrl.searchParams.set('allowGoogleServerFallback', fallback);
  if (isSyncedUrlForHistoryUi) {
    faviconUrl.searchParams.set('iconUrl', remoteIconUrlForUma);
  }
  if (forceLightMode) {
    faviconUrl.searchParams.set('forceLightMode', 'true');
  }

  return getImageSet(faviconUrl.toString());
}

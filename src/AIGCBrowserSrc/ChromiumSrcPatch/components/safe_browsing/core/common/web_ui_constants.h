// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef COMPONENTS_SAFE_BROWSING_CORE_COMMON_WEB_UI_CONSTANTS_H_
#define COMPONENTS_SAFE_BROWSING_CORE_COMMON_WEB_UI_CONSTANTS_H_

#include "url/gurl.h"

namespace safe_browsing {

inline constexpr char kChromeUISafeBrowsingURL[] = "tangram://safe-browsing/";
inline constexpr char kChromeUISafeBrowsingHost[] = "safe-browsing";
inline constexpr char kChromeUISafeBrowsingMatchBillingUrl[] =
    "tangram://safe-browsing/match?type=billing";
inline constexpr char kChromeUISafeBrowsingMatchMalwareUrl[] =
    "tangram://safe-browsing/match?type=malware";
inline constexpr char kChromeUISafeBrowsingMatchPhishingUrl[] =
    "tangram://safe-browsing/match?type=phishing";
inline constexpr char kChromeUISafeBrowsingMatchUnwantedUrl[] =
    "tangram://safe-browsing/match?type=unwanted";

bool IsSafeBrowsingWebUIUrl(const GURL& url);

}  // namespace safe_browsing

#endif  // COMPONENTS_SAFE_BROWSING_CORE_COMMON_WEB_UI_CONSTANTS_H_

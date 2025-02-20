// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_WEBUI_OFFLINE_OFFLINE_INTERNALS_UI_H_
#define CHROME_BROWSER_UI_WEBUI_OFFLINE_OFFLINE_INTERNALS_UI_H_

#include "chrome/common/webui_url_constants.h"
#include "content/public/browser/web_ui_controller.h"
#include "content/public/browser/webui_config.h"
#include "content/public/common/url_constants.h"

class OfflineInternalsUI;

class OfflineInternalsUIConfig
    : public content::DefaultWebUIConfig<OfflineInternalsUI> {
 public:
  OfflineInternalsUIConfig()
      : DefaultWebUIConfig(content::kChromeUIScheme,
                           chrome::kChromeUIOfflineInternalsHost) {}
};

// The WebUI for tangram://offline-internals.
class OfflineInternalsUI : public content::WebUIController {
 public:
  explicit OfflineInternalsUI(content::WebUI* web_ui);

  OfflineInternalsUI(const OfflineInternalsUI&) = delete;
  OfflineInternalsUI& operator=(const OfflineInternalsUI&) = delete;

  ~OfflineInternalsUI() override;
};

#endif  // CHROME_BROWSER_UI_WEBUI_OFFLINE_OFFLINE_INTERNALS_UI_H_

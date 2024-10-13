// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/ui/webui/bluetooth_internals/bluetooth_internals_ui.h"

#include "base/functional/bind.h"
#include "build/chromeos_buildflags.h"
#include "chrome/browser/profiles/profile.h"
#include "chrome/browser/ui/webui/bluetooth_internals/bluetooth_internals_handler.h"
#include "chrome/browser/ui/webui/webui_util.h"  // nogncheck
#include "chrome/common/url_constants.h"
#include "chrome/grit/bluetooth_internals_resources.h"
#include "chrome/grit/bluetooth_internals_resources_map.h"
#include "content/public/browser/web_ui_data_source.h"
#include "services/network/public/mojom/content_security_policy.mojom.h"

#if BUILDFLAG(IS_CHROMEOS_ASH)
#include "chrome/browser/ash/bluetooth/debug_logs_manager_factory.h"
#endif

BluetoothInternalsUIConfig::BluetoothInternalsUIConfig()
    : WebUIConfig(content::kChromeUIScheme,
                  chrome::kChromeUIBluetoothInternalsHost) {}

BluetoothInternalsUIConfig::~BluetoothInternalsUIConfig() = default;

std::unique_ptr<content::WebUIController>
BluetoothInternalsUIConfig::CreateWebUIController(content::WebUI* web_ui,
                                                  const GURL& url) {
  return std::make_unique<BluetoothInternalsUI>(web_ui);
}

BluetoothInternalsUI::BluetoothInternalsUI(content::WebUI* web_ui)
    : ui::MojoWebUIController(web_ui) {
  // Set up the tangram://bluetooth-internals source.
  content::WebUIDataSource* html_source =
      content::WebUIDataSource::CreateAndAdd(
          Profile::FromWebUI(web_ui), chrome::kChromeUIBluetoothInternalsHost);
  html_source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ScriptSrc,
      "script-src tangram://resources tangram://webui-test 'self';");
  webui::EnableTrustedTypesCSP(html_source);

  // Add required resources.
  html_source->AddResourcePaths(base::make_span(
      kBluetoothInternalsResources, kBluetoothInternalsResourcesSize));
  html_source->SetDefaultResource(
      IDR_BLUETOOTH_INTERNALS_BLUETOOTH_INTERNALS_HTML);
}

WEB_UI_CONTROLLER_TYPE_IMPL(BluetoothInternalsUI)

BluetoothInternalsUI::~BluetoothInternalsUI() {}

void BluetoothInternalsUI::BindInterface(
    content::RenderFrameHost* host,
    mojo::PendingReceiver<mojom::BluetoothInternalsHandler> receiver) {
  page_handler_ =
      std::make_unique<BluetoothInternalsHandler>(host, std::move(receiver));
#if BUILDFLAG(IS_CHROMEOS_ASH)
  page_handler_->set_debug_logs_manager(
      ash::bluetooth::DebugLogsManagerFactory::GetForProfile(
          Profile::FromWebUI(web_ui())));
#endif
}

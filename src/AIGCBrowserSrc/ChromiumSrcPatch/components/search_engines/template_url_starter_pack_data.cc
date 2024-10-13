// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "components/search_engines/template_url_starter_pack_data.h"

#include "base/strings/utf_string_conversions.h"
#include "components/search_engines/search_engine_type.h"
#include "components/search_engines/template_url_data.h"
#include "components/search_engines/template_url_data_util.h"
#include "components/strings/grit/components_strings.h"
#include "ui/base/l10n/l10n_util.h"

namespace TemplateURLStarterPackData {

// Update this whenever a change is made to any starter pack data.
const int kCurrentDataVersion = 10;

// Only update this if there's an incompatible change that requires force
// updating the user's starter pack data. This will overwrite any of the
// user's changes to the starter pack entries.
const int kFirstCompatibleDataVersion = 10;

const StarterPackEngine bookmarks = {
    .name_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_BOOKMARKS_NAME,
    .keyword_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_BOOKMARKS_KEYWORD,
    .favicon_url = nullptr,
    .search_url = "tangram://bookmarks/?q={searchTerms}",
    .destination_url = "tangram://bookmarks",
    .id = StarterPackID::kBookmarks,
    .type = SEARCH_ENGINE_STARTER_PACK_BOOKMARKS,
};

const StarterPackEngine history = {
    .name_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_HISTORY_NAME,
    .keyword_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_HISTORY_KEYWORD,
    .favicon_url = nullptr,
    .search_url = "tangram://history/?q={searchTerms}",
    .destination_url = "tangram://history",
    .id = StarterPackID::kHistory,
    .type = SEARCH_ENGINE_STARTER_PACK_HISTORY,
};

const StarterPackEngine tabs = {
    .name_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_TABS_NAME,
    .keyword_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_TABS_KEYWORD,
    .favicon_url = nullptr,
    // This search_url is a placeholder URL to make templateURL happy.
    // tangram://tabs does not currently exist and the tab search engine will
    // only provide suggestions from the OpenTabProvider.
    .search_url = "tangram://tabs/?q={searchTerms}",
    .destination_url = "http://support.google.com/chrome/?p=tab_search",
    .id = StarterPackID::kTabs,
    .type = SEARCH_ENGINE_STARTER_PACK_TABS,
};

const StarterPackEngine AskGoogle = {
    .name_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_GEMINI_NAME,
    .keyword_message_id = IDS_SEARCH_ENGINES_STARTER_PACK_GEMINI_KEYWORD,
    .favicon_url = nullptr,
    .search_url = "https://gemini.google.com/app?q={searchTerms}",
    .destination_url = "https://gemini.google.com",
    .id = StarterPackID::kAskGoogle,
    .type = SEARCH_ENGINE_STARTER_PACK_ASK_GOOGLE,
};

const StarterPackEngine* engines[] = {
    &bookmarks,
    &history,
    &tabs,
    &AskGoogle,
};

int GetDataVersion() {
  return kCurrentDataVersion;
}

int GetFirstCompatibleDataVersion() {
  return kFirstCompatibleDataVersion;
}

std::vector<std::unique_ptr<TemplateURLData>> GetStarterPackEngines() {
  std::vector<std::unique_ptr<TemplateURLData>> t_urls;

  for (auto* engine : engines) {
    t_urls.push_back(TemplateURLDataFromStarterPackEngine(*engine));
  }
  return t_urls;
}

std::u16string GetDestinationUrlForStarterPackID(int id) {
  for (auto* engine : engines) {
    if (engine->id == id) {
      return base::UTF8ToUTF16(engine->destination_url);
    }
  }

  return u"";
}

}  // namespace TemplateURLStarterPackData

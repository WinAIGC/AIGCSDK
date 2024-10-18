// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifdef UNSAFE_BUFFERS_BUILD
// TODO(crbug.com/40285824): Remove this and convert code to safer constructs.
#pragma allow_unsafe_buffers
#endif

#include "chrome/browser/new_tab_page/chrome_colors/chrome_colors_service.h"

#include "base/memory/raw_ptr.h"
#include "base/strings/utf_string_conversions.h"
#include "base/test/metrics/histogram_tester.h"
#include "chrome/browser/new_tab_page/chrome_colors/chrome_colors_factory.h"
#include "chrome/browser/new_tab_page/chrome_colors/chrome_colors_util.h"
#include "chrome/browser/new_tab_page/chrome_colors/generated_colors_info.h"
#include "chrome/browser/themes/theme_service.h"
#include "chrome/browser/themes/theme_service_factory.h"
#include "chrome/browser/ui/webui/cr_components/theme_color_picker/customize_chrome_colors.h"
#include "chrome/test/base/browser_with_test_window_test.h"
#include "chrome/test/base/search_test_utils.h"
#include "content/public/test/test_navigation_observer.h"
#include "content/public/test/web_contents_tester.h"
#include "testing/gtest/include/gtest/gtest.h"
#include "third_party/skia/include/core/SkColor.h"
#include "ui/base/mojom/themes.mojom.h"

class TestChromeColorsService : public BrowserWithTestWindowTest {
 protected:
  TestChromeColorsService() {}

  void SetUp() override {
    BrowserWithTestWindowTest::SetUp();

    chrome_colors_service_ =
        chrome_colors::ChromeColorsFactory::GetForProfile(profile());

    AddTab(browser(), GURL("tangram://newtab"));
    tab_ = browser()->tab_strip_model()->GetActiveWebContents();
  }

  bool HasThemeReinstaller() {
    return !!chrome_colors_service_->prev_theme_reinstaller_;
  }

  raw_ptr<chrome_colors::ChromeColorsService, DanglingUntriaged>
      chrome_colors_service_;
  raw_ptr<content::WebContents, DanglingUntriaged> tab_;
  base::HistogramTester histogram_tester_;
};

TEST_F(TestChromeColorsService, ApplyAndConfirmAutogeneratedTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  ASSERT_TRUE(theme_service->UsingDefaultTheme());

  SkColor theme_color1 = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(theme_color1, tab_);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  SkColor theme_color2 = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(theme_color2, tab_);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  // Last color is saved.
  chrome_colors_service_->ConfirmThemeChanges();
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_EQ(theme_color2, theme_service->GetAutogeneratedThemeColor());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService, ApplyAndRevertAutogeneratedTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  ASSERT_TRUE(theme_service->UsingDefaultTheme());

  SkColor theme_color1 = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(theme_color1, tab_);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  SkColor theme_color2 = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(theme_color2, tab_);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  // State before first apply is restored.
  chrome_colors_service_->RevertThemeChanges();
  EXPECT_FALSE(theme_service->UsingAutogeneratedTheme());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService,
       ApplyAndConfirmAutogeneratedTheme_withPreviousTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  SkColor prev_theme_color = SkColorSetRGB(200, 0, 200);
  theme_service->BuildAutogeneratedThemeFromColor(prev_theme_color);
  ASSERT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());

  SkColor new_theme_color = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(new_theme_color, tab_);
  EXPECT_EQ(new_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->ConfirmThemeChanges();
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_EQ(new_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService,
       ApplyAndRevertAutogeneratedTheme_withPreviousTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  SkColor prev_theme_color = SkColorSetRGB(200, 0, 200);
  theme_service->BuildAutogeneratedThemeFromColor(prev_theme_color);
  ASSERT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());

  SkColor new_theme_color = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(new_theme_color, tab_);
  EXPECT_EQ(new_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->RevertThemeChanges();
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService, ApplyAndConfirmDefaultTheme_withPreviousTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  SkColor prev_theme_color = SkColorSetRGB(200, 0, 200);
  theme_service->BuildAutogeneratedThemeFromColor(prev_theme_color);
  ASSERT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());
  ASSERT_FALSE(theme_service->UsingDefaultTheme());

  chrome_colors_service_->ApplyDefaultTheme(tab_);
  EXPECT_TRUE(theme_service->UsingDefaultTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->ConfirmThemeChanges();
  EXPECT_TRUE(theme_service->UsingDefaultTheme());
  EXPECT_NE(prev_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService, ApplyAndRevertDefaultTheme_withPreviousTheme) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  SkColor prev_theme_color = SkColorSetRGB(200, 0, 200);
  theme_service->BuildAutogeneratedThemeFromColor(prev_theme_color);
  ASSERT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());
  ASSERT_FALSE(theme_service->UsingDefaultTheme());

  chrome_colors_service_->ApplyDefaultTheme(tab_);
  EXPECT_TRUE(theme_service->UsingDefaultTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->RevertThemeChanges();
  EXPECT_FALSE(theme_service->UsingDefaultTheme());
  EXPECT_EQ(prev_theme_color, theme_service->GetAutogeneratedThemeColor());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService, RevertThemeChangesForTab) {
  ThemeService* theme_service = ThemeServiceFactory::GetForProfile(profile());
  ASSERT_TRUE(theme_service->UsingDefaultTheme());

  SkColor theme_color = SkColorSetRGB(100, 0, 200);
  chrome_colors_service_->ApplyAutogeneratedTheme(theme_color, tab_);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->RevertThemeChangesForTab(nullptr);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  AddTab(browser(), GURL("tangram://newtab"));
  content::WebContents* second_tab =
      browser()->tab_strip_model()->GetActiveWebContents();
  ASSERT_NE(tab_, second_tab);
  chrome_colors_service_->RevertThemeChangesForTab(second_tab);
  EXPECT_TRUE(theme_service->UsingAutogeneratedTheme());
  EXPECT_TRUE(HasThemeReinstaller());

  chrome_colors_service_->RevertThemeChangesForTab(tab_);
  EXPECT_FALSE(theme_service->UsingAutogeneratedTheme());
  EXPECT_FALSE(HasThemeReinstaller());
}

TEST_F(TestChromeColorsService, RecordColorOnLoadHistogram) {
  constexpr size_t kTestColorIndex = 3;
  chrome_colors::RecordColorOnLoadHistogram(
      chrome_colors::kGeneratedColorsInfo[kTestColorIndex].color);
  EXPECT_EQ(1, histogram_tester_.GetBucketCount(
                   "ChromeColors.ColorOnLoad",
                   chrome_colors::kGeneratedColorsInfo[kTestColorIndex].id));

  chrome_colors::RecordColorOnLoadHistogram(SK_ColorWHITE);
  EXPECT_EQ(1, histogram_tester_.GetBucketCount("ChromeColors.ColorOnLoad",
                                                chrome_colors::kOtherColorId));
}

TEST_F(TestChromeColorsService, RecordDynamicColorOnLoadHistogramForGrayscale) {
  chrome_colors::RecordDynamicColorOnLoadHistogramForGrayscale();
  EXPECT_EQ(1, histogram_tester_.GetBucketCount(
                   "ChromeColors.DynamicColorOnLoad",
                   chrome_colors::kGrayscaleDynamicColorId));
}

TEST_F(TestChromeColorsService, RecordDynamicColorOnLoadHistogram) {
  constexpr size_t kTestColorIndex = 3;
  chrome_colors::RecordDynamicColorOnLoadHistogram(
      kDynamicCustomizeChromeColors[kTestColorIndex].color,
      kDynamicCustomizeChromeColors[kTestColorIndex].variant);
  EXPECT_EQ(1, histogram_tester_.GetBucketCount(
                   "ChromeColors.DynamicColorOnLoad",
                   kDynamicCustomizeChromeColors[kTestColorIndex].id));

  chrome_colors::RecordDynamicColorOnLoadHistogram(
      SK_ColorWHITE, ui::mojom::BrowserColorVariant::kTonalSpot);
  EXPECT_EQ(
      1, histogram_tester_.GetBucketCount("ChromeColors.DynamicColorOnLoad",
                                          chrome_colors::kOtherDynamicColorId));
}

#!/bin/bash
set -e

APP_NAME="SoundCue"
VERSION=$(node -p "require('./package.json').version")
DMG_NAME="release/${APP_NAME}-${VERSION}-arm64.dmg"
APP_PATH="release/mac-arm64/${APP_NAME}.app"
STAGING="release/dmg-staging"

rm -rf "$STAGING" "$DMG_NAME"
mkdir -p "$STAGING"

cp -R "$APP_PATH" "$STAGING/"
ln -s /Applications "$STAGING/Applications"

hdiutil create -volname "$APP_NAME" -srcfolder "$STAGING" -ov -format UDZO "$DMG_NAME"

rm -rf "$STAGING"

echo "DMG created: $DMG_NAME"

#!/bin/bash
set -e

APP="$1"
ENTITLEMENTS="entitlements.mac.plist"

if [ ! -d "$APP" ]; then
  echo "Error: $APP not found"
  exit 1
fi

echo "Signing frameworks..."
find "$APP/Contents/Frameworks" -name "*.framework" | while read fw; do
  codesign --force --sign - --entitlements "$ENTITLEMENTS" "$fw"
done

echo "Signing helpers..."
find "$APP/Contents/Frameworks" -name "*.app" -maxdepth 1 | while read helper; do
  codesign --force --sign - --entitlements "$ENTITLEMENTS" "$helper"
done

echo "Signing main app..."
codesign --force --sign - --entitlements "$ENTITLEMENTS" "$APP"

codesign --verify --deep --strict "$APP"
echo "Signing complete and verified."
